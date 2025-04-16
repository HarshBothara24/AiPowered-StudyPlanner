"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, onSnapshot, Timestamp, updateDoc, arrayUnion } from "firebase/firestore"
import { StudyGroupChat } from "@/components/study-group-chat"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, Video } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface StudyGroup {
  id: string
  name: string
  description: string
  members: string[]
  admin: string
  subjects: string[]
  schedule: {
    day: string
    time: string
    duration: number
  }[]
  chat: {
    userId: string
    message: string
    timestamp: Timestamp
    type: "text" | "resource" | "achievement"
    attachments?: {
      type: string
      url: string
      name: string
    }[]
  }[]
  resources: {
    id: string
    name: string
    type: string
    url: string
    uploadedBy: string
    uploadedAt: Timestamp
    description: string
  }[]
  settings: {
    visibility: "public" | "private"
    joinRequests: boolean
    maxMembers: number
    studyFocus: string[]
    difficultyLevel: "beginner" | "intermediate" | "advanced"
  }
  stats: {
    totalStudyTime: number
    activeMembers: number
    resourcesCount: number
    lastActivity: Timestamp
  }
  meetings: Meeting[]
}

interface Meeting {
  id: string
  title: string
  date: string
  time: string
  duration: number
  meetLink: string
  calendarEventId?: string
  createdBy: string
  createdAt: Timestamp
}

function GroupDetailsPage() {
  const { groupId } = useParams()
  const [group, setGroup] = useState<StudyGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { user } = useAuth()
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [newSchedule, setNewSchedule] = useState({ day: "", time: "", duration: 1 })
  const [newResource, setNewResource] = useState({ name: "", url: "", description: "" })
  const [newMeeting, setNewMeeting] = useState({ title: "", date: "", time: "", duration: 1 })
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false)

  useEffect(() => {
    if (!groupId) return

    const groupRef = doc(db, "studyGroups", groupId as string)
    const unsubscribe = onSnapshot(groupRef, (doc) => {
      if (doc.exists()) {
        setGroup({ id: doc.id, ...doc.data() } as StudyGroup)
      } else {
        setError("Group not found")
      }
      setLoading(false)
    }, (error) => {
      console.error("Error fetching group:", error)
      setError("Failed to load group")
      setLoading(false)
    })

    return () => unsubscribe()
  }, [groupId])

  const handleAddSchedule = async () => {
    if (!group || !user) return
    try {
      const groupRef = doc(db, "studyGroups", groupId as string)
      await updateDoc(groupRef, {
        schedule: arrayUnion({
          ...newSchedule,
          createdAt: Timestamp.now(),
          createdBy: user.uid
        })
      })
      setNewSchedule({ day: "", time: "", duration: 1 })
    } catch (error) {
      console.error("Error adding schedule:", error)
    }
  }

  const handleAddResource = async () => {
    if (!group || !user) return
    try {
      const groupRef = doc(db, "studyGroups", groupId as string)
      await updateDoc(groupRef, {
        resources: arrayUnion({
          ...newResource,
          id: Math.random().toString(36).substr(2, 9),
          type: "link",
          uploadedBy: user.uid,
          uploadedAt: Timestamp.now()
        })
      })
      setNewResource({ name: "", url: "", description: "" })
    } catch (error) {
      console.error("Error adding resource:", error)
    }
  }

  const handleCreateMeeting = async () => {
    if (!group || !user) return
    setIsCreatingMeeting(true)
    try {
      // Convert date and time to ISO string
      const startDateTime = new Date(`${newMeeting.date}T${newMeeting.time}`)
      const endDateTime = new Date(startDateTime)
      endDateTime.setHours(startDateTime.getHours() + newMeeting.duration)

      console.log('Creating meeting with data:', {
        groupId,
        title: newMeeting.title,
        description: `Study group meeting for ${group.name}`,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        attendees: group.members
      })

      // Create Google Calendar event with Meet link
      const response = await fetch("/api/meetings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId,
          title: newMeeting.title,
          description: `Study group meeting for ${group.name}`,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          attendees: group.members
        }),
      })

      const responseData = await response.json()
      console.log('Meeting creation response:', responseData)

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to create meeting")
      }

      const { meetLink, eventId } = responseData

      // Format meeting data for Firestore
      const meetingData = {
        id: Math.random().toString(36).substr(2, 9),
        title: newMeeting.title,
        date: newMeeting.date,
        time: newMeeting.time,
        duration: newMeeting.duration,
        meetLink: meetLink || '',
        calendarEventId: eventId || '',
        createdBy: user.uid,
        createdAt: Timestamp.now()
      }

      // Add meeting to Firestore
      const groupRef = doc(db, "studyGroups", groupId as string)
      await updateDoc(groupRef, {
        meetings: arrayUnion(meetingData)
      })

      setNewMeeting({ title: "", date: "", time: "", duration: 1 })
      setIsCreatingMeeting(false)
    } catch (error) {
      console.error("Error creating meeting:", error)
      setError(error instanceof Error ? error.message : "Failed to create meeting")
      setIsCreatingMeeting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-gray-900 dark:text-white">Loading...</div>
    </div>
  }

  if (error || !group) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-red-600 dark:text-red-400">{error || "Group not found"}</div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Group Header */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">{group.description}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {group.stats.activeMembers} members
                </div>
                {group.admin === user?.uid && (
                  <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Manage Group</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Manage Group</DialogTitle>
                      </DialogHeader>
                      <Tabs defaultValue="schedule" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="schedule">Schedule</TabsTrigger>
                          <TabsTrigger value="resources">Resources</TabsTrigger>
                          <TabsTrigger value="meetings">Meetings</TabsTrigger>
                        </TabsList>
                        <TabsContent value="schedule" className="space-y-4">
                          <h3 className="text-lg font-medium">Add Study Schedule</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="day">Day</Label>
                              <Input
                                id="day"
                                value={newSchedule.day}
                                onChange={(e) => setNewSchedule({ ...newSchedule, day: e.target.value })}
                                placeholder="e.g. Monday"
                              />
                            </div>
                            <div>
                              <Label htmlFor="time">Time</Label>
                              <Input
                                id="time"
                                value={newSchedule.time}
                                onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                                placeholder="e.g. 14:00"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="duration">Duration (hours)</Label>
                            <Input
                              id="duration"
                              type="number"
                              value={newSchedule.duration}
                              onChange={(e) => setNewSchedule({ ...newSchedule, duration: Number(e.target.value) })}
                              min={1}
                            />
                          </div>
                          <Button onClick={handleAddSchedule}>Add Schedule</Button>
                        </TabsContent>
                        <TabsContent value="resources" className="space-y-4">
                          <h3 className="text-lg font-medium">Add Resource</h3>
                          <div>
                            <Label htmlFor="resourceName">Name</Label>
                            <Input
                              id="resourceName"
                              value={newResource.name}
                              onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                              placeholder="Resource name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="resourceUrl">URL</Label>
                            <Input
                              id="resourceUrl"
                              value={newResource.url}
                              onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                              placeholder="https://..."
                            />
                          </div>
                          <div>
                            <Label htmlFor="resourceDescription">Description</Label>
                            <Textarea
                              id="resourceDescription"
                              value={newResource.description}
                              onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                              placeholder="Brief description of the resource"
                            />
                          </div>
                          <Button onClick={handleAddResource}>Add Resource</Button>
                        </TabsContent>
                        <TabsContent value="meetings" className="space-y-4">
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Schedule Group Meeting</h3>
                            <div className="grid gap-4">
                              <div>
                                <Label htmlFor="meetingTitle">Meeting Title</Label>
                                <Input
                                  id="meetingTitle"
                                  value={newMeeting.title}
                                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                                  placeholder="e.g. Project Discussion"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="meetingDate">Date</Label>
                                  <Input
                                    id="meetingDate"
                                    type="date"
                                    value={newMeeting.date}
                                    onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="meetingTime">Time</Label>
                                  <Input
                                    id="meetingTime"
                                    type="time"
                                    value={newMeeting.time}
                                    onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="meetingDuration">Duration (hours)</Label>
                                <Input
                                  id="meetingDuration"
                                  type="number"
                                  value={newMeeting.duration}
                                  onChange={(e) => setNewMeeting({ ...newMeeting, duration: Number(e.target.value) })}
                                  min={1}
                                />
                              </div>
                              <Button 
                                onClick={handleCreateMeeting} 
                                disabled={isCreatingMeeting}
                                className="w-full"
                              >
                                <Video className="w-4 h-4 mr-2" />
                                {isCreatingMeeting ? "Creating Meeting..." : "Create Meeting"}
                              </Button>
                            </div>

                            {/* Upcoming Meetings */}
                            {group?.meetings && group.meetings.length > 0 && (
                              <div className="mt-6">
                                <h4 className="text-sm font-medium mb-3">Upcoming Meetings</h4>
                                <div className="space-y-3">
                                  {group.meetings.map((meeting) => (
                                    <div
                                      key={meeting.id}
                                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                    >
                                      <div>
                                        <h5 className="font-medium">{meeting.title}</h5>
                                        <div className="text-sm text-gray-500 flex items-center mt-1">
                                          <Calendar className="w-4 h-4 mr-1" />
                                          {meeting.date} at {meeting.time}
                                          <Clock className="w-4 h-4 ml-2 mr-1" />
                                          {meeting.duration}h
                                        </div>
                                      </div>
                                      <a
                                        href={meeting.meetLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline flex items-center"
                                      >
                                        <Video className="w-4 h-4 mr-1" />
                                        Join
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {group.subjects.map((subject, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full"
                >
                  {subject}
                </span>
              ))}
            </div>
          </div>

          {/* Group Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Section */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Group Chat</h2>
                <StudyGroupChat groupId={groupId as string} />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Schedule */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Study Schedule</h2>
                {group.schedule.length > 0 ? (
                  <div className="space-y-4">
                    {group.schedule.map((session, index) => (
                      <div key={index} className="border-l-4 border-primary pl-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{session.day}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {session.time} ({session.duration} hours)
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-300">No schedule set yet</p>
                )}
              </div>

              {/* Resources */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Resources</h2>
                {group.resources.length > 0 ? (
                  <div className="space-y-4">
                    {group.resources.map((resource) => (
                      <div key={resource.id} className="border-l-4 border-primary pl-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{resource.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{resource.description}</div>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View Resource
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-300">No resources added yet</p>
                )}
              </div>

              {/* Meetings Section */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Upcoming Meetings</h2>
                {group?.meetings && group.meetings.length > 0 ? (
                  <div className="space-y-4">
                    {group.meetings.map((meeting) => (
                      <div key={meeting.id} className="border-l-4 border-primary pl-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{meeting.title}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {meeting.date} at {meeting.time} ({meeting.duration}h)
                        </div>
                        <a
                          href={meeting.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center mt-1"
                        >
                          <Video className="w-4 h-4 mr-1" />
                          Join Meeting
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-300">No upcoming meetings</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupDetailsPage 