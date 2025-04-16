"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { startOfWeek, endOfWeek, format } from "date-fns"

interface StudySession {
  id: string
  subject: string
  duration: number
  completed: boolean
  startTime: { seconds: number }
  endTime: { seconds: number }
}

export function AnalyticsDashboard() {
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, "studySessions"),
      where("userId", "==", user.uid)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StudySession[]
      setSessions(sessionsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  // Calculate weekly data
  const now = new Date()
  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(now)
  
  const weeklyStudyHours = sessions
    .filter(session => {
      const sessionDate = new Date(session.startTime.seconds * 1000)
      return sessionDate >= weekStart && sessionDate <= weekEnd
    })
    .reduce((total, session) => total + session.duration, 0) / 60

  // Calculate weekly progress (assuming 20 hours per week goal)
  const weeklyGoal = 20 // 20 hours per week
  const weeklyProgress = Math.min((weeklyStudyHours / weeklyGoal) * 100, 100)

  // Calculate most productive time
  const timeSlots = sessions.reduce((acc, session) => {
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

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Weekly Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2">{Math.round(weeklyProgress)}%</div>
            <div className="h-2 bg-secondary rounded-full">
              <div 
                className="h-2 bg-primary rounded-full transition-all" 
                style={{ width: `${weeklyProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Study Hours This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {weeklyStudyHours.toFixed(1)} hours
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Most Productive Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {Object.keys(timeSlots).length > 0 
                ? formatHour(mostProductiveHour)
                : "No data available"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subjects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="study-patterns">Study Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subject Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(sessions.reduce((acc, session) => {
                const subject = session.subject
                acc[subject] = (acc[subject] || 0) + session.duration
                return acc
              }, {} as Record<string, number>)).map(([subject, duration]) => (
                <div key={subject} className="flex items-center justify-between">
                  <span className="font-medium">{subject}</span>
                  <span>{Math.round(duration / 60 * 10) / 10} hours</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="study-patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Study Time Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(timeSlots)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([hour, duration]) => (
                    <div key={hour} className="flex items-center justify-between">
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
  )
} 