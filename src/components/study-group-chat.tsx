"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, onSnapshot, Timestamp } from "firebase/firestore"
import { addGroupMessage } from "@/lib/firebase"

interface Message {
  userId: string
  message: string
  timestamp: Timestamp
}

interface StudyGroupChatProps {
  groupId: string
}

export function StudyGroupChat({ groupId }: StudyGroupChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const { user } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const groupRef = doc(db, "studyGroups", groupId)
    const unsubscribe = onSnapshot(groupRef, (doc) => {
      if (doc.exists()) {
        const groupData = doc.data()
        setMessages(groupData.chat || [])
      }
    })

    return () => unsubscribe()
  }, [groupId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    try {
      await addGroupMessage(groupId, {
        userId: user.uid,
        message: newMessage.trim(),
        type: "text"
      })
      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.userId === user?.uid ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs rounded-lg px-4 py-2 ${
                message.userId === user?.uid
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="text-sm">{message.message}</p>
              <p className="text-xs opacity-75 mt-1">
                {new Date(message.timestamp.toDate()).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
} 