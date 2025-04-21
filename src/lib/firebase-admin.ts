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

    // Initialize Firebase Admin
    app = initializeApp({
      credential: cert({
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
  }
} else {
  app = getApps()[0]
}

const auth = getAuth(app)
const db = getFirestore(app)

export { auth, db } 
