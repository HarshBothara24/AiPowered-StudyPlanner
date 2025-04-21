import { Badge } from "@/lib/gamification"

export const BADGES: Badge[] = [
  {
    id: "first-task",
    name: "First Step",
    description: "Complete your first study task",
    icon: "🎯",
    requirement: "first_step"
  },
  {
    id: "streak-3",
    name: "Consistent Learner",
    description: "Maintain a 3-day study streak",
    icon: "🔥",
    requirement: "consistent_learner"
  },
  {
    id: "streak-7",
    name: "Week Warrior",
    description: "Maintain a 7-day study streak",
    icon: "📅",
    requirement: "streak_master"
  },
  {
    id: "points-100",
    name: "Century Club",
    description: "Earn 100 points",
    icon: "💯",
    requirement: "century_club"
  },
  {
    id: "points-500",
    name: "High Achiever",
    description: "Earn 500 points",
    icon: "🏆",
    requirement: "task_master"
  },
  {
    id: "tasks-10",
    name: "Dedicated Student",
    description: "Complete 10 study tasks",
    icon: "📚",
    requirement: "task_master"
  },
  {
    id: "tasks-50",
    name: "Study Master",
    description: "Complete 50 study tasks",
    icon: "🎓",
    requirement: "task_master"
  }
] 