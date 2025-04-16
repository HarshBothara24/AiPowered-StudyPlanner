<<<<<<< HEAD
import { NextResponse } from "next/server"
import { OAuth2Client } from "google-auth-library"

const oauth2Client = new OAuth2Client(
=======
import { google } from "googleapis"
import { NextResponse } from "next/server"

const oauth2Client = new google.auth.OAuth2(
>>>>>>> e4d9b341bc289a98c72aa2db8a374d5525991c03
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export async function GET() {
<<<<<<< HEAD
  try {
    // Generate the authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/userinfo.email"
      ],
      prompt: "consent"
    })

    // Redirect to the authorization URL
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Error generating auth URL:", error)
    return NextResponse.json(
      { error: "Failed to initialize Google authentication" },
      { status: 500 }
    )
  }
=======
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar'
  ]

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // Force to get refresh token
  })

  return NextResponse.redirect(authUrl)
>>>>>>> e4d9b341bc289a98c72aa2db8a374d5525991c03
} 