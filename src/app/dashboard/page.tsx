"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, Timestamp, doc, getDoc, updateDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, Users, BookOpen, Video, Edit, CheckCircle, Bell, X } from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// StudySchedule Component
interface Schedule {
  schedule: {
    date: string;
    sessions: {
      subject: string;
      topic: string;
      startTime: string;
      endTime: string;
      duration: number;
      notes?: string;
      completed?: boolean;
    }[];
  }[];
}

function StudySchedule({ schedule, onScheduleUpdate }: { schedule: Schedule; onScheduleUpdate: (updatedSchedule: Schedule) => void }) {
  const [editingSession, setEditingSession] = useState<{ dayIndex: number; sessionIndex: number } | null>(null);
  const [sessionFormData, setSessionFormData] = useState({
    subject: "",
    topic: "",
    startTime: "",
    endTime: "",
    duration: 0,
    notes: ""
  });

  const handleMarkComplete = (dayIndex: number, sessionIndex: number) => {
    const currentDate = new Date().toISOString().split('T')[0]
    const sessionDate = schedule.schedule[dayIndex].date
    
    // Only allow marking as complete on the same day
    if (sessionDate !== currentDate) {
      toast({
        title: "Cannot mark as completed",
        description: "Sessions can only be marked as completed on the actual day they are scheduled.",
        variant: "destructive",
      })
      return
    }
    
    // Create a deep copy of the schedule
    const updatedSchedule = JSON.parse(JSON.stringify(schedule))
    
    // Toggle completion status
    const session = updatedSchedule.schedule[dayIndex].sessions[sessionIndex]
    session.completed = !session.completed
    
    // Update schedule
    onScheduleUpdate(updatedSchedule)
    
    toast({
      title: session.completed ? "Session marked as completed" : "Session marked as incomplete",
      description: `${session.subject}: ${session.topic}`,
    })
  }
  
  const handleEditSession = (dayIndex: number, sessionIndex: number) => {
    const session = schedule.schedule[dayIndex].sessions[sessionIndex];
    setSessionFormData({
      subject: session.subject,
      topic: session.topic,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      notes: session.notes || ""
    });
    setEditingSession({ dayIndex, sessionIndex });
  }

  const closeEditDialog = () => {
    setEditingSession(null);
  }

  const handleSessionFormChange = (e: { target: { name: any; value: any } }) => {
    const { name, value } = e.target;
    
    // If changing start or end time, calculate new duration
    if (name === "startTime" || name === "endTime") {
      const startTime = name === "startTime" ? value : sessionFormData.startTime;
      const endTime = name === "endTime" ? value : sessionFormData.endTime;
      
      if (startTime && endTime) {
        // Convert times to minutes since midnight
        const startMinutes = convertTimeToMinutes(startTime);
        const endMinutes = convertTimeToMinutes(endTime);
        
        // Calculate duration in minutes
        const durationMinutes = endMinutes - startMinutes;
        
        // Update form data with new values
        setSessionFormData({
          ...sessionFormData,
          [name]: value,
          duration: durationMinutes > 0 ? durationMinutes : 0
        });
        return;
      }
    }
    
    setSessionFormData({
      ...sessionFormData,
      [name]: value
    });
  }

  const convertTimeToMinutes = (timeString: { split: (arg0: string) => { (): any; new(): any; map: { (arg0: NumberConstructor): [any, any]; new(): any } } }) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  const handleSaveSession = () => {
    if (!editingSession) return;
    
    const { dayIndex, sessionIndex } = editingSession;
    
    // Create a deep copy of the schedule
    const updatedSchedule = JSON.parse(JSON.stringify(schedule));
    
    // Update the session data
    updatedSchedule.schedule[dayIndex].sessions[sessionIndex] = {
      ...updatedSchedule.schedule[dayIndex].sessions[sessionIndex],
      subject: sessionFormData.subject,
      topic: sessionFormData.topic,
      startTime: sessionFormData.startTime,
      endTime: sessionFormData.endTime,
      duration: sessionFormData.duration,
      notes: sessionFormData.notes
    };
    
    // Update schedule
    onScheduleUpdate(updatedSchedule);
    
    // Close dialog
    closeEditDialog();
    
    toast({
      title: "Session updated",
      description: `${sessionFormData.subject}: ${sessionFormData.topic}`,
    });
  }
  
  const isToday = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0]
    return dateString === today
  }

  return (
    <>
      <div className="space-y-6">
        {schedule.schedule.map((day, dayIndex) => (
          <div key={dayIndex} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-primary" />
                <h3 className="text-lg font-medium">
                  {new Date(day.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
              </div>
              {isToday(day.date) && (
                <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 text-xs font-medium px-2.5 py-0.5 rounded">
                  Today
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              {day.sessions.map((session, sessionIndex) => (
                <div 
                  key={sessionIndex} 
                  className={`border-l-4 ${session.completed ? 'border-green-500' : 'border-primary'} pl-4 py-3 bg-white dark:bg-gray-700 rounded-md`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{session.subject}: {session.topic}</h4>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Clock className="w-4 h-4 mr-1" />
                        {session.startTime} - {session.endTime} (Duration: {session.duration} minutes)
                      </div>
                      {session.notes && (
                        <p className="text-sm mt-2">{session.notes}</p>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditSession(dayIndex, sessionIndex)}
                        title="Edit session"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="icon"
                        variant={session.completed ? "default" : "ghost"}
                        onClick={() => handleMarkComplete(dayIndex, sessionIndex)}
                        title={isToday(day.date) ? 
                          (session.completed ? "Mark as incomplete" : "Mark as completed") : 
                          "Can only mark completion on the scheduled day"
                        }
                        className={!isToday(day.date) ? "opacity-50 cursor-not-allowed" : ""}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Session Dialog */}
      <Dialog open={editingSession !== null} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Study Session</DialogTitle>
            <DialogDescription>
              Make changes to your study session details here.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">
                Subject
              </Label>
              <Input
                id="subject"
                name="subject"
                value={sessionFormData.subject}
                onChange={handleSessionFormChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="topic" className="text-right">
                Topic
              </Label>
              <Input
                id="topic"
                name="topic"
                value={sessionFormData.topic}
                onChange={handleSessionFormChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startTime" className="text-right">
                Start Time
              </Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                value={sessionFormData.startTime}
                onChange={handleSessionFormChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endTime" className="text-right">
                End Time
              </Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                value={sessionFormData.endTime}
                onChange={handleSessionFormChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">
                Duration (mins)
              </Label>
              <Input
                id="duration"
                name="duration"
                type="number"
                value={sessionFormData.duration}
                onChange={handleSessionFormChange}
                className="col-span-3"
                disabled
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={sessionFormData.notes}
                onChange={handleSessionFormChange}
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveSession}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeReminders, setActiveReminders] = useState<string[]>([])

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

  // Set up session reminders
  useEffect(() => {
    if (!schedule) return;
    
    // Clear any existing reminder timeouts
    activeReminders.forEach(id => window.clearTimeout(parseInt(id)));
    
    const today = new Date().toISOString().split('T')[0];
    const todaySchedule = schedule.schedule.find(day => day.date === today);
    
    if (!todaySchedule) {
      setActiveReminders([]);
      return;
    }
    
    // Set reminders for today's sessions
    const newReminders = todaySchedule.sessions.map(session => {
      const sessionStartTime = new Date(`${today}T${session.startTime}`);
      const now = new Date();
      const reminderTime = new Date(sessionStartTime.getTime() - 15 * 60 * 1000); // 15 minutes before
      
      // Only set reminder if the session is in the future and reminder time hasn't passed
      if (sessionStartTime > now && reminderTime > now) {
        const timeUntilReminder = reminderTime.getTime() - now.getTime();
        
        // Set the reminder
        const timerId = window.setTimeout(() => {
          toast({
            title: "Study Session Reminder",
            description: `Your session on ${session.subject}: ${session.topic} starts in 15 minutes!`,
            duration: 10000,
          });
        }, timeUntilReminder);
        
        return timerId.toString();
      }
      return null;
    }).filter(Boolean) as string[];
    
    setActiveReminders(newReminders);
    
    // Cleanup function to clear all timeouts when component unmounts
    return () => {
      newReminders.forEach(id => window.clearTimeout(parseInt(id)));
    };
  }, [schedule]); // Removed activeReminders from the dependency array

  const handleScheduleUpdate = async (updatedSchedule: Schedule) => {
    setSchedule(updatedSchedule);
    
    // Update the schedule in Firestore
    if (user) {
      try {
        const scheduleRef = doc(db, "schedules", user.uid);
        await updateDoc(scheduleRef, updatedSchedule);
      } catch (error) {
        console.error("Error updating schedule:", error);
        toast({
          title: "Error",
          description: "Failed to update schedule",
          variant: "destructive",
        });
      }
    }
  };

  const handleMarkComplete = async (dayIndex: number, sessionIndex: number) => {
    if (!schedule || !user) return;
    
    const today = new Date().toISOString().split('T')[0];
    const dayToUpdate = schedule.schedule[dayIndex];
    
    // Only allow marking sessions complete on the same day
    if (dayToUpdate.date !== today) {
      toast({
        title: "Cannot mark completion",
        description: "You can only mark sessions complete on the current day",
        variant: "destructive",
      });
      return;
    }
    
    // Create a deep copy of the schedule
    const updatedSchedule = JSON.parse(JSON.stringify(schedule)) as Schedule;
    
    // Toggle completion status
    const currentStatus = updatedSchedule.schedule[dayIndex].sessions[sessionIndex].completed;
    updatedSchedule.schedule[dayIndex].sessions[sessionIndex].completed = !currentStatus;
    
    // Update state and save to database
    handleScheduleUpdate(updatedSchedule);
    
    toast({
      title: currentStatus ? "Session marked incomplete" : "Session marked complete",
      description: `${updatedSchedule.schedule[dayIndex].sessions[sessionIndex].subject}: ${updatedSchedule.schedule[dayIndex].sessions[sessionIndex].topic}`,
    });
  };

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
      group.meetings?.map((meeting: { date: any; time: any }) => {
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
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayDateString = new Date().toISOString().split('T')[0];
  const todaySchedule = groups.flatMap(group =>
    group.schedule
      .filter((session: { day: string }) => session.day.toLowerCase() === today.toLowerCase())
      .map((session: any) => ({
        ...session,
        groupName: group.name
      }))
  ).sort((a, b) => {
    const timeA = a.time.split(':').map(Number)
    const timeB = b.time.split(':').map(Number)
    return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1])
  })

  // Get today's sessions from the personal schedule
  const todayPersonalSessions = schedule?.schedule
    .find(day => day.date === todayDateString)
    ?.sessions || [];

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
                  <CardDescription>
                    Upcoming study sessions - You can mark sessions complete only on the actual day
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {schedule ? (
                    <div className="space-y-6">
                      <StudySchedule 
                        schedule={schedule} 
                        onScheduleUpdate={handleScheduleUpdate} 
                      />
                      
                      {/* Today's sessions with completion marking */}
                      <div className="mt-6">
                        <h3 className="text-lg font-medium mb-3">Today's Sessions ({todayDateString})</h3>
                        {todayPersonalSessions.length > 0 ? (
                          <div className="space-y-3">
                            {todayPersonalSessions.map((session, sessionIndex) => {
                              const scheduleIndex = schedule.schedule.findIndex(day => day.date === todayDateString);
                              
                              return (
                                <div key={sessionIndex} className="border rounded-md p-3 flex justify-between items-center">
                                  <div>
                                    <div className="font-medium">{session.subject}: {session.topic}</div>
                                    <div className="text-sm text-gray-500">
                                      {session.startTime} - {session.endTime} ({session.duration} mins)
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    <Button
                                      size="sm"
                                      variant={session.completed ? "default" : "outline"}
                                      onClick={() => handleMarkComplete(scheduleIndex, sessionIndex)}
                                      className="flex items-center gap-2"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      {session.completed ? "Completed" : "Mark Complete"}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            No study sessions scheduled for today
                          </div>
                        )}
                      </div>
                    </div>
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
                      {upcomingMeetings.slice(0, 5).map((meeting) => {
                        const meetingDateTime = new Date(`${meeting.date}T${meeting.time}`);
                        const reminderTime = new Date(meetingDateTime.getTime() - 15 * 60 * 1000);
                        const now = new Date();
                        
                        return (
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
                            <div className="flex items-center justify-between mt-2">
                              {meeting.meetLink && (
                                <a
                                  href={meeting.meetLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-sm text-primary hover:text-primary/80"
                                >
                                  <Video className="w-4 h-4 mr-1" />
                                  Join Meeting
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
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