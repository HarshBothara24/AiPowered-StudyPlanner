import { format, parseISO, addHours } from "date-fns"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock, CheckCircle2, Calendar, Edit } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { useToast } from "@/components/ui/use-toast"
import { updateUserProgress } from "@/lib/gamification"
import { useAuth } from "@/contexts/auth-context"

interface Session {
  subject: string
  topic: string
  startTime: string
  endTime: string
  duration: number
  notes: string
  completed?: boolean
}

interface DaySchedule {
  date: string
  sessions: Session[]
}

interface Schedule {
  id: string
  schedule: DaySchedule[]
  createdAt: string
  updatedAt: string
}

interface StudyScheduleProps {
  schedule: Schedule
  onScheduleUpdate?: (schedule: Schedule) => void
}

// Helper function to convert time string to ISO format
function toISOTime(dateStr: string, timeStr: string): string {
  // If the time is already in ISO format, return it
  if (timeStr.includes('T')) return timeStr
  
  // Otherwise, combine the date and time
  return `${dateStr}T${timeStr}`
}

export function StudySchedule({ schedule, onScheduleUpdate }: StudyScheduleProps) {
  const [editSession, setEditSession] = useState<{
    dayIndex: number
    sessionIndex: number
    session: Session
  } | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const handleUpdateSession = async () => {
    if (!editSession) return

    try {
      const updatedSchedule = { ...schedule }
      const { startTime } = editSession.session
      const endTime = format(addHours(new Date(`2000-01-01T${startTime}`), 2), 'HH:mm')
      
      updatedSchedule.schedule[editSession.dayIndex].sessions[editSession.sessionIndex] = {
        ...editSession.session,
        endTime,
        duration: 120 // 2 hours in minutes
      }

      // Update in Firestore
      const scheduleRef = doc(db, "schedules", schedule.id)
      await updateDoc(scheduleRef, {
        schedule: updatedSchedule.schedule,
        updatedAt: new Date().toISOString()
      })

      // Update local state through parent component
      onScheduleUpdate?.(updatedSchedule)

      setIsDialogOpen(false)
      setEditSession(null)

      toast({
        title: "Success",
        description: "Study time updated successfully",
      })
    } catch (error) {
      console.error("Error updating session:", error)
      toast({
        title: "Error",
        description: "Failed to update study time",
        variant: "destructive",
      })
    }
  }

  const handleMarkComplete = async (dayIndex: number, sessionIndex: number) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to mark tasks as complete",
        variant: "destructive",
      })
      return
    }

    if (!schedule || !schedule.schedule || !schedule.schedule[dayIndex]?.sessions) {
      toast({
        title: "Error",
        description: "Invalid schedule data",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const updatedSchedule = { ...schedule }
      const session = updatedSchedule.schedule[dayIndex].sessions[sessionIndex]
      
      if (!session) {
        throw new Error("Session not found")
      }

      const isCompleting = !session.completed
      session.completed = isCompleting

      // Generate a unique task ID if it doesn't exist
      const taskId = `${schedule.id}-${dayIndex}-${sessionIndex}`

      // Update in Firestore
      const scheduleRef = doc(db, "schedules", schedule.id)
      await updateDoc(scheduleRef, {
        schedule: updatedSchedule.schedule,
        updatedAt: new Date().toISOString()
      })

      // Update user progress if completing the task
      if (isCompleting) {
        const result = await updateUserProgress(user.uid, taskId)
        
        if (result.points > 0) {
          toast({
            title: "Task Completed!",
            description: `You earned ${result.points} points!`,
          })
        }

        if (result.badges.length > 0) {
          result.badges.forEach(badge => {
            toast({
              title: "New Badge Unlocked!",
              description: `${badge.name}: ${badge.description}`,
            })
          })
        }
      } else {
        toast({
          title: "Task Uncompleted",
          description: "Task marked as not completed",
        })
      }

      // Update local state through parent component
      onScheduleUpdate?.(updatedSchedule)
    } catch (error) {
      console.error("Error marking session as complete:", error)
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Study Schedule</h2>
        <p className="text-sm text-gray-400">
          Last updated: {format(parseISO(schedule.updatedAt), "PPp")}
        </p>
      </div>
      
      <div className="space-y-4">
        {schedule.schedule.map((day, dayIndex) => (
          <div key={day.date} className="bg-gray-800/50 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-200 mb-4">
              {format(parseISO(day.date), "EEEE, MMMM d")}
            </h3>
            <div className="space-y-4">
              {day.sessions.map((session, sessionIndex) => (
                <div
                  key={sessionIndex}
                  className={`border-l-4 ${
                    session.completed 
                      ? "border-green-500 bg-green-500/10" 
                      : "border-blue-500 bg-gray-700/50"
                  } pl-6 py-4 rounded-r-lg transition-all`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-medium text-gray-200">{session.subject}</h4>
                        <span className="text-sm text-gray-400">{session.topic}</span>
                      </div>
                      <p className="text-gray-400">{session.notes}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-gray-200">
                          <Clock className="w-4 h-4" />
                          {format(new Date(`${day.date}T${session.startTime}`), "h:mm a")} -{" "}
                          {format(new Date(`${day.date}T${session.endTime}`), "h:mm a")}
                        </div>
                        <p className="text-sm text-gray-400">Duration: {session.duration} minutes</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="hover:bg-gray-700"
                              onClick={() => {
                                setEditSession({
                                  dayIndex,
                                  sessionIndex,
                                  session: { ...session }
                                })
                              }}
                            >
                              <Edit className="w-4 h-4 text-gray-400 hover:text-white" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Update Study Time</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div>
                                <Label htmlFor="startTime">Start Time</Label>
                                <Input
                                  id="startTime"
                                  type="time"
                                  value={editSession?.session.startTime || session.startTime}
                                  onChange={(e) =>
                                    setEditSession(prev => prev ? {
                                      ...prev,
                                      session: {
                                        ...prev.session,
                                        startTime: e.target.value
                                      }
                                    } : null)
                                  }
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                  Session will be scheduled for 2 hours
                                </p>
                              </div>
                              <Button 
                                onClick={handleUpdateSession}
                                className="w-full"
                              >
                                Update Time
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-gray-700"
                          onClick={() => handleMarkComplete(dayIndex, sessionIndex)}
                          disabled={loading}
                        >
                          <CheckCircle2 
                            className={`w-4 h-4 ${
                              session.completed 
                                ? "text-green-500" 
                                : "text-gray-400 hover:text-white"
                            }`}
                          />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}