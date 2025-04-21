"use client"

import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"
import { Navigation } from "@/components/navigation"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Navigation />
      <main className="min-h-screen bg-background">
        {children}
      </main>
      <Toaster />
    </AuthProvider>
  )
} 