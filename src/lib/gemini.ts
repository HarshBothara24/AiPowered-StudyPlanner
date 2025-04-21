import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "")

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
  schedule: ScheduleDay[]
}

interface SubjectSyllabus {
  subject: string
  topics: string[]
}

export async function generateStudySchedule(
  subjects: string[],
  duration: number,
  startDate: string,
  endDate: string,
  existingSessions: any[],
  preferences: any,
  syllabus?: SubjectSyllabus[]
) {
  try {
    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    // Set default times for weekdays and weekends
    const defaultWeekdayTime = "18:00" // 6 PM for weekday evenings
    const defaultWeekendTime = "09:00" // 9 AM for weekend mornings

    // Helper function to check if a date is a weekend
    const isWeekend = (dateStr: string) => {
      const date = new Date(dateStr)
      return date.getDay() === 0 || date.getDay() === 6 // 0 is Sunday, 6 is Saturday
    }

    // Format the prompt
    const prompt = `You are a study schedule generator. Create a detailed schedule with these requirements:
{
  "startDate": "${startDate}",
  "endDate": "${endDate}",
  "subjects": ${JSON.stringify(subjects)},
  "sessionDuration": ${duration},
  "syllabus": ${JSON.stringify(syllabus || [])},
  "existingSessions": ${JSON.stringify(existingSessions)},
  "preferences": {
    "weekdayTimes": ["18:00-${addHoursToTime("18:00", duration)}"],
    "weekendTimes": ["09:00-${addHoursToTime("09:00", duration)}"],
    "weekendsPreferMorning": true,
    "timezone": "${preferences?.timezone || 'UTC'}"
  }
}

STRICT REQUIREMENTS:
1. Generate EXACTLY ONE session for EVERY DAY between startDate and endDate
2. ROTATE through ALL subjects evenly. Make sure you cycle through all subjects (${subjects.join(", ")}) before repeating
3. For weekdays (Mon-Fri): Schedule sessions in the evening (18:00-${addHoursToTime("18:00", duration)})
4. For weekends (Sat-Sun): Schedule sessions in the morning (09:00-${addHoursToTime("09:00", duration)})
5. Each session MUST have ALL these fields with DOUBLE QUOTES around property names:
   - "subject": string (one of: ${subjects.join(", ")})
   - "startTime": "HH:mm" format
   - "endTime": "HH:mm" format
   - "duration": number (always ${duration * 60})
   - "notes": string with study tips

Return ONLY a valid JSON object with this EXACT structure:
{
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "sessions": [
        {
          "subject": "string",
          "startTime": "HH:mm",
          "endTime": "HH:mm",
          "duration": ${duration * 60},
          "notes": "string with study tips"
        }
      ]
    }
  ]
}

IMPORTANT: Ensure ALL property names are in DOUBLE QUOTES. The response must be valid JSON.`

    // Generate content
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    
    // Clean the response text
    const cleanedText = text
      .replace(/```json\s*|\s*```/g, '')
      .replace(/```\s*|\s*```/g, '')
      .trim()

    try {
      const schedule = JSON.parse(cleanedText)
      
      if (!schedule.schedule || !Array.isArray(schedule.schedule)) {
        throw new Error('Invalid schedule format: missing or invalid schedule array')
      }

      // Get default values for empty sessions
      const defaultSubject = subjects[0] || "General Study"

      // Validate and fix each schedule entry
      schedule.schedule = schedule.schedule.map((day: any) => {
        if (!day.date || !day.sessions || !Array.isArray(day.sessions)) {
          throw new Error(`Invalid day format for date: ${day.date}`)
        }
        
        // Determine if it's a weekend and set appropriate time
        const isWeekendDay = isWeekend(day.date)
        const defaultStartTime = isWeekendDay ? defaultWeekendTime : defaultWeekdayTime
        const defaultEndTime = addHoursToTime(defaultStartTime, duration)

        // Ensure each day has at least one session
        if (day.sessions.length === 0) {
          day.sessions = [{
            subject: defaultSubject,
            startTime: defaultStartTime,
            endTime: defaultEndTime,
            duration: duration * 60,
            notes: `Study session for ${defaultSubject}`
          }]
        }

        // Validate and fix each session
        day.sessions = day.sessions.map((session: any) => ({
          subject: session.subject || defaultSubject,
          startTime: session.startTime || defaultStartTime,
          endTime: session.endTime || defaultEndTime,
          duration: duration * 60,
          notes: session.notes || `Study session for ${session.subject || defaultSubject}`
        }))

        return day
      })

      return schedule
    } catch (parseError: any) {
      console.error('JSON parsing error:', parseError.message)
      throw new Error(`Failed to parse schedule: ${parseError.message}`)
    }
  } catch (error: any) {
    console.error('Gemini API error:', error)
    throw new Error(`Failed to generate schedule: ${error.message}`)
  }
}

// Helper function to add hours to time string (HH:mm)
function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number)
  const newHours = (h + hours) % 24
  return `${newHours.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}