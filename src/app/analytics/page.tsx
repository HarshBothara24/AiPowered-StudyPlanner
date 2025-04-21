"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, doc, getDoc, Timestamp } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { startOfWeek, endOfWeek, format, eachDayOfInterval } from "date-fns"
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

  const mostProductiveHour = Object.entries(timeSlots).reduce((a, b) => 
    timeSlots[Number(a[0])] > timeSlots[Number(b[0])] ? a : b
  , ['0', 0])[0]

  const formatHour = (hour: string) => {
    const hourNum = parseInt(hour)
    return format(new Date().setHours(hourNum, 0, 0, 0), 'h:00 a')
  }

  // Enhanced subject data preparation combining both sources
  const subjectData = Object.entries([...sessions, ...(scheduleData?.schedule?.flatMap(day => 
    day.sessions.filter(session => session.completed).map(session => ({
      subject: session.subject,
      duration: session.duration
    }))
  ) || [])]
    .reduce((acc, session) => {
      const subject = session.subject
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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto py-6 space-y-8">
        <h1 className="text-4xl font-bold mb-8 text-white">Analytics</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gray-800/50 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-200">Weekly Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-2 text-white">{Math.round(weeklyProgress)}%</div>
              <div className="h-2 bg-gray-700 rounded-full">
                <div 
                  className="h-2 bg-blue-500 rounded-full transition-all" 
                  style={{ width: `${weeklyProgress}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-200">Study Hours This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">
                {weeklyStudyHours.toFixed(1)} hours
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-200">Most Productive Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">
                {Object.keys(timeSlots).length > 0 
                  ? formatHour(mostProductiveHour)
                  : "No data available"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="subjects" className="space-y-4">
          <TabsList className="bg-gray-800/50 border-0">
            <TabsTrigger value="subjects" className="data-[state=active]:bg-gray-700">Subjects</TabsTrigger>
            <TabsTrigger value="study-patterns" className="data-[state=active]:bg-gray-700">Study Patterns</TabsTrigger>
          </TabsList>

          <TabsContent value="subjects" className="space-y-4">
            <Card className="bg-gray-800/50 border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-gray-200">Subject Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-gray-400">Loading data...</div>
                  </div>
                ) : displayData.length > 0 ? (
                  <>
                    <div className="h-[300px] mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={displayData}>
                          <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke="rgba(255,255,255,0.1)"
                            vertical={false}
                          />
                          <XAxis 
                            dataKey="subject" 
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8' }}
                            axisLine={{ stroke: '#334155' }}
                          />
                          <YAxis 
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8' }}
                            axisLine={{ stroke: '#334155' }}
                            label={{ 
                              value: 'Hours', 
                              angle: -90, 
                              position: 'insideLeft',
                              fill: '#94a3b8'
                            }}
                          />
                          <Tooltip 
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ 
                              backgroundColor: '#1f2937',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: '#fff',
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
                                fill={entry.hours === 0 ? '#1e40af' : '#3b82f6'}
                                fillOpacity={entry.hours === 0 ? 0.3 : 0.8}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-4">
                      {displayData.map(({ subject, hours }) => (
                        <div key={subject} className="flex items-center justify-between text-gray-200">
                          <span className="font-medium">{subject}</span>
                          <span>{hours} hours</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center text-center">
                    <div className="text-gray-400 mb-2">No study sessions recorded yet</div>
                    <div className="text-sm text-gray-500">Complete study sessions to see your progress</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="study-patterns" className="space-y-4">
            <Card className="bg-gray-800/50 border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-gray-200">Weekly Study Pattern</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="day" stroke="#94a3b8" />
                      <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff'
                        }}
                      />
                      <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-gray-200">Study Time Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(timeSlots).map(([hour, duration]) => ({
                      time: formatHour(hour),
                      hours: Math.round(duration / 60 * 10) / 10
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="time" stroke="#94a3b8" />
                      <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff'
                        }}
                      />
                      <Bar dataKey="hours" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {Object.entries(timeSlots)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([hour, duration]) => (
                      <div key={hour} className="flex items-center justify-between text-gray-200">
                        <span className="font-medium">{formatHour(hour)}</span>
                        <span>{Math.round(duration / 60 * 10) / 10} hours</span>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 