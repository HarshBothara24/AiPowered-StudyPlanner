"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { createStudyGroup, joinStudyGroup } from "@/lib/firebase"
import { useRouter } from "next/navigation"

interface StudyGroup {
  id: string
  name: string
  description: string
  members: string[]
  admin: string
  subjects: string[]
  stats: {
    activeMembers: number
  }
}

export default function Groups() {
  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    maxMembers: 10,
    subjects: [] as string[]
  })
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      fetchGroups()
    }
  }, [user])

  const fetchGroups = async () => {
    try {
      const groupsRef = collection(db, "studyGroups")
      const q = query(groupsRef, where("settings.visibility", "==", "public"))
      const querySnapshot = await getDocs(q)
      const groupsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StudyGroup[]
      setGroups(groupsData)
    } catch (error) {
      console.error("Error fetching groups:", error)
      setError("Failed to load groups")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const newGroup = {
        name: formData.name,
        description: formData.description,
        members: [user.uid],
        admin: user.uid,
        subjects: formData.subjects,
        schedule: [],
        chat: [],
        resources: [],
        achievements: [],
        settings: {
          visibility: "public",
          joinRequests: true,
          maxMembers: formData.maxMembers,
          studyFocus: formData.subjects,
          difficultyLevel: "beginner"
        },
        stats: {
          totalStudyTime: 0,
          activeMembers: 1,
          resourcesCount: 0,
          lastActivity: new Date()
        }
      }

      const groupId = await createStudyGroup(newGroup)
      router.push(`/groups/${groupId}`)
    } catch (error) {
      console.error("Error creating group:", error)
      setError("Failed to create group")
    }
  }

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return

    try {
      const groupRef = doc(db, "studyGroups", groupId)
      const groupDoc = await getDoc(groupRef)
      
      if (groupDoc.exists()) {
        const groupData = groupDoc.data()
        if (groupData.members.length >= groupData.settings.maxMembers) {
          setError("Group is full")
          return
        }
        
        await joinStudyGroup(groupId, user.uid)
        router.push(`/groups/${groupId}`)
      }
    } catch (error) {
      console.error("Error joining group:", error)
      setError("Failed to join group")
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Study Groups</h2>
            <Button onClick={() => document.getElementById("create-group-modal")?.showModal()}>
              Create New Group
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md">
              {error}
            </div>
          )}

          {/* Active Groups */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div key={group.id} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-white font-bold">{group.name[0]}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{group.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{group.stats.activeMembers} members</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">{group.description}</p>
                  </div>
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-2">
                      {group.subjects.map((subject, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3">
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/groups/${group.id}`)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleJoinGroup(group.id)}
                      disabled={group.members.includes(user?.uid || "")}
                    >
                      {group.members.includes(user?.uid || "") ? "Joined" : "Join Group"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Create New Group Modal */}
          <dialog id="create-group-modal" className="modal">
            <div className="modal-box bg-white dark:bg-gray-800">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New Study Group</h3>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Group Name
                  </label>
                  <input
                    type="text"
                    id="group-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter group name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Describe the purpose and focus of the group"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="subjects" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Subjects (comma-separated)
                  </label>
                  <input
                    type="text"
                    id="subjects"
                    value={formData.subjects.join(", ")}
                    onChange={(e) => setFormData({ ...formData, subjects: e.target.value.split(",").map(s => s.trim()) })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Mathematics, Physics, Chemistry"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="max-members" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Maximum Members
                  </label>
                  <input
                    type="number"
                    id="max-members"
                    value={formData.maxMembers}
                    onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
                    min="2"
                    max="20"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("create-group-modal")?.close()}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Group</Button>
                </div>
              </form>
            </div>
          </dialog>
        </div>
      </div>
    </div>
  )
} 