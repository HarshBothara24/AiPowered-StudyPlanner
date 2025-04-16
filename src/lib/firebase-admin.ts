import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

let app

if (!getApps().length) {
  try {
    // Check if we have all required credentials
    if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_PROJECT_ID) {
      console.error('Missing Firebase Admin credentials:', {
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'present' : 'missing',
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'present' : 'missing',
        projectId: process.env.FIREBASE_PROJECT_ID ? 'present' : 'missing'
      })
      throw new Error('Missing Firebase Admin credentials. Please check your .env.local file.')
    }

    // Format the private key - remove quotes and handle newlines
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      .replace(/^"|"$/g, '') // Remove surrounding quotes
      .replace(/\\n/g, '\n') // Replace \n with actual newlines

    // Initialize Firebase Admin
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    })

    console.log('Firebase Admin initialized successfully with project:', process.env.FIREBASE_PROJECT_ID)
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      })
    }
    throw error
  }
} else {
  app = getApps()[0]
}

export const auth = getAuth(app)
export const db = getFirestore(app) 