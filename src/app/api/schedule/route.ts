import { NextResponse } from "next/server"
import { auth, db } from "@/lib/firebase-admin"
import { generateStudySchedule } from "@/lib/gemini"

export async function POST(request: Request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Parse request body
    const body = await request.json()
    const { subjects, duration, startDate, endDate, preferences } = body

    if (!subjects || !duration || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Get existing study sessions
    const existingSessionsSnapshot = await db
      .collection("studySessions")
      .where("userId", "==", userId)
      .where("date", ">=", startDate)
      .where("date", "<=", endDate)
      .get()

    const existingSessions = existingSessionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Get user preferences
    const userPrefsDoc = await db.collection("userPreferences").doc(userId).get()
    const userPreferences = userPrefsDoc.exists ? userPrefsDoc.data() : {}

    // Generate schedule using Gemini
    const generatedSchedule = await generateStudySchedule(
      subjects,
      duration,
      startDate,
      endDate,
      existingSessions,
      { ...userPreferences, ...preferences }
    )

    // Save the schedule directly to the user's document in the schedules collection
    const scheduleRef = db.collection("schedules").doc(userId)
    await scheduleRef.set({
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schedule: generatedSchedule.schedule.map(day => ({
        date: day.date,
        sessions: day.sessions.map(session => ({
          subject: session.subject,
          topic: session.topic || "General Study",
          startTime: session.startTime,
          endTime: session.endTime,
          duration: session.duration,
          notes: session.notes || `Study session for ${session.subject}`
        }))
      }))
    })

    return NextResponse.json({
      success: true,
      schedule: {
        id: userId,
        schedule: generatedSchedule.schedule
      }
    })
  } catch (error) {
    console.error("Error generating schedule:", error)
    return NextResponse.json(
      { error: "Failed to generate schedule" },
      { status: 500 }
    )
  }
} 