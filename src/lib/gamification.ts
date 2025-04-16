import { db } from "./firebase"
import { doc, getDoc, updateDoc, increment, setDoc } from "firebase/firestore"

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  requirement: {
    type: "points" | "streak" | "tasks"
    value: number
  }
}

const BADGES: Badge[] = [
  {
    id: "first-task",
    name: "First Step",
    description: "Complete your first study task",
    icon: "🎯",
    requirement: { type: "tasks", value: 1 }
  },
  {
    id: "streak-3",
    name: "Consistent Learner",
    description: "Maintain a 3-day study streak",
    icon: "🔥",
    requirement: { type: "streak", value: 3 }
  },
  {
    id: "streak-7",
    name: "Week Warrior",
    description: "Maintain a 7-day study streak",
    icon: "📅",
    requirement: { type: "streak", value: 7 }
  },
  {
    id: "points-100",
    name: "Century Club",
    description: "Earn 100 points",
    icon: "💯",
    requirement: { type: "points", value: 100 }
  },
  {
    id: "points-500",
    name: "High Achiever",
    description: "Earn 500 points",
    icon: "🏆",
    requirement: { type: "points", value: 500 }
  },
  {
    id: "tasks-10",
    name: "Dedicated Student",
    description: "Complete 10 study tasks",
    icon: "📚",
    requirement: { type: "tasks", value: 10 }
  },
  {
    id: "tasks-50",
    name: "Study Master",
    description: "Complete 50 study tasks",
    icon: "🎓",
    requirement: { type: "tasks", value: 50 }
  }
]

export interface UserStats {
  totalPoints: number
  currentStreak: number
  longestStreak: number
  completedTasks: number
  completedTaskIds: string[]
  badges: {
    id: string
    unlockedAt: string
  }[]
  level: number
  nextLevelPoints: number
  lastStudyDate?: string
}

const POINTS_PER_TASK = 10
const STREAK_BONUS_MULTIPLIER = 0.5 // 50% bonus for maintaining streak
const POINTS_PER_LEVEL = 100

export async function initializeUserStats(userId: string) {
  const statsRef = doc(db, "userStats", userId)
  const statsDoc = await getDoc(statsRef)

  if (!statsDoc.exists()) {
    const initialStats: UserStats = {
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      completedTasks: 0,
      completedTaskIds: [],
      badges: [],
      level: 1,
      nextLevelPoints: POINTS_PER_LEVEL
    }
    await setDoc(statsRef, initialStats)
    return initialStats
  }

  return statsDoc.data() as UserStats
}

export async function updateUserProgress(userId: string, taskCompleted: boolean = true, taskId?: string) {
  const statsRef = doc(db, "userStats", userId)
  const statsDoc = await getDoc(statsRef)
  
  // Initialize stats if they don't exist
  let stats: UserStats
  if (!statsDoc.exists()) {
    stats = {
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      completedTasks: 0,
      completedTaskIds: [],
      badges: [],
      level: 1,
      nextLevelPoints: POINTS_PER_LEVEL,
      lastStudyDate: ''
    }
  } else {
    stats = statsDoc.data() as UserStats
  }
  
  const today = new Date().toISOString().split('T')[0]
  const lastStudyDate = stats.lastStudyDate || ''
  
  // Calculate streak
  let newStreak = stats.currentStreak
  if (taskCompleted) {
    if (lastStudyDate === today) {
      // Already studied today, streak continues
      newStreak = stats.currentStreak
    } else if (lastStudyDate === getPreviousDay(today)) {
      // Studied yesterday, streak continues
      newStreak = stats.currentStreak + 1
    } else {
      // Streak broken
      newStreak = 1
    }
  }

  // Update stats
  const updates: Partial<UserStats> = {
    currentStreak: newStreak,
    longestStreak: Math.max(stats.longestStreak, newStreak),
    lastStudyDate: today
  }

  // Only award points if this is a new task completion
  if (taskCompleted && taskId && !stats.completedTaskIds.includes(taskId)) {
    const basePoints = POINTS_PER_TASK
    const streakBonus = Math.floor(basePoints * (newStreak - 1) * STREAK_BONUS_MULTIPLIER)
    const totalPointsEarned = basePoints + streakBonus

    updates.totalPoints = stats.totalPoints + totalPointsEarned
    updates.completedTasks = stats.completedTasks + 1
    updates.completedTaskIds = [...stats.completedTaskIds, taskId]

    // Check level up
    if (updates.totalPoints >= stats.nextLevelPoints) {
      updates.level = stats.level + 1
      updates.nextLevelPoints = stats.nextLevelPoints + POINTS_PER_LEVEL
    }

    // Check for new badges
    const newBadges = await checkForNewBadges(userId, {
      ...stats,
      ...updates
    })

    if (newBadges.length > 0) {
      updates.badges = [
        ...stats.badges,
        ...newBadges.map(badge => ({
          id: badge.id,
          unlockedAt: new Date().toISOString()
        }))
      ]
    }

    // If stats don't exist, create them, otherwise update
    if (!statsDoc.exists()) {
      await setDoc(statsRef, {
        ...stats,
        ...updates
      })
    } else {
      await updateDoc(statsRef, updates)
    }

    return {
      ...stats,
      ...updates,
      pointsEarned: totalPointsEarned,
      newBadges
    }
  } else {
    // If stats don't exist, create them, otherwise update
    if (!statsDoc.exists()) {
      await setDoc(statsRef, {
        ...stats,
        ...updates
      })
    } else {
      await updateDoc(statsRef, updates)
    }

    return {
      ...stats,
      ...updates,
      pointsEarned: 0,
      newBadges: []
    }
  }
}

async function checkForNewBadges(userId: string, stats: UserStats): Promise<Badge[]> {
  const earnedBadgeIds = new Set(stats.badges.map(b => b.id))
  const newBadges: Badge[] = []

  for (const badge of BADGES) {
    if (earnedBadgeIds.has(badge.id)) continue

    const requirement = badge.requirement
    let earned = false

    switch (requirement.type) {
      case "points":
        earned = stats.totalPoints >= requirement.value
        break
      case "streak":
        earned = stats.currentStreak >= requirement.value
        break
      case "tasks":
        earned = stats.completedTasks >= requirement.value
        break
    }

    if (earned) {
      newBadges.push(badge)
    }
  }

  return newBadges
}

function getPreviousDay(dateString: string): string {
  const date = new Date(dateString)
  date.setDate(date.getDate() - 1)
  return date.toISOString().split('T')[0]
}

export function getAvailableBadges(): Badge[] {
  return BADGES
}

export function calculateLevelProgress(points: number): {
  level: number
  progress: number
  nextLevelPoints: number
} {
  const level = Math.floor(points / POINTS_PER_LEVEL) + 1
  const nextLevelPoints = level * POINTS_PER_LEVEL
  const progress = ((points % POINTS_PER_LEVEL) / POINTS_PER_LEVEL) * 100

  return {
    level,
    progress,
    nextLevelPoints
  }
} 