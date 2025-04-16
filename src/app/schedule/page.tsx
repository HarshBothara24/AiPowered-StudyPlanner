import { Button } from "@/components/ui/button"

export default function Schedule() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Create Study Schedule</h2>
            
            <form className="space-y-6">
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  id="subject"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  placeholder="e.g., Mathematics, Physics"
                />
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                  Study Duration (hours)
                </label>
                <input
                  type="number"
                  name="duration"
                  id="duration"
                  min="1"
                  max="8"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  placeholder="e.g., 2"
                />
              </div>

              <div>
                <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
                  Deadline
                </label>
                <input
                  type="date"
                  name="deadline"
                  id="deadline"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="preferences" className="block text-sm font-medium text-gray-700">
                  Study Preferences
                </label>
                <textarea
                  id="preferences"
                  name="preferences"
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  placeholder="e.g., I prefer morning study sessions, need breaks every 45 minutes"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="bg-primary text-white">
                  Generate Schedule
                </Button>
              </div>
            </form>

            {/* Schedule Preview Section */}
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900">Generated Schedule</h3>
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <p className="text-gray-500">Your AI-generated schedule will appear here...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 