"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, BookOpen, ChevronDown, ChevronUp } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

interface StudySession {
  subject: string
  startTime: string
  endTime: string
  duration: number
  notes: string
}

interface ScheduleDay {
  date: string
  sessions: StudySession[]
}

interface Schedule {
  id: string
  schedule: ScheduleDay[]
}

interface SubjectSyllabus {
  subject: string
  topics: string[]
  rawInput: string
}

export default function Schedule() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [showSyllabus, setShowSyllabus] = useState(false)
  const [syllabusEntries, setSyllabusEntries] = useState<SubjectSyllabus[]>([])
  const [formData, setFormData] = useState({
    subjects: "",
    duration: 2,
    startDate: "",
    endDate: "",
    preferences: ""
  })

  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  // Update syllabus entries when subjects change
  useEffect(() => {
    const subjects = formData.subjects
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)

    console.log("Current subjects:", subjects) // Debug log

    setSyllabusEntries(prev => {
      // Keep existing entries for current subjects
      const existingEntries = prev.filter(entry => 
        subjects.includes(entry.subject)
      )

      // Add new entries for new subjects
      const newSubjects = subjects.filter(
        subject => !prev.find(entry => entry.subject === subject)
      )

      const newEntries = newSubjects.map(subject => ({
        subject,
        topics: [],
        rawInput: ""
      }))

      const updatedEntries = [...existingEntries, ...newEntries]
      console.log("Updated syllabus entries:", updatedEntries) // Debug log
      return updatedEntries
    })
  }, [formData.subjects])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const idToken = await user?.getIdToken()
      if (!idToken) {
        throw new Error("Not authenticated")
      }

      const cleanedSyllabus = showSyllabus ? syllabusEntries.map(({ subject, topics }) => ({
        subject,
        topics: topics.filter(Boolean)
      })) : undefined

      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          subjects: formData.subjects.split(",").map(s => s.trim()),
          duration: formData.duration,
          startDate: formData.startDate,
          endDate: formData.endDate,
          preferences: formData.preferences,
          syllabus: cleanedSyllabus
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate schedule")
      }

      const data = await response.json()
      // Ensure the schedule data structure is correct
      if (!data.schedule || !data.schedule.schedule) {
        throw new Error("Invalid schedule data received")
      }
      setSchedule(data.schedule)
    } catch (error) {
      console.error("Error generating schedule:", error)
      setError(error instanceof Error ? error.message : "Failed to generate schedule")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: name === "duration" ? parseInt(value) : value
      }
      console.log("Updated form data:", updated) // Debug log
      return updated
    })
  }

  const handleTopicsChange = (subject: string, rawInput: string) => {
    setSyllabusEntries(prev => {
      const updated = prev.map(entry => 
        entry.subject === subject 
          ? {
              ...entry,
              rawInput,
              topics: rawInput.split("\n").map(t => t.trim()).filter(Boolean)
            }
          : entry
      )
      console.log("Updated topics for", subject, ":", updated) // Debug log
      return updated
    })
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Create Study Schedule</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="subjects">Subjects</Label>
                <Input
                  type="text"
                  name="subjects"
                  id="subjects"
                  value={formData.subjects}
                  onChange={handleInputChange}
                  placeholder="e.g., Mathematics, Physics, Chemistry"
                  required
                />
              </div>

              <div>
                <Label htmlFor="duration">Study Duration (hours per session)</Label>
                <Input
                  type="number"
                  name="duration"
                  id="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="1"
                  max="4"
                  required
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Recommended: 1-2 hours per session for better focus and retention
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    type="date"
                    name="startDate"
                    id="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    type="date"
                    name="endDate"
                    id="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="preferences">Study Preferences</Label>
                <Textarea
                  id="preferences"
                  name="preferences"
                  value={formData.preferences}
                  onChange={handleInputChange}
                  placeholder="e.g., I prefer morning study sessions, need breaks every 45 minutes"
                  rows={3}
                />
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <button
                  type="button"
                  onClick={() => setShowSyllabus(!showSyllabus)}
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <span>Add Detailed Syllabus (Optional)</span>
                  {showSyllabus ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showSyllabus && (
                  <div className="space-y-4 pt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Enter topics for each subject (one per line) to get more focused study sessions
                    </p>
                    {syllabusEntries.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Please enter subjects above to add their syllabus
                      </p>
                    ) : (
                      syllabusEntries.map((entry) => (
                        <div key={entry.subject} className="space-y-2">
                          <Label htmlFor={`syllabus-${entry.subject}`} className="block">
                            {entry.subject}
                          </Label>
                          <Textarea
                            key={`textarea-${entry.subject}`}
                            id={`syllabus-${entry.subject}`}
                            value={entry.rawInput}
                            onChange={(e) => handleTopicsChange(entry.subject, e.target.value)}
                            placeholder={`Enter topics for ${entry.subject}, one per line\ne.g., Topic 1\nTopic 2\nTopic 3`}
                            rows={4}
                            className="mt-1 w-full resize-y min-h-[100px]"
                          />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? "Generating..." : "Generate Schedule"}
                </Button>
              </div>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}

            {schedule && schedule.schedule && schedule.schedule.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Generated Schedule</h3>
                <div className="space-y-8">
                  {schedule.schedule.map((day, dayIndex) => (
                    <div key={`${day.date}-${dayIndex}`} className="space-y-4">
                      <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">
                        {new Date(day.date).toLocaleDateString(undefined, { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </h4>
                      
                      {day.sessions && day.sessions.length > 0 ? (
                        <div className="space-y-4">
                          {day.sessions.map((session, sessionIndex) => (
                            <Card key={`${day.date}-${session.subject}-${sessionIndex}`} className="border-l-4 border-primary">
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <BookOpen className="w-5 h-5" />
                                  {session.subject}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <Clock className="w-4 h-4" />
                                    <span className="font-medium">{session.startTime} - {session.endTime}</span>
                                    <span className="text-gray-500">({session.duration} hours)</span>
                                  </div>
                                  {session.notes && (
                                    <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md">
                                      <p className="font-medium mb-1">Study Focus:</p>
                                      {session.notes}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No sessions scheduled for this day</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 