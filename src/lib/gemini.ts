import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "")

export async function generateStudySchedule(
  subjects: string[],
  duration: number,
  startDate: string,
  endDate: string,
  existingSessions: any[],
  preferences: any
) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" })

  const prompt = `
    Create an optimized study schedule with the following parameters:
    - Subjects: ${subjects.join(", ")}
    - Study duration per session: ${duration} minutes
    - Date range: ${startDate} to ${endDate}
    - User preferences: ${JSON.stringify(preferences)}
    - Existing sessions: ${JSON.stringify(existingSessions)}

    Consider the following factors:
    1. Optimal study times based on research (morning and evening are generally better)
    2. Spacing between sessions for the same subject
    3. User's preferred study hours
    4. Existing commitments
    5. Time zone: ${preferences.timeZone}
    6. Skip weekends if preferred: ${preferences.skipWeekends}

    Return the schedule in JSON format with the following structure:
    {
      "schedule": [
        {
          "date": "YYYY-MM-DD",
          "sessions": [
            {
              "subject": "string",
              "startTime": "HH:MM",
              "endTime": "HH:MM",
              "duration": number,
              "notes": "string" // Include any specific study tips or focus areas
            }
          ]
        }
      ]
    }
  `

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Parse the JSON response
    const schedule = JSON.parse(text)
    return schedule
  } catch (error) {
    console.error("Error generating schedule with Gemini:", error)
    throw error
  }
} 