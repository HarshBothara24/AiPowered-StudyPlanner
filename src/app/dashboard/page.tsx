"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, Users, BookOpen, Video } from "lucide-react"
import Link from "next/link"
import { StudySchedule } from "@/components/study-schedule"

interface StudyGroup {
  id: string
  name: string
  description: string
  subjects: string[]
  schedule: {
    day: string
    time: string
    duration: number
    description: string
  }[]
  meetings: {
    id: string
    title: string
    date: string
    time: string
    duration: number
    meetLink: string
  }[]
  stats: {
    activeMembers: number
  }
}

interface Meeting {
  id: string
  title: string
  date: string
  time: string
  duration: number
  meetLink: string
  groupName: string
}

interface Schedule {
  id: string
  schedule: {
    date: string
    sessions: {
      subject: string
      topic: string
      startTime: string
      endTime: string
      duration: number
      notes: string
    }[]
  }[]
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    // Fetch user's schedule
    const fetchSchedule = async () => {
      try {
        const scheduleRef = doc(db, "schedules", user.uid)
        const scheduleSnap = await getDoc(scheduleRef)
        if (scheduleSnap.exists()) {
          setSchedule({ id: scheduleSnap.id, ...scheduleSnap.data() } as Schedule)
        }
      } catch (error) {
        console.error("Error fetching schedule:", error)
      }
    }

    // Fetch user's groups
    const fetchGroups = async () => {
      try {
        const groupsQuery = query(
          collection(db, "studyGroups"),
          where("members", "array-contains", user.uid)
        )
        const querySnapshot = await getDocs(groupsQuery)
        const groupsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as StudyGroup[]
        setGroups(groupsData)
      } catch (error) {
        console.error("Error fetching groups:", error)
        setError("Failed to load study groups")
      } finally {
        setLoading(false)
      }
    }

    fetchSchedule()
    fetchGroups()
  }, [user, router])

  const handleScheduleUpdate = (updatedSchedule: Schedule) => {
    setSchedule(updatedSchedule)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    )
  }

  // Get all upcoming meetings across all groups
  const upcomingMeetings = groups
    .flatMap(group => 
      group.meetings?.map(meeting => {
        const meetingDateTime = new Date(`${meeting.date}T${meeting.time}`)
        return {
          ...meeting,
          groupName: group.name,
          isUpcoming: meetingDateTime > new Date()
        }
      }) || []
    )
    .filter(meeting => meeting.isUpcoming)
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`)
      const dateB = new Date(`${b.date}T${b.time}`)
      return dateA.getTime() - dateB.getTime()
    })

  // Get today's study schedule
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todaySchedule = groups.flatMap(group =>
    group.schedule
      .filter(session => session.day.toLowerCase() === today.toLowerCase())
      .map(session => ({
        ...session,
        groupName: group.name
      }))
  ).sort((a, b) => {
    const timeA = a.time.split(':').map(Number)
    const timeB = b.time.split(':').map(Number)
    return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1])
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <div className="flex gap-4">
              <Link href="/schedule">
                <Button variant="outline">Manage Schedule</Button>
              </Link>
              <Link href="/groups/create">
                <Button>Create New Group</Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Study Schedule */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Your Study Schedule</CardTitle>
                  <CardDescription>Upcoming study sessions</CardDescription>
                </CardHeader>
                <CardContent>
                  {schedule ? (
                    <StudySchedule 
                      schedule={schedule} 
                      onScheduleUpdate={handleScheduleUpdate} 
                    />
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        No study schedule created yet
                      </p>
                      <Link href="/schedule">
                        <Button>Create Schedule</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Upcoming Meetings */}
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Meetings</CardTitle>
                  <CardDescription>Your scheduled group meetings</CardDescription>
                </CardHeader>
                <CardContent>
                  {upcomingMeetings.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingMeetings.slice(0, 5).map((meeting) => (
                        <div
                          key={meeting.id}
                          className="border-l-4 border-primary pl-4 py-2"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{meeting.title}</h4>
                              <p className="text-sm text-gray-600">{meeting.groupName}</p>
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(`${meeting.date}T${meeting.time}`).toLocaleDateString()} at{" "}
                              {meeting.time}
                            </div>
                          </div>
                          {meeting.meetLink && (
                            <a
                              href={meeting.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center text-sm text-primary hover:text-primary/80"
                            >
                              <Video className="w-4 h-4 mr-1" />
                              Join Meeting
                            </a>
                          )}
                        </div>
                      ))}
                      {upcomingMeetings.length > 5 && (
                        <Link
                          href="/groups"
                          className="text-sm text-primary hover:text-primary/80 flex items-center justify-center mt-2"
                        >
                          View all meetings
                        </Link>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-300 text-center py-4">
                      No upcoming meetings scheduled
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Study Groups */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Study Groups</CardTitle>
                  <CardDescription>Groups you're currently part of</CardDescription>
                </CardHeader>
                <CardContent>
                  {groups.length > 0 ? (
                    <div className="space-y-4">
                      {groups.map(group => (
                        <Link key={group.id} href={`/groups/${group.id}`}>
                          <div className="border-l-4 border-primary pl-4 hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded cursor-pointer">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {group.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {group.stats.activeMembers} members
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        You haven't joined any study groups yet
                      </p>
                      <Link href="/groups">
                        <Button variant="outline">Browse Groups</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 