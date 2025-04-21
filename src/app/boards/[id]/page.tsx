"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Board, BoardTask } from "@/types/board"
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd"
import { Edit, ArrowRight } from "lucide-react"

export default function BoardPage() {
  const { user } = useAuth()
  const { id } = useParams()
  const { toast } = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    dueDate: string;
  }>({
    title: "",
    description: "",
    priority: "medium",
    dueDate: ""
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    if (!user || !id) return

    const fetchBoard = async () => {
      try {
        const boardDoc = await getDoc(doc(db, "boards", id as string))
        if (boardDoc.exists()) {
          setBoard({ id: boardDoc.id, ...boardDoc.data() } as Board)
        }
      } catch (error) {
        console.error("Error fetching board:", error)
        toast({
          title: "Error",
          description: "Failed to load board",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBoard()
  }, [user, id, toast])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !board) return

    try {
      const task: BoardTask = {
        id: crypto.randomUUID(),
        ...newTask,
        status: "todo",
        assignedTo: [user.uid],
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      }

      const updatedTasks = [...board.tasks, task]
      await updateDoc(doc(db, "boards", board.id), {
        tasks: updatedTasks
      })

      setBoard(prev => prev ? { ...prev, tasks: updatedTasks as BoardTask[] } : null)
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        dueDate: ""
      })
      setIsDialogOpen(false)
      toast({
        title: "Success",
        description: "Task created successfully"
      })
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive"
      })
    }
  }

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !board) return

    const tasks = Array.from(board.tasks)
    const [reorderedTask] = tasks.splice(result.source.index, 1)
    reorderedTask.status = result.destination.droppableId as "todo" | "in-progress" | "completed"
    tasks.splice(result.destination.index, 0, reorderedTask)

    try {
      await updateDoc(doc(db, "boards", board.id), { tasks })
      setBoard(prev => prev ? { ...prev, tasks: tasks.map(task => ({ ...task, status: task.status as "todo" | "in-progress" | "completed" })) } : null)
    } catch (error) {
      console.error("Error updating task status:", error)
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      })
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (!board) return
    
    const updatedTasks = board.tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, status: newStatus }
      }
      return task
    })
    
    try {
      await updateDoc(doc(db, "boards", board.id), { tasks: updatedTasks })
      setBoard(prev => prev ? { ...prev, tasks: updatedTasks.map(task => ({ ...task, status: task.status as "todo" | "in-progress" | "completed" })) } : null)
      toast({
        title: "Success",
        description: `Task moved to ${newStatus.replace("-", " ")}`
      })
    } catch (error) {
      console.error("Error updating task status:", error)
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">Loading...</div>
  }

  if (!board) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">Board not found</div>
  }

  const columns = {
    todo: board.tasks.filter(task => task.status === "todo"),
    "in-progress": board.tasks.filter(task => task.status === "in-progress"),
    completed: board.tasks.filter(task => task.status === "completed")
  }

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "todo":
        return "in-progress"
      case "in-progress":
        return "completed"
      default:
        return currentStatus
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">{board.title}</h1>
            <p className="text-muted-foreground">{board.description}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
                <DialogDescription>
                  Create a new task for this board.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTask}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="title" className="text-sm font-medium">Title</label>
                    <Input
                      id="title"
                      value={newTask.title}
                      onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter task title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium">Description</label>
                    <Textarea
                      id="description"
                      value={newTask.description}
                      onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter task description"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="priority" className="text-sm font-medium">Priority</label>
                      <Select
                        value={newTask.priority}
                        onValueChange={value => setNewTask(prev => ({ ...prev, priority: value as "low" | "medium" | "high" }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="dueDate" className="text-sm font-medium">Due Date</label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={newTask.dueDate}
                        onChange={e => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create Task</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(columns).map(([status, tasks]) => (
              <div key={status} className="space-y-4">
                <h2 className="text-lg font-semibold capitalize">
                  {status.replace("-", " ")} ({tasks.length})
                </h2>
                <Droppable droppableId={status}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-4 min-h-[200px]"
                    >
                      {tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-card"
                            >
                              <CardHeader>
                                <CardTitle className="text-base">{task.title}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    task.priority === "high" ? "bg-red-500/10 text-red-500" :
                                    task.priority === "medium" ? "bg-yellow-500/10 text-yellow-500" :
                                    "bg-green-500/10 text-green-500"
                                  }`}>
                                    {task.priority}
                                  </span>
                                  {task.dueDate && (
                                    <span className="text-muted-foreground">
                                      Due: {new Date(task.dueDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </CardContent>
                              <CardFooter className="pt-2 border-t flex justify-between">
                                <div className="text-xs text-muted-foreground">
                                  Created: {new Date(task.createdAt).toLocaleDateString()}
                                </div>
                                {task.status !== "completed" && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-xs flex items-center gap-1"
                                    onClick={() => handleStatusChange(task.id, getNextStatus(task.status))}
                                  >
                                    Move to {getNextStatus(task.status).replace("-", " ")}
                                    <ArrowRight className="h-3 w-3 ml-1" />
                                  </Button>
                                )}
                                {task.status === "completed" && (
                                  <Select
                                    value={task.status}
                                    onValueChange={(value) => handleStatusChange(task.id, value)}
                                  >
                                    <SelectTrigger className="h-8 text-xs w-40">
                                      <SelectValue placeholder="Change status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="todo">Todo</SelectItem>
                                      <SelectItem value="in-progress">In Progress</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </CardFooter>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  )
}