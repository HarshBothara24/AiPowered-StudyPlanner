"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, doc, getDoc, Timestamp } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { startOfWeek, endOfWeek, format, eachDayOfInterval, parse } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from "recharts"

interface StudySession {
  id: string
  subject: string
  duration: number
  completed: boolean
  startTime: { seconds: number }
  endTime: { seconds: number }
}

interface ScheduleSession {
  subject: string
  topic: string
  startTime: string
  endTime: string
  duration: number
  notes: string
  completed?: boolean
}

interface ScheduleDay {
  date: string
  sessions: ScheduleSession[]
}

interface Schedule {
  id: string
  schedule: ScheduleDay[]
  updatedAt: string
}

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [scheduleData, setScheduleData] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // Listen to study sessions
    const sessionsQuery = query(
      collection(db, "studySessions"),
      where("userId", "==", user.uid)
    )

    // Listen to schedule updates
    const scheduleRef = doc(db, "schedules", user.uid)

    const unsubscribeSessions = onSnapshot(sessionsQuery, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StudySession[]
      setSessions(sessionsData)
    })

    const unsubscribeSchedule = onSnapshot(scheduleRef, (doc) => {
      if (doc.exists()) {
        setScheduleData(doc.data() as Schedule)
      }
      setLoading(false)
    })

    return () => {
      unsubscribeSessions()
      unsubscribeSchedule()
    }
  }, [user])

  // Calculate weekly data
  const now = new Date()
  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(now)
  
  // Combine data from both sources for weekly calculations
  const weeklyStudyHours = [...sessions, ...(scheduleData?.schedule?.flatMap(day => 
    day.sessions.filter(session => session.completed).map(session => ({
      startTime: { seconds: new Date(`${day.date}T${session.startTime}`).getTime() / 1000 },
      duration: session.duration
    }))
  ) || [])]
    .filter(session => {
      const sessionDate = new Date(session.startTime.seconds * 1000)
      return sessionDate >= weekStart && sessionDate <= weekEnd
    })
    .reduce((total, session) => total + session.duration, 0) / 60

  // Calculate weekly progress (assuming 20 hours per week goal)
  const weeklyGoal = 20 // 20 hours per week
  const weeklyProgress = Math.min((weeklyStudyHours / weeklyGoal) * 100, 100)

  // Calculate most productive time combining both data sources
  const timeSlots = [...sessions, ...(scheduleData?.schedule?.flatMap(day => 
    day.sessions.filter(session => session.completed).map(session => ({
      startTime: { seconds: new Date(`${day.date}T${session.startTime}`).getTime() / 1000 },
      duration: session.duration
    }))
  ) || [])]
    .reduce((acc, session) => {
      const startHour = new Date(session.startTime.seconds * 1000).getHours()
      acc[startHour] = (acc[startHour] || 0) + session.duration
      return acc
    }, {} as Record<number, number>)

  // Safe way to get most productive hour
  const hasTimeData = Object.keys(timeSlots).length > 0
  
  // Safe approach to get the most productive hour
  let mostProductiveHour = 9; // Default to 9 AM
  let mostProductiveValue = 0;

  if (hasTimeData) {
    // Manually find the hour with the highest value
    Object.entries(timeSlots).forEach(([hourStr, value]) => {
      const hourNum = parseInt(hourStr);
      if (!isNaN(hourNum) && value > mostProductiveValue) {
        mostProductiveHour = hourNum;
        mostProductiveValue = value;
      }
    });
  }

  // Safe format hour function
  const formatHour = (hour: number) => {
    try {
      // Ensure the hour is valid (0-23)
      const validHour = Math.max(0, Math.min(23, hour));
      
      // Create time labels without using date-fns if needed
      const period = validHour >= 12 ? 'PM' : 'AM';
      const displayHour = validHour % 12 || 12; // Convert to 12-hour format
      
      return `${displayHour}:00 ${period}`;
    } catch (error) {
      console.error("Error formatting hour:", error);
      return "12:00 PM"; // Default fallback
    }
  }

  // Enhanced subject data preparation combining both sources
  const subjectData = Object.entries([...sessions, ...(scheduleData?.schedule?.flatMap(day => 
    day.sessions.filter(session => session.completed).map(session => ({
      subject: session.subject,
      duration: session.duration
    }))
  ) || [])]
    .reduce((acc, session) => {
      const subject = session.subject || "Unnamed Subject"
      acc[subject] = (acc[subject] || 0) + session.duration
      return acc
    }, {} as Record<string, number>))
    .map(([subject, duration]) => ({
      subject,
      hours: Math.round(duration / 60 * 10) / 10
    }))

  // Use empty array instead of hardcoded sample data
  const displayData = subjectData.length > 0 ? subjectData : []

  // Prepare weekly data combining both sources
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const weeklyData = weekDays.map(day => {
    const formattedDate = format(day, 'yyyy-MM-dd')
    
    // Get study hours from regular sessions
    const regularSessionHours = sessions
      .filter(session => {
        const sessionDate = new Date(session.startTime.seconds * 1000)
        return sessionDate.toDateString() === day.toDateString()
      })
      .reduce((total, session) => total + session.duration, 0)

    // Get study hours from completed schedule sessions
    const scheduleSessionHours = scheduleData?.schedule
      ?.find(scheduleDay => scheduleDay.date === formattedDate)
      ?.sessions
      .filter(session => session.completed)
      .reduce((total, session) => total + session.duration, 0) || 0

    // Combine both sources
    const totalHours = (regularSessionHours + scheduleSessionHours) / 60

    return {
      day: format(day, 'EEE'),
      hours: Math.round(totalHours * 10) / 10
    }
  })

  // Prepare time distribution data safely
  const timeDistributionData = Object.entries(timeSlots)
    .map(([hour, duration]) => {
      // Make sure hour is a valid number between 0-23
      const hourNum = parseInt(hour)
      if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
        return null
      }

      // Format time safely without relying on date-fns
      const period = hourNum >= 12 ? 'PM' : 'AM';
      const displayHour = hourNum % 12 || 12; // Convert to 12-hour format
      
      return {
        time: `${displayHour}:00 ${period}`,
        hours: Math.round(duration / 60 * 10) / 10,
        hourRaw: hourNum
      }
    })
    .filter(Boolean) // Remove any null entries
    .sort((a, b) => (a?.hourRaw ?? 0) - (b?.hourRaw ?? 0)) // Sort by hour

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Analytics</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Weekly Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold mb-2">{Math.round(weeklyProgress)}%</div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                  <div 
                    className="h-2 bg-primary rounded-full transition-all" 
                    style={{ width: `${weeklyProgress}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Study Hours This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {weeklyStudyHours.toFixed(1)} hours
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Most Productive Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {hasTimeData ? formatHour(mostProductiveHour) : "Not enough data"}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {!hasTimeData && "Complete study sessions to see your most productive time"}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="subjects" className="space-y-6">
            <TabsList>
              <TabsTrigger value="subjects">Subjects</TabsTrigger>
              <TabsTrigger value="study-patterns">Study Patterns</TabsTrigger>
            </TabsList>

            <TabsContent value="subjects" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subject Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="text-gray-500">Loading data...</div>
                    </div>
                  ) : displayData.length > 0 ? (
                    <>
                      <div className="h-[300px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={displayData}
                            margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                          >
                            <CartesianGrid 
                              strokeDasharray="3 3" 
                              stroke="rgba(0,0,0,0.1)"
                              vertical={false}
                            />
                            <XAxis 
                              dataKey="subject" 
                              stroke="#6b7280"
                              tick={{ fill: '#6b7280' }}
                              axisLine={{ stroke: '#d1d5db' }}
                            />
                            <YAxis 
                              stroke="#6b7280"
                              tick={{ fill: '#6b7280' }}
                              axisLine={{ stroke: '#d1d5db' }}
                              label={{ 
                                value: 'Hours', 
                                angle: -90, 
                                position: 'insideLeft',
                                fill: '#6b7280'
                              }}
                            />
                            <Tooltip 
                              cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                              contentStyle={{ 
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                color: '#1f2937',
                                borderRadius: '6px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                            />
                            <Bar 
                              dataKey="hours" 
                              fill="#3b82f6"
                              radius={[4, 4, 0, 0]}
                              maxBarSize={60}
                            >
                              {displayData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`}
                                  fill={entry.hours === 0 ? '#93c5fd' : '#3b82f6'}
                                  fillOpacity={entry.hours === 0 ? 0.3 : 0.8}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 mt-6 px-2">
                        {displayData.map(({ subject, hours }) => (
                          <div key={subject} className="flex items-center justify-between text-gray-900 dark:text-gray-200">
                            <span className="font-medium">{subject}</span>
                            <span>{hours} hours</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-[300px] flex flex-col items-center justify-center text-center">
                      <div className="text-gray-600 mb-2">No study sessions recorded yet</div>
                      <div className="text-sm text-gray-500">Complete study sessions to see your progress</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="study-patterns" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Study Pattern</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={weeklyData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                        <XAxis 
                          dataKey="day" 
                          stroke="#6b7280" 
                          tick={{ fill: '#6b7280' }}
                        />
                        <YAxis 
                          label={{ 
                            value: 'Hours', 
                            angle: -90, 
                            position: 'insideLeft',
                            fill: '#6b7280'
                          }} 
                          stroke="#6b7280"
                          tick={{ fill: '#6b7280' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            color: '#1f2937',
                            borderRadius: '6px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="hours" 
                          stroke="#3b82f6" 
                          strokeWidth={2} 
                          dot={{ fill: '#3b82f6' }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Study Time Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {timeDistributionData.length > 0 ? (
                    <>
                      <div className="h-[300px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={timeDistributionData}
                            margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                          >
                            <CartesianGrid 
                              strokeDasharray="3 3" 
                              stroke="rgba(0,0,0,0.1)" 
                            />
                            <XAxis 
                              dataKey="time" 
                              stroke="#6b7280"
                              tick={{ fill: '#6b7280' }}
                            />
                            <YAxis 
                              label={{ 
                                value: 'Hours', 
                                angle: -90, 
                                position: 'insideLeft',
                                fill: '#6b7280' 
                              }} 
                              stroke="#6b7280"
                              tick={{ fill: '#6b7280' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                color: '#1f2937',
                                borderRadius: '6px'
                              }}
                            />
                            <Bar 
                              dataKey="hours" 
                              fill="#10b981" 
                              radius={[4, 4, 0, 0]}
                              maxBarSize={60}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 mt-6 px-2">
                        {timeDistributionData.map((item) => 
                          item && (
                            <div key={item.time} className="flex items-center justify-between text-gray-900 dark:text-gray-200">
                              <span className="font-medium">{item.time}</span>
                              <span>{item.hours} hours</span>
                            </div>
                          )
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="h-[300px] flex flex-col items-center justify-center text-center">
                      <div className="text-gray-600 mb-2">No study time data available</div>
                      <div className="text-sm text-gray-500">Complete study sessions to see your time distribution</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}