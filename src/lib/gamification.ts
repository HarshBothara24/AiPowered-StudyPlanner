import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, increment, setDoc } from "firebase/firestore"
import { BADGES } from "@/constants/badges"

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  requirement: string
}

export interface UserStats {
  totalPoints: number
  completedTasks: number
  currentStreak: number
  longestStreak: number
  lastActiveDate: string
  level: number
  badges: string[]
  completedTaskIds: string[]
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
      lastActiveDate: ''
    }
    await setDoc(statsRef, initialStats)
    return initialStats
  }

  return statsDoc.data() as UserStats
}

export interface ProgressUpdateResult {
  pointsEarned: number
  newBadges: Badge[]
}

export async function updateUserProgress(userId: string, taskId: string): Promise<{ points: number; badges: Badge[] }> {
  const statsRef = doc(db, "userStats", userId)
  const statsDoc = await getDoc(statsRef)
  
  // Initialize default stats with empty arrays for badges and completedTaskIds
  const defaultStats: UserStats = {
    totalPoints: 0,
    completedTasks: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    level: 1,
    badges: [],
    completedTaskIds: []
  }

  // Get existing stats or use default stats
  const stats: UserStats = statsDoc.exists() ? 
    { ...defaultStats, ...statsDoc.data() as UserStats } : 
    defaultStats

  // Ensure completedTaskIds exists
  if (!stats.completedTaskIds) {
    stats.completedTaskIds = []
  }

  // Check if task was already completed
  if (stats.completedTaskIds.includes(taskId)) {
    return { points: 0, badges: [] }
  }

  // Calculate new stats
  const today = new Date().toISOString().split('T')[0]
  const lastActive = new Date(stats.lastActiveDate)
  const currentDate = new Date(today)
  const dayDiff = Math.floor((currentDate.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))

  // Update streak
  if (dayDiff === 1) {
    stats.currentStreak++
    if (stats.currentStreak > stats.longestStreak) {
      stats.longestStreak = stats.currentStreak
    }
  } else if (dayDiff > 1) {
    stats.currentStreak = 1
  }

  // Award points and update completed tasks
  const points = 10
  stats.totalPoints += points
  stats.completedTasks++
  stats.lastActiveDate = today
  stats.completedTaskIds.push(taskId)

  // Check for new badges
  const newBadges: Badge[] = []
  for (const badge of BADGES) {
    if (!stats.badges.includes(badge.id)) {
      if (checkBadgeRequirement(badge, stats)) {
        stats.badges.push(badge.id)
        newBadges.push(badge)
      }
    }
  }

  // Update level based on points
  const newLevel = Math.floor(stats.totalPoints / POINTS_PER_LEVEL) + 1
  if (newLevel > stats.level) {
    stats.level = newLevel
  }

  // Update Firestore
  if (statsDoc.exists()) {
    await updateDoc(statsRef, {
      totalPoints: stats.totalPoints,
      completedTasks: stats.completedTasks,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      lastActiveDate: stats.lastActiveDate,
      level: stats.level,
      badges: stats.badges,
      completedTaskIds: stats.completedTaskIds
    })
  } else {
    await setDoc(statsRef, stats)
  }

  return { points, badges: newBadges }
}

function checkBadgeRequirement(badge: Badge, stats: UserStats): boolean {
  switch (badge.requirement) {
    case "first_step":
      return stats.completedTasks >= 1
    case "consistent_learner":
      return stats.currentStreak >= 3
    case "streak_master":
      return stats.currentStreak >= 7
    case "century_club":
      return stats.totalPoints >= 100
    case "task_master":
      return stats.completedTasks >= 10
    default:
      return false
  }
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