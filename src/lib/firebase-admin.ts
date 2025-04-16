<<<<<<< HEAD
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
=======
import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

let app: App

if (!getApps().length) {
  try {
    // Validate environment variables
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY

    if (!projectId || !clientEmail || !privateKey) {
      console.error('Missing Firebase Admin credentials:', {
        projectId: projectId ? 'present' : 'missing',
        clientEmail: clientEmail ? 'present' : 'missing',
        privateKey: privateKey ? 'present' : 'missing'
      })
      throw new Error('Missing Firebase Admin credentials')
    }

    // Format the private key
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n')
>>>>>>> e4d9b341bc289a98c72aa2db8a374d5525991c03

    // Initialize Firebase Admin
    app = initializeApp({
      credential: cert({
<<<<<<< HEAD
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
=======
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
      databaseURL: `https://${projectId}.firebaseio.com`,
    })

    // Test Firestore connection
    const testDb = getFirestore(app)
    await testDb.collection('test').doc('test').get()
      .catch(error => {
        console.error('Firestore connection test failed:', error)
        throw error
      })

    console.log('Firebase Admin initialized successfully with project:', projectId)
  } catch (error) {
    console.error('Firebase admin initialization error:', error)
    throw new Error(`Failed to initialize Firebase Admin: ${error.message}`)
>>>>>>> e4d9b341bc289a98c72aa2db8a374d5525991c03
  }
} else {
  app = getApps()[0]
}

<<<<<<< HEAD
export const auth = getAuth(app)
export const db = getFirestore(app) 
=======
const auth = getAuth(app)
const db = getFirestore(app)

export { auth, db } 
>>>>>>> e4d9b341bc289a98c72aa2db8a374d5525991c03
