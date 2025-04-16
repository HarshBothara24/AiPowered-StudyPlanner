import { google } from "googleapis"
import { OAuth2Client } from "google-auth-library"

export async function getGoogleCalendarClient() {
  try {
    // Check for required credentials
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error("Missing Google OAuth credentials")
    }

    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      throw new Error("No refresh token found. Please authenticate with Google first.")
    }

    // Initialize OAuth2 client
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    // Set credentials
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    })

    // Create calendar client
    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Test the credentials
    try {
      await calendar.calendars.get({ calendarId: "primary" })
    } catch (error: any) {
      if (error.code === 401 || error.message.includes("invalid_grant")) {
        throw new Error("Invalid or expired refresh token. Please re-authenticate with Google.")
      }
      throw error
    }

    return calendar
  } catch (error) {
    console.error("Error initializing Google Calendar client:", error)
    throw error
  }
}

export async function createCalendarEvent(event: any) {
  try {
    const calendar = await getGoogleCalendarClient()
    console.log('Creating calendar event with data:', event)

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        ...event,
        conferenceData: {
          createRequest: {
            requestId: Math.random().toString(36).substring(7),
            conferenceSolutionKey: {
              type: "hangoutsMeet"
            }
          }
        }
      },
      conferenceDataVersion: 1,
      sendUpdates: "all"
    })

    console.log('Calendar event response:', response.data)
    return response.data
  } catch (error) {
    console.error("Error creating calendar event:", error)
    throw error
  }
} 