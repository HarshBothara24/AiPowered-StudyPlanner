import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth"
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, Timestamp, query, where, getDocs, orderBy, limit, increment } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

// User Model
export interface User {
  id: string
  email: string
  displayName: string
  photoURL?: string
  points: number
  level: number
  studyGroups: string[]
  preferences: {
    studyHours: number
    preferredSubjects: string[]
    timeZone: string
    skipWeekends: boolean
    preferredStudyTimes: string[]
    difficultyLevel: "beginner" | "intermediate" | "advanced"
  }
  achievements: {
    id: string
    name: string
    description: string
    points: number
    earnedAt: Timestamp
  }[]
  studyStats: {
    totalStudyTime: number
    completedSessions: number
    streak: number
    lastStudyDate: Timestamp
  }
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Study Session Model
export interface StudySession {
  id: string
  userId: string
  scheduleId: string
  subject: string
  duration: number // in minutes
  startTime: Timestamp
  endTime: Timestamp
  completed: boolean
  notes?: string
  groupId?: string
  achievements: string[]
  progress: {
    completedTopics: string[]
    currentTopic: string
    notes: string
    resources: string[]
  }
  feedback: {
    difficulty: number // 1-5
    focusLevel: number // 1-5
    understanding: number // 1-5
    notes: string
  }
}

// Study Group Model
export interface StudyGroup {
  id: string
  name: string
  description: string
  members: string[]
  admin: string
  subjects: string[]
  schedule: {
    day: string
    time: string
    duration: number
  }[]
  chat: {
    userId: string
    message: string
    timestamp: Timestamp
    type: "text" | "resource" | "achievement"
    attachments?: {
      type: string
      url: string
      name: string
    }[]
  }[]
  resources: {
    id: string
    name: string
    type: string
    url: string
    uploadedBy: string
    uploadedAt: Timestamp
    description: string
  }[]
  achievements: {
    id: string
    name: string
    description: string
    points: number
    earnedBy: string[]
  }[]
  settings: {
    visibility: "public" | "private"
    joinRequests: boolean
    maxMembers: number
    studyFocus: string[]
    difficultyLevel: "beginner" | "intermediate" | "advanced"
  }
  stats: {
    totalStudyTime: number
    activeMembers: number
    resourcesCount: number
    lastActivity: Timestamp
  }
}

// Authentication Functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user
    
    // Create or update user document
    const userRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userRef)
    
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        points: 0,
        level: 1,
        studyGroups: [],
        preferences: {
          studyHours: 0,
          preferredSubjects: [],
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          skipWeekends: false,
          preferredStudyTimes: [],
          difficultyLevel: "beginner"
        },
        achievements: [],
        studyStats: {
          totalStudyTime: 0,
          completedSessions: 0,
          streak: 0,
          lastStudyDate: Timestamp.now()
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
    } else {
      await updateDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        updatedAt: Timestamp.now()
      })
    }
    
    return user
  } catch (error) {
    console.error("Error signing in with Google:", error)
    throw error
  }
}

export const logout = async () => {
  try {
    await signOut(auth)
  } catch (error) {
    console.error("Error signing out:", error)
    throw error
  }
}

// Study Session Functions
export const createStudySession = async (session: Omit<StudySession, "id">) => {
  const sessionsRef = collection(db, "studySessions")
  const docRef = doc(sessionsRef)
  await setDoc(docRef, { ...session, id: docRef.id })
  return docRef.id
}

export const updateStudySession = async (sessionId: string, updates: Partial<StudySession>) => {
  const sessionRef = doc(db, "studySessions", sessionId)
  await updateDoc(sessionRef, updates)
}

// Study Group Functions
export const createStudyGroup = async (group: Omit<StudyGroup, "id">) => {
  const groupsRef = collection(db, "studyGroups")
  const docRef = doc(groupsRef)
  const groupData = {
    ...group,
    id: docRef.id,
    stats: {
      totalStudyTime: 0,
      activeMembers: 1,
      resourcesCount: 0,
      lastActivity: Timestamp.now()
    }
  }
  await setDoc(docRef, groupData)
  return docRef.id
}

export const joinStudyGroup = async (groupId: string, userId: string) => {
  const groupRef = doc(db, "studyGroups", groupId)
  const userRef = doc(db, "users", userId)
  
  // First check if the group exists
  const groupDoc = await getDoc(groupRef)
  if (!groupDoc.exists()) {
    throw new Error("Group not found")
  }
  
  // Check if the user document exists
  const userDoc = await getDoc(userRef)
  if (!userDoc.exists()) {
    // Create the user document if it doesn't exist
    await setDoc(userRef, {
      id: userId,
      studyGroups: [groupId],
      preferences: {
        studyHours: 0,
        preferredSubjects: [],
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        skipWeekends: false,
        preferredStudyTimes: [],
        difficultyLevel: "beginner"
      },
      studyStats: {
        totalStudyTime: 0,
        completedSessions: 0,
        streak: 0,
        lastStudyDate: Timestamp.now()
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })
  } else {
    // Update existing user document
    await updateDoc(userRef, {
      studyGroups: arrayUnion(groupId),
      updatedAt: Timestamp.now()
    })
  }
  
  // Update the group document
  await updateDoc(groupRef, {
    members: arrayUnion(userId),
    "stats.activeMembers": increment(1)
  })
}

export const leaveStudyGroup = async (groupId: string, userId: string) => {
  const groupRef = doc(db, "studyGroups", groupId)
  const userRef = doc(db, "users", userId)
  
  await updateDoc(groupRef, {
    members: arrayRemove(userId),
    "stats.activeMembers": increment(-1)
  })
  
  await updateDoc(userRef, {
    studyGroups: arrayRemove(groupId)
  })
}

export const addGroupMessage = async (
  groupId: string,
  message: {
    userId: string
    message: string
    type: "text" | "resource" | "achievement"
    attachments?: {
      type: string
      url: string
      name: string
    }[]
  }
) => {
  const groupRef = doc(db, "studyGroups", groupId)
  await updateDoc(groupRef, {
    chat: arrayUnion({
      ...message,
      timestamp: Timestamp.now()
    }),
    "stats.lastActivity": Timestamp.now()
  })
}

export const addGroupResource = async (
  groupId: string,
  resource: {
    name: string
    type: string
    url: string
    uploadedBy: string
    description: string
  }
) => {
  const groupRef = doc(db, "studyGroups", groupId)
  const resourceId = doc(collection(db, "resources")).id
  
  await updateDoc(groupRef, {
    resources: arrayUnion({
      ...resource,
      id: resourceId,
      uploadedAt: Timestamp.now()
    }),
    "stats.resourcesCount": increment(1),
    "stats.lastActivity": Timestamp.now()
  })
}

export const updateGroupSettings = async (
  groupId: string,
  settings: Partial<StudyGroup["settings"]>
) => {
  const groupRef = doc(db, "studyGroups", groupId)
  await updateDoc(groupRef, {
    settings: {
      ...settings
    }
  })
}

// Achievement Functions
export const updateUserPoints = async (userId: string, points: number) => {
  const userRef = doc(db, "users", userId)
  const userDoc = await getDoc(userRef)
  
  if (userDoc.exists()) {
    const currentPoints = userDoc.data().points
    const newPoints = currentPoints + points
    const newLevel = Math.floor(newPoints / 100) + 1 // Level up every 100 points
    
    await updateDoc(userRef, {
      points: newPoints,
      level: newLevel
    })
  }
}

export const addAchievement = async (
  userId: string,
  achievement: {
    name: string
    description: string
    points: number
  }
) => {
  const userRef = doc(db, "users", userId)
  const achievementId = doc(collection(db, "achievements")).id
  
  await updateDoc(userRef, {
    achievements: arrayUnion({
      ...achievement,
      id: achievementId,
      earnedAt: Timestamp.now()
    })
  })
} 