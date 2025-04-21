"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

export function Navigation() {
  const { user } = useAuth()
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="border-b bg-background">
      <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
        <Link href="/" className="font-semibold text-lg">
          Study Planner
        </Link>
        {user && (
          <div className="ml-6 flex gap-4">
            <Link
              href="/dashboard"
              className={`text-sm ${isActive("/dashboard") ? "text-primary font-medium" : "text-muted-foreground"}`}
            >
              Dashboard
            </Link>
            <Link
              href="/schedule"
              className={`text-sm ${isActive("/schedule") ? "text-primary font-medium" : "text-muted-foreground"}`}
            >
              Schedule
            </Link>
            <Link
              href="/groups"
              className={`text-sm ${isActive("/groups") ? "text-primary font-medium" : "text-muted-foreground"}`}
            >
              Study Groups
            </Link>
            <Link
              href="/analytics"
              className={`text-sm ${isActive("/analytics") ? "text-primary font-medium" : "text-muted-foreground"}`}
            >
              Analytics
            </Link>
            <Link
              href="/rewards"
              className={`text-sm ${isActive("/rewards") ? "text-primary font-medium" : "text-muted-foreground"}`}
            >
              Rewards
            </Link>
            <Link
              href="/boards"
              className={`text-sm ${isActive("/boards") ? "text-primary font-medium" : "text-muted-foreground"}`}
            >
              Boards
            </Link>
          </div>
        )}
        <div className="ml-auto flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button
                variant="default"
                onClick={() => signOut(auth)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button variant="default">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
} 