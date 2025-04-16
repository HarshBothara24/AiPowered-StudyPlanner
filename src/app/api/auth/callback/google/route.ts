import { NextResponse } from "next/server"
import { OAuth2Client } from "google-auth-library"

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get("code")

    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 })
    }

    // Exchange the code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    // Set the credentials
    oauth2Client.setCredentials(tokens)

    // Get the user's email
    const userInfo = await oauth2Client.getTokenInfo(tokens.access_token!)
    const email = userInfo.email

    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 })
    }

    // Create HTML response with the refresh token
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
            ${tokens.refresh_token}
          </div>
          <script>
            // Automatically copy the token to clipboard
            navigator.clipboard.writeText('${tokens.refresh_token}')
              .then(() => alert('Refresh token copied to clipboard!'))
              .catch(err => console.error('Failed to copy token:', err));
          </script>
        </body>
      </html>
    `

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" }
    })
  } catch (error) {
    console.error("Error in Google OAuth callback:", error)
    return NextResponse.json(
      { error: "Failed to authenticate with Google" },
      { status: 500 }
    )
  }
} 