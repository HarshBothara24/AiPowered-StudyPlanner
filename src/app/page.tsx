import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          AI-Powered Study Planner
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Optimize your learning journey with intelligent scheduling, progress tracking, and collaborative features.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-6xl mx-auto">
        <div className="p-6 rounded-lg border bg-card">
          <h3 className="text-xl font-semibold mb-2">AI-Powered Scheduling</h3>
          <p className="text-muted-foreground">
            Get personalized study schedules optimized for your goals and availability.
          </p>
        </div>
        <div className="p-6 rounded-lg border bg-card">
          <h3 className="text-xl font-semibold mb-2">Progress Tracking</h3>
          <p className="text-muted-foreground">
            Visualize your progress with detailed analytics and insights.
          </p>
        </div>
        <div className="p-6 rounded-lg border bg-card">
          <h3 className="text-xl font-semibold mb-2">Collaborative Learning</h3>
          <p className="text-muted-foreground">
            Join study groups, share resources, and learn together.
          </p>
        </div>
      </div>
    </div>
  )
}
