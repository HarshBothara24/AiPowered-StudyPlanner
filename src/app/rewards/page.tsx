"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, doc, getDoc, orderBy, limit, getDocs } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Crown, Star, Target, Medal } from "lucide-react"
import { getAvailableBadges } from "@/lib/gamification"
import type { Badge } from "@/lib/gamification"

interface UserStats {
  totalPoints: number
  currentStreak: number
  longestStreak: number
  completedTasks: number
  badges: {
    id: string
    unlockedAt: string
  }[]
  level: number
  nextLevelPoints: number
}

interface LeaderboardUser {
  uid: string
  displayName: string
  totalPoints: number
  badges: number
  level: number
  rank: number
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

export default function RewardsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch user stats
        const statsRef = doc(db, "userStats", user.uid)
        const statsDoc = await getDoc(statsRef)
        
        if (statsDoc.exists()) {
          setStats(statsDoc.data() as UserStats)
        } else {
          setStats({
            totalPoints: 0,
            currentStreak: 0,
            longestStreak: 0,
            completedTasks: 0,
            badges: [],
            level: 1,
            nextLevelPoints: 100
          })
        }

        // Fetch leaderboard
        const usersRef = collection(db, "userStats")
        const q = query(usersRef, orderBy("totalPoints", "desc"), limit(10))
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const leaderboardData: LeaderboardUser[] = []
          let currentRank = 1
          let currentUserFound = false

          snapshot.forEach((doc) => {
            const userData = doc.data()
            if (userData.displayName) {
              const leaderboardUser: LeaderboardUser = {
                uid: doc.id,
                displayName: userData.displayName,
                totalPoints: userData.totalPoints || 0,
                badges: userData.badges?.length || 0,
                level: userData.level || 1,
                rank: currentRank
              }
              
              leaderboardData.push(leaderboardUser)
              
              if (doc.id === user.uid) {
                setUserRank(currentRank)
                currentUserFound = true
              }
              
              currentRank++
            }
          })

          setLeaderboard(leaderboardData)

          if (!currentUserFound) {
            const userStatsRef = doc(db, "userStats", user.uid)
            getDoc(userStatsRef).then((doc) => {
              if (doc.exists()) {
                const userData = doc.data()
                const userPoints = userData.totalPoints || 0
                
                const rankQuery = query(
                  usersRef,
                  where("totalPoints", ">", userPoints)
                )
                getDocs(rankQuery).then((snapshot) => {
                  setUserRank(snapshot.size + 1)
                })
              }
            })
          }
        })

        setLoading(false)
        return () => unsubscribe()
      } catch (error) {
        console.error("Error fetching data:", error)
        setLoading(false)
      }
    }

    fetchData()
  }, [user, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-foreground">Loading rewards...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const earnedBadges = stats?.badges.map(badge => 
    BADGES.find(b => b.id === badge.id)
  ).filter(Boolean) as Badge[]

  const unearnedBadges = BADGES.filter(badge => 
    !stats?.badges.some(b => b.id === badge.id)
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-foreground mb-8">Rewards & Achievements</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Your Progress</CardTitle>
                <CardDescription>Track your achievements and level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Level {stats?.level}</span>
                      <span className="text-sm text-muted-foreground">
                        {stats?.totalPoints} / {stats?.nextLevelPoints} points
                      </span>
                    </div>
                    <Progress
                      value={(stats?.totalPoints || 0) / (stats?.nextLevelPoints || 100) * 100}
                      className="h-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Current Streak</p>
                      <p className="text-2xl font-bold">{stats?.currentStreak} days</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Longest Streak</p>
                      <p className="text-2xl font-bold">{stats?.longestStreak} days</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Global Leaderboard</CardTitle>
                <CardDescription>Top performers in the study community</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userRank && (
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Your Rank</span>
                          <Crown className="w-4 h-4 text-yellow-500" />
                        </div>
                        <span className="text-lg font-bold">#{userRank}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {leaderboard.map((user) => (
                      <div
                        key={user.uid}
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          user.uid === user?.uid ? 'bg-primary/10' : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/20">
                            <span className="font-bold">{user.rank}</span>
                          </div>
                          <div>
                            <div className="font-medium">{user.displayName}</div>
                            <div className="text-sm text-muted-foreground">
                              Level {user.level} • {user.badges} badges
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{user.totalPoints} pts</div>
                          <Progress
                            value={(user.totalPoints / (user.level * 100)) * 100}
                            className="w-24 h-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="earned" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="earned">Earned Badges</TabsTrigger>
              <TabsTrigger value="available">Available Badges</TabsTrigger>
            </TabsList>

            <TabsContent value="earned" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {earnedBadges.map((badge) => (
                  <Card key={badge.id}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{badge.icon}</span>
                        <CardTitle>{badge.name}</CardTitle>
                      </div>
                      <CardDescription>{badge.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span>Earned</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {earnedBadges.length === 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">
                        Complete study sessions to earn badges!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="available" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {unearnedBadges.map((badge) => (
                  <Card key={badge.id}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{badge.icon}</span>
                        <CardTitle>{badge.name}</CardTitle>
                      </div>
                      <CardDescription>{badge.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Target className="w-4 h-4" />
                          <span>
                            {badge.requirement.type === "points" && `Earn ${badge.requirement.value} points`}
                            {badge.requirement.type === "streak" && `Maintain a ${badge.requirement.value}-day streak`}
                            {badge.requirement.type === "tasks" && `Complete ${badge.requirement.value} tasks`}
                          </span>
                        </div>
                        <Progress
                          value={
                            badge.requirement.type === "points" ? (stats?.totalPoints || 0) / badge.requirement.value * 100 :
                            badge.requirement.type === "streak" ? (stats?.currentStreak || 0) / badge.requirement.value * 100 :
                            (stats?.completedTasks || 0) / badge.requirement.value * 100
                          }
                          className="h-2"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}