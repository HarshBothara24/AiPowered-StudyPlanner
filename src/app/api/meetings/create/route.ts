import { NextResponse } from "next/server"
<<<<<<< HEAD
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
=======
import { auth, db } from "../../../../lib/firebase-admin"
import { createCalendarEvent } from "../../../../lib/google-calendar"
import { getGoogleCalendarClient } from "../../../../lib/google-calendar"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('Received meeting creation request:', body)

    const { groupId, title, description, startTime, endTime, attendees } = body

    // Validate required fields
    if (!groupId || !title || !startTime || !endTime) {
      console.error('Missing required fields:', { groupId, title, startTime, endTime })
>>>>>>> e4d9b341bc289a98c72aa2db8a374d5525991c03
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

<<<<<<< HEAD
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
=======
    // Get group data
    const groupDoc = await db.collection("studyGroups").doc(groupId).get()
    if (!groupDoc.exists) {
      console.error('Group not found:', groupId)
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      )
    }

    const group = groupDoc.data()
    if (!group) {
      throw new Error("Failed to get group data")
    }

    // Get user emails from Firebase Auth
    const attendeeEmails = await Promise.all(
      attendees.map(async (uid: string) => {
        try {
          const user = await auth.getUser(uid)
          return user.email
        } catch (error) {
          console.error(`Error getting user email for ${uid}:`, error)
          return null
        }
      })
    )

    // Filter out any null emails
    const validAttendeeEmails = attendeeEmails.filter((email): email is string => email !== null)
    console.log('Valid attendee emails:', validAttendeeEmails)

    // Create calendar event
    const event = {
      summary: title,
      description: description || `Study group meeting for ${group.name}`,
      start: {
        dateTime: startTime,
        timeZone: "UTC",
      },
      end: {
        dateTime: endTime,
        timeZone: "UTC",
      },
      attendees: validAttendeeEmails.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `${groupId}-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    }

    console.log('Creating calendar event:', event)
    const calendarEvent = await createCalendarEvent(event)
    console.log('Calendar event created:', calendarEvent)

    // Save meeting details to Firestore
    const meetingRef = await db.collection("meetings").add({
      groupId,
      title,
      description,
      startTime,
      endTime,
      attendees,
      calendarEventId: calendarEvent.id,
      meetLink: calendarEvent.hangoutLink,
      createdAt: new Date().toISOString(),
    })

    console.log('Meeting saved to Firestore:', meetingRef.id)

    // Send calendar invites to all attendees
    try {
      const calendar = await getGoogleCalendarClient()
      await calendar.events.patch({
        calendarId: 'primary',
        eventId: calendarEvent.id,
        requestBody: {
          attendees: validAttendeeEmails.map(email => ({
            email,
            responseStatus: 'needsAction'
          })),
          sendUpdates: 'all'
        }
      })
      console.log('Calendar invites sent to all attendees')
    } catch (error) {
      console.error('Error sending calendar invites:', error)
      // Don't throw the error as the event was already created
    }

    return NextResponse.json({
      id: meetingRef.id,
      ...calendarEvent,
    })
  } catch (error) {
    console.error("Error creating meeting:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create meeting" },
>>>>>>> e4d9b341bc289a98c72aa2db8a374d5525991c03
      { status: 500 }
    )
  }
} 