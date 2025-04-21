import { google } from "googleapis"
import { NextResponse } from "next/server"

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 })
  }

  try {
    const { tokens } = await oauth2Client.getToken(code)
    const refreshToken = tokens.refresh_token

    // Display the refresh token to copy
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Calendar Setup</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 600px;
              margin: 40px auto;
              padding: 0 20px;
              line-height: 1.6;
            }
            .token-box {
              background: #f5f5f5;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              word-break: break-all;
            }
            .instructions {
              color: #666;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <h1>Google Calendar Setup Complete</h1>
          <div class="instructions">
            <p>Copy this refresh token and add it to your .env.local file:</p>
            <code>GOOGLE_REFRESH_TOKEN=your-refresh-token</code>
          </div>
          <div class="token-box">
            ${refreshToken}
          </div>
        </body>
      </html>
    `

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    })
  } catch (error) {
    console.error("Error getting refresh token:", error)
    return NextResponse.json({ error: "Failed to get refresh token" }, { status: 500 })
  }
} 