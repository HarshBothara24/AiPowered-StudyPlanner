import { NextResponse } from "next/server"
import { createCalendarEvent } from "../../../../lib/google-calendar"
import { auth } from "../../../../lib/firebase-admin"

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const { idToken, title, description, startTime, endTime, attendees } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    if (!decodedToken.email) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Fetch email addresses for attendees
    let attendeeEmails: string[] = []
    if (attendees && attendees.length > 0) {
      try {
        const userRecords = await auth.getUsers(attendees.map(uid => ({ uid })))
        attendeeEmails = userRecords.users
          .filter(user => user.email)
          .map(user => user.email!)
      } catch (error) {
        console.error("Error fetching user emails:", error)
        return NextResponse.json(
          { error: "Failed to fetch attendee email addresses" },
          { status: 400 }
        )
      }

      if (attendeeEmails.length === 0) {
        return NextResponse.json(
          { error: "No valid email addresses found for attendees" },
          { status: 400 }
        )
      }
    }

    // Create calendar event
    const event = {
      summary: title,
      description: description || "",
      start: {
        dateTime: startTime,
        timeZone: "UTC"
      },
      end: {
        dateTime: endTime,
        timeZone: "UTC"
      },
      attendees: attendeeEmails.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: Math.random().toString(36).substring(7),
          conferenceSolutionKey: {
            type: "hangoutsMeet"
          }
        }
      }
    }

    try {
      console.log('Creating calendar event with data:', {
        event,
        attendees: attendeeEmails
      })

      const calendarEvent = await createCalendarEvent(event)
      console.log('Calendar event created:', calendarEvent)
      
      // Extract the Meet link from the conference data
      const meetLink = calendarEvent.conferenceData?.entryPoints?.find(
        (entry: any) => entry.entryPointType === "video"
      )?.uri

      console.log('Meet link extracted:', meetLink)
      console.log('Full conference data:', calendarEvent.conferenceData)

      if (!meetLink) {
        console.error('No Meet link found in response:', calendarEvent)
        throw new Error("Failed to create Google Meet link")
      }

      return NextResponse.json({
        success: true,
        meetLink,
        eventId: calendarEvent.id,
        conferenceData: calendarEvent.conferenceData
      })
    } catch (error: any) {
      console.error('Error in calendar event creation:', error)
      if (error.message.includes("Invalid or expired refresh token")) {
        return NextResponse.json(
          { 
            error: "Google Calendar authentication required",
            authUrl: `/api/auth/google`
          },
          { status: 401 }
        )
      }
      throw error
    }
  } catch (error: any) {
    console.error("Error creating meeting:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create meeting" },
      { status: 500 }
    )
  }
} 