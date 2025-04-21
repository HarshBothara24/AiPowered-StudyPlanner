"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Board } from "@/types/board"
import Link from "next/link"

export default function BoardsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [newBoard, setNewBoard] = useState({
    title: "",
    description: ""
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    if (!user) return

    const fetchBoards = async () => {
      try {
        const boardsQuery = query(
          collection(db, "boards"),
          where("members", "array-contains", user.uid)
        )
        const snapshot = await getDocs(boardsQuery)
        const boardsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Board[]
        setBoards(boardsData)
      } catch (error) {
        console.error("Error fetching boards:", error)
        toast({
          title: "Error",
          description: "Failed to load boards",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBoards()
  }, [user, toast])

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const boardData = {
        ...newBoard,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        members: [user.uid],
        tasks: []
      }

      const docRef = await addDoc(collection(db, "boards"), boardData)
      const newBoardWithId = {
        id: docRef.id,
        ...boardData,
        createdAt: new Date().toISOString()
      } as Board

      setBoards(prev => [...prev, newBoardWithId])
      setNewBoard({ title: "", description: "" })
      setIsDialogOpen(false)
      toast({
        title: "Success",
        description: "Board created successfully"
      })
    } catch (error) {
      console.error("Error creating board:", error)
      toast({
        title: "Error",
        description: "Failed to create board",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Task Boards</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create New Board</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Board</DialogTitle>
              <DialogDescription>
                Create a new board to manage tasks for your group project.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateBoard}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">Title</label>
                  <Input
                    id="title"
                    value={newBoard.title}
                    onChange={e => setNewBoard(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter board title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">Description</label>
                  <Textarea
                    id="description"
                    value={newBoard.description}
                    onChange={e => setNewBoard(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter board description"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Board</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {boards.map(board => (
          <Link key={board.id} href={`/boards/${board.id}`}>
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>{board.title}</CardTitle>
                <CardDescription>{board.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {board.tasks.length} tasks • {board.members.length} members
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {boards.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">No boards yet</h3>
          <p className="text-muted-foreground">Create a new board to get started</p>
        </div>
      )}
    </div>
  )
} 