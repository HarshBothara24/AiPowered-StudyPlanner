import { google } from "googleapis"
import { OAuth2Client } from "google-auth-library"

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export async function getGoogleCalendarClient() {
  try {
    // Check if we have all required credentials
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
      throw new Error("Missing Google Calendar API credentials. Please check your .env.local file.")
    }

    // Set credentials
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      access_token: process.env.GOOGLE_ACCESS_TOKEN
    })

    // Create and return the calendar client
    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Test the credentials by getting the primary calendar
    try {
      await calendar.calendars.get({ calendarId: "primary" })
    } catch (error) {
      console.error("Error testing Google Calendar credentials:", error)
      throw new Error("Failed to authenticate with Google Calendar API. Please check your credentials.")
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
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      conferenceDataVersion: 1,
    })

    return response.data
  } catch (error) {
    console.error("Error creating calendar event:", error)
    throw error
  }
} 