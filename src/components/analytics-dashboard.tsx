"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { StudySession } from "@/lib/firebase"

export function AnalyticsDashboard() {
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const fetchSessions = async () => {
      try {
        const sessionsRef = collection(db, "studySessions")
        const q = query(sessionsRef, where("userId", "==", user.uid))
        const querySnapshot = await getDocs(q)
        const sessionsData = querySnapshot.docs.map(doc => doc.data() as StudySession)
        setSessions(sessionsData)
      } catch (error) {
        console.error("Error fetching sessions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [user])

  if (loading) {
    return <div>Loading analytics...</div>
  }

  // Calculate analytics
  const totalStudyTime = sessions.reduce((acc, session) => acc + session.duration, 0)
  const completedSessions = sessions.filter(session => session.completed).length
  const completionRate = sessions.length > 0 ? (completedSessions / sessions.length) * 100 : 0
  
  const subjects = sessions.reduce((acc: { [key: string]: number }, session) => {
    acc[session.subject] = (acc[session.subject] || 0) + session.duration
    return acc
  }, {})

  const achievements = sessions.reduce((acc: string[], session) => {
    return [...acc, ...session.achievements]
  }, [])

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Total Study Time</h3>
          <p className="text-3xl font-bold text-primary">
            {Math.floor(totalStudyTime / 60)} hours
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Completion Rate</h3>
          <p className="text-3xl font-bold text-primary">
            {completionRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Completed Sessions</h3>
          <p className="text-3xl font-bold text-primary">{completedSessions}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Time by Subject</h3>
        <div className="space-y-2">
          {Object.entries(subjects).map(([subject, duration]) => (
            <div key={subject} className="flex items-center justify-between">
              <span className="text-gray-700">{subject}</span>
              <span className="text-primary font-medium">
                {Math.floor(duration / 60)} hours
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((achievement, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 p-3 bg-primary/10 rounded-lg"
            >
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-gray-700">{achievement}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 