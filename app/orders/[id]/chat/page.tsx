"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { OrderChat } from "@/components/order-chat"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function OrderChatPage() {
  const params = useParams()
  const orderId = params.id as string
  const [order, setOrder] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (orderId) {
      Promise.all([fetchOrder(), getCurrentUser()]).finally(() => {
        setLoading(false)
      })
    }
  }, [orderId])

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          token: tokens (name, symbol, network, wallet_address),
          buyer:users!user_id(username, email),
          seller:users(username, email)
        `,
        )
        .eq("id", orderId)
        .single()

      if (error) throw error
      setOrder(data)
    } catch (error: any) {
      console.error("Error fetching order:", error)
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      })
    }
  }

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) throw error

      if (user) {
        // Get user profile to check if admin
        const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

        setCurrentUser({ ...user, profile })
      }
    } catch (error: any) {
      console.error("Error getting user:", error)
      toast({
        title: "Authentication Error",
        description: "Please sign in to view this page",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-sm text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!order || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700">
            {!order ? "Order not found or you don't have permission to view it." : "Please sign in to view this page."}
          </p>
        </div>
      </div>
    )
  }

  // Determine if the current user is the buyer, seller, or admin
  const isBuyer = order.user_id === currentUser.id && order.type === "buy"
  const isSeller = order.user_id === currentUser.id && order.type === "sell"
  const isAdmin = currentUser.profile?.is_admin

  // Format order data for the OrderChat component
  const orderData = {
    productName: `${order.token.name} (${order.token.symbol})`,
    buyerName: order.buyer?.username || order.buyer?.email || "Unknown Buyer",
    sellerName: order.seller?.username || order.seller?.email || "Unknown Seller",
    date: new Date(order.created_at).toLocaleDateString(),
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden h-[calc(100vh-3rem)]">
          <OrderChat
            orderId={orderId}
            orderNumber={`${order.token.symbol}-${orderId.substring(0, 6)}`}
            currentUserId={currentUser.id}
            isAdmin={isAdmin}
            orderData={orderData}
          />
        </div>
      </div>
    </div>
  )
}
