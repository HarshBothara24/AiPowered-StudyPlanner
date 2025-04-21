import { NextResponse } from "next/server"
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
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

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
      if (calendarEvent.id) {
        await calendar.events.patch({
          calendarId: 'primary',
          eventId: calendarEvent.id,
          requestBody: {
            attendees: validAttendeeEmails.map(email => ({
              email,
              responseStatus: 'needsAction'
            }))
          },
          sendUpdates: 'all'
        })
      } else {
        console.error('Invalid calendar event ID:', calendarEvent.id)
      }
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
      { status: 500 }
    )
  }
} 