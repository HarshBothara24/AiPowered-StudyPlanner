"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Board } from "@/types/board"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function BoardsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [myBoards, setMyBoards] = useState<Board[]>([])
  const [discoverableBoards, setDiscoverableBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [newBoard, setNewBoard] = useState({
    title: "",
    description: "",
    isPublic: true
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    if (!user) return

    const fetchBoards = async () => {
      try {
        // Fetch boards the user is a member of
        const myBoardsQuery = query(
          collection(db, "boards"),
          where("members", "array-contains", user.uid)
        )
        const myBoardsSnapshot = await getDocs(myBoardsQuery)
        const myBoardsData = myBoardsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Board[]
        setMyBoards(myBoardsData)
        
        // Fetch public boards the user is not a member of
        const publicBoardsQuery = query(
          collection(db, "boards"),
          where("isPublic", "==", true)
        )
        const publicBoardsSnapshot = await getDocs(publicBoardsQuery)
        const publicBoardsData = publicBoardsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Board[]
          
        // Filter out boards the user is already a member of
        const discoverableData = publicBoardsData.filter(
          board => !board.members.includes(user.uid)
        )
        setDiscoverableBoards(discoverableData)
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

      setMyBoards(prev => [...prev, newBoardWithId])
      setNewBoard({ title: "", description: "", isPublic: true })
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

  const handleJoinBoard = async (boardId: string) => {
    if (!user) return

    try {
      // Update the board to add the user as a member
      await updateDoc(doc(db, "boards", boardId), {
        members: arrayUnion(user.uid)
      })

      // Find the board from discoverable boards
      const boardToJoin = discoverableBoards.find(board => board.id === boardId)
      if (!boardToJoin) return

      // Add the board to myBoards and remove from discoverable
      setMyBoards(prev => [...prev, boardToJoin])
      setDiscoverableBoards(prev => prev.filter(board => board.id !== boardId))

      toast({
        title: "Success",
        description: "You have joined the board successfully"
      })
    } catch (error) {
      console.error("Error joining board:", error)
      toast({
        title: "Error",
        description: "Failed to join the board",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
                  <div className="flex items-center space-x-2">
                    <Input
                      type="checkbox"
                      id="isPublic"
                      checked={newBoard.isPublic}
                      onChange={e => setNewBoard(prev => ({ ...prev, isPublic: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <label htmlFor="isPublic" className="text-sm font-medium">
                      Make this board discoverable to other users
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create Board</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="my-boards" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="my-boards">My Boards</TabsTrigger>
            <TabsTrigger value="discover">Discover Boards</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-boards">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myBoards.map(board => (
                <Link key={board.id} href={`/boards/${board.id}`}>
                  <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                    <CardHeader>
                      <CardTitle>{board.title}</CardTitle>
                      <CardDescription>{board.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        {board.tasks?.length || 0} tasks • {board.members.length} members
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {myBoards.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium">No boards yet</h3>
                <p className="text-muted-foreground">Create a new board to get started</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="discover">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {discoverableBoards.map(board => (
                <Card key={board.id} className="h-full">
                  <CardHeader>
                    <CardTitle>{board.title}</CardTitle>
                    <CardDescription>{board.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {board.tasks?.length || 0} tasks • {board.members.length} members
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        handleJoinBoard(board.id);
                      }}
                      className="w-full"
                    >
                      Join Board
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {discoverableBoards.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium">No discoverable boards</h3>
                <p className="text-muted-foreground">All public boards are already on your list, or no other public boards exist</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}