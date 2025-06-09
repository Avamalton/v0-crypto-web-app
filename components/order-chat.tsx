"use client"

import type React from "react"

import { useEffect, useState, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Send, MessageCircle, User, Shield, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

interface OrderChatProps {
  orderId: string
  orderNumber?: string
  currentUserId?: string
  isAdmin?: boolean
  orderData?: {
    productName: string
    buyerName: string
    sellerName: string
    date: string
  }
}

interface ChatMessage {
  id: string
  message: string
  is_admin: boolean
  attachment_url?: string
  attachment_type?: string
  created_at: string
  user_id: string
  users?: {
    id: string
    username?: string
    email: string
    is_admin: boolean
  }
}

export function OrderChat({ orderId, orderNumber, currentUserId, isAdmin = false, orderData }: OrderChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const subscriptionRef = useRef<any>(null)
  const initializedRef = useRef(false)
  const { toast } = useToast()

  // Fetch messages with error handling
  const fetchMessages = useCallback(async () => {
    if (!orderId) return

    try {
      const { data, error } = await supabase
        .from("order_chats")
        .select(`
          *,
          users (id, username, email, is_admin)
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Fetch messages error:", error)
        setError("Failed to load messages")
        return
      }

      setMessages(data || [])
    } catch (error) {
      console.error("Error fetching messages:", error)
      setError("Failed to load messages")
    } finally {
      setLoading(false)
    }
  }, [orderId])

  // Subscribe to messages with error handling
  const subscribeToMessages = useCallback(() => {
    if (!orderId) return

    try {
      // Clean up existing subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }

      const subscription = supabase
        .channel(`order_chat_${orderId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "order_chats",
            filter: `order_id=eq.${orderId}`,
          },
          (payload) => {
            // When a new message is received, update the messages state
            // Only fetch if the message is from another user to avoid duplicates
            if (payload.new && payload.new.user_id !== currentUserId) {
              fetchMessages()
            }
          },
        )
        .subscribe()

      subscriptionRef.current = subscription
    } catch (error) {
      console.error("Error setting up subscription:", error)
    }
  }, [orderId, fetchMessages, currentUserId])

  // Initialize component - FIXED to prevent infinite loops
  useEffect(() => {
    // Use a ref to prevent duplicate initialization
    if (initializedRef.current) return
    initializedRef.current = true

    fetchMessages()
    subscribeToMessages()

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [fetchMessages, subscribeToMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    } catch (error) {
      console.error("Scroll error:", error)
    }
  }

  const sendMessage = async (attachmentUrl?: string, attachmentType?: string) => {
    if ((!newMessage.trim() && !attachmentUrl) || !currentUserId) return

    setSending(true)
    try {
      // Create the message object
      const messageToSend = {
        order_id: orderId,
        user_id: currentUserId,
        message: newMessage.trim() || "Sent an attachment",
        is_admin: isAdmin,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
      }

      // Add optimistic update - add the message to the UI immediately
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        ...messageToSend,
        created_at: new Date().toISOString(),
        users: {
          id: currentUserId,
          email: "current-user@example.com", // This will be replaced when we fetch
          is_admin: isAdmin,
        },
      }

      // Update the UI immediately
      setMessages((prevMessages) => [...prevMessages, optimisticMessage])

      // Clear the input field
      setNewMessage("")

      // Send the message to the server
      const { data, error } = await supabase.from("order_chats").insert(messageToSend).select()

      if (error) throw error

      // Replace the optimistic message with the real one from the server
      if (data && data.length > 0) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === optimisticMessage.id ? { ...data[0], users: optimisticMessage.users } : msg,
          ),
        )
      }

      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
      })
    } catch (error: any) {
      console.error("Error sending message:", error)

      // Remove the optimistic message on error
      setMessages((prevMessages) => prevMessages.filter((msg) => !msg.id.toString().startsWith("temp-")))

      toast({
        title: "Failed to Send",
        description: error.message || "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${orderId}/${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage.from("chat-attachments").upload(fileName, file)

      if (error) throw error

      const {
        data: { publicUrl },
      } = supabase.storage.from("chat-attachments").getPublicUrl(fileName)

      const attachmentType = file.type.startsWith("image/") ? "image" : "document"
      await sendMessage(publicUrl, attachmentType)
    } catch (error: any) {
      console.error("Error uploading file:", error)
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      })
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch (error) {
      console.error("Date formatting error:", error)
      return "Invalid time"
    }
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full bg-white/80 backdrop-blur-sm rounded-lg">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <MessageCircle className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button
              onClick={() => {
                setError(null)
                setLoading(true)
                initializedRef.current = false
                fetchMessages()
                subscribeToMessages()
              }}
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white/80 backdrop-blur-sm rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-500 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Order Chat Room
            </h2>
            <p className="text-sm opacity-90">Direct conversation after successful payment</p>
          </div>
          {orderNumber && (
            <Badge variant="secondary" className="bg-white/20 text-white">
              #{orderNumber}
            </Badge>
          )}
        </div>
      </div>

      {/* Order Info Card */}
      {orderData && (
        <div className="bg-white/40 backdrop-blur-md p-4 border-b border-white/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-800">{orderData.productName}</h3>
              <p className="text-sm text-gray-600">Date: {orderData.date}</p>
            </div>
            <div className="flex flex-col md:items-end">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-purple-700">Buyer:</span>
                <span className="text-sm bg-purple-100 px-2 py-1 rounded-full">{orderData.buyerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-700">Seller:</span>
                <span className="text-sm bg-blue-100 px-2 py-1 rounded-full">{orderData.sellerName}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-white/80 backdrop-blur-sm space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isCurrentUser = message.user_id === currentUserId
              const isAdminMessage = message.is_admin

              return (
                <div key={message.id} className={cn("flex", isCurrentUser ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm",
                      isCurrentUser
                        ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-tr-none"
                        : "bg-gradient-to-r from-blue-50 to-blue-100 text-gray-800 rounded-tl-none",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isAdminMessage ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      <span className="text-xs font-medium">
                        {message.users?.username || message.users?.email || "You"}
                        {isAdminMessage && " (Admin)"}
                      </span>
                    </div>

                    <p className="text-sm mb-1">{message.message}</p>

                    {message.attachment_url && (
                      <div className="mt-2">
                        {message.attachment_type === "image" ? (
                          <img
                            src={message.attachment_url || "/placeholder.svg"}
                            alt="Attachment"
                            className="max-w-full h-32 object-cover rounded cursor-pointer"
                            onClick={() => window.open(message.attachment_url, "_blank")}
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg?height=128&width=200"
                            }}
                          />
                        ) : (
                          <a
                            href={message.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "text-xs underline hover:no-underline",
                              isCurrentUser ? "text-blue-100" : "text-blue-600",
                            )}
                          >
                            📎 View Attachment
                          </a>
                        )}
                      </div>
                    )}

                    <p className={cn("text-xs mt-1 text-right", isCurrentUser ? "text-blue-100" : "text-gray-500")}>
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/80 backdrop-blur-sm border-t rounded-b-lg">
        <div className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            disabled={sending || uploadingFile || !currentUserId}
            className="flex-1 rounded-full"
          />

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile || sending || !currentUserId}
            className="rounded-full"
          >
            {uploadingFile ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </Button>

          <Button
            onClick={() => sendMessage()}
            disabled={!newMessage.trim() || sending || uploadingFile || !currentUserId}
            className="rounded-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-2 text-center">
          Press Enter to send • Shift+Enter for new line • Click 📎 to attach files
        </p>
      </div>
    </div>
  )
}
