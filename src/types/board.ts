export interface BoardTask {
  id: string
  title: string
  description: string
  status: 'todo' | 'in-progress' | 'completed'
  assignedTo: string[]
  createdBy: string
  createdAt: string
  dueDate?: string
  priority: 'low' | 'medium' | 'high'
}

export interface Board {
  id: string
  title: string
  description: string
  members: string[]
  createdBy: string
  createdAt: string
  tasks: BoardTask[]
} 