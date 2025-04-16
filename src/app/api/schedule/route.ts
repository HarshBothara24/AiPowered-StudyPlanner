import { NextResponse } from "next/server"
import { getAuth } from "firebase/auth"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, Timestamp, doc, setDoc } from "firebase/firestore"
import { generateStudySchedule } from "@/lib/gemini"

export async function POST(request: Request) {
  try {
    const auth = getAuth()
    const user = auth.currentUser

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { subjects, duration, startDate, endDate } = await request.json()

    // Get user's existing study sessions
    const sessionsRef = collection(db, "studySessions")
    const q = query(
      sessionsRef,
      where("userId", "==", user.uid),
      where("startTime", ">=", Timestamp.fromDate(new Date(startDate))),
      where("startTime", "<=", Timestamp.fromDate(new Date(endDate)))
    )
    const querySnapshot = await getDocs(q)
    const existingSessions = querySnapshot.docs.map(doc => doc.data())

    // Get user's preferences
    const userRef = collection(db, "users")
    const userDoc = await getDocs(query(userRef, where("id", "==", user.uid)))
    const userData = userDoc.docs[0]?.data()
    const preferences = userData?.preferences || {}

    // Generate schedule using Gemini AI
    const schedule = await generateStudySchedule(
      subjects,
      duration,
      startDate,
      endDate,
      existingSessions,
      preferences
    )

    // Create a new schedule document
    const scheduleRef = doc(collection(db, "schedules"))
    const scheduleData = {
      id: scheduleRef.id,
      userId: user.uid,
      subjects,
      duration,
      startDate: Timestamp.fromDate(new Date(startDate)),
      endDate: Timestamp.fromDate(new Date(endDate)),
      preferences,
      createdAt: Timestamp.now(),
      status: "active"
    }

    // Save the schedule document
    await setDoc(scheduleRef, scheduleData)

    // Convert the schedule to the required format and create study sessions
    const studySessions = []
    for (const day of schedule.schedule) {
      for (const session of day.sessions) {
        const startTime = new Date(`${day.date}T${session.startTime}`)
        const endTime = new Date(`${day.date}T${session.endTime}`)
        
        const sessionData = {
          userId: user.uid,
          scheduleId: scheduleRef.id,
          subject: session.subject,
          duration: session.duration,
          startTime: Timestamp.fromDate(startTime),
          endTime: Timestamp.fromDate(endTime),
          completed: false,
          notes: session.notes,
          achievements: []
        }

        // Create a new session document
        const sessionRef = doc(collection(db, "studySessions"))
        await setDoc(sessionRef, { ...sessionData, id: sessionRef.id })
        
        studySessions.push({ ...sessionData, id: sessionRef.id })
      }
    }

    // Update the schedule document with the session IDs
    await setDoc(scheduleRef, {
      ...scheduleData,
      sessionIds: studySessions.map(session => session.id)
    }, { merge: true })

    return NextResponse.json({ 
      schedule: {
        id: scheduleRef.id,
        sessions: studySessions
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