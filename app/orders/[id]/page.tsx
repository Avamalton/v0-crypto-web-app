"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Copy, CheckCircle, Clock, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { PaymentProofUpload } from "@/components/payment-proof-upload"
import { OrderChat } from "@/components/order-chat"

export default function OrderDetailPage() {
  const { user, userProfile, loading } = useAuth()
  const [order, setOrder] = useState<any>(null)
  const [orderHistory, setOrderHistory] = useState<any[]>([])
  const [loadingOrder, setLoadingOrder] = useState(true)
  const [showPaymentUpload, setShowPaymentUpload] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()

  // Prevent infinite redirects
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  // Fetch order details with error handling
  const fetchOrderDetails = useCallback(async () => {
    if (!user || !params.id) return

    try {
      setLoadingOrder(true)
      setError(null)

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          tokens (name, symbol, network, wallet_address),
          users (username, email)
        `)
        .eq("id", params.id)
        .single()

      if (error) throw error

      // Check if user owns this order or is admin
      if (data.user_id !== user?.id && !userProfile?.is_admin) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this order.",
          variant: "destructive",
        })
        router.push("/orders")
        return
      }

      setOrder(data)

      // Show payment upload if order is pending and user hasn't uploaded proof yet
      if (
        data.type === "buy" &&
        data.status === "pending" &&
        !data.payment_proof_image_url &&
        data.user_id === user?.id
      ) {
        setShowPaymentUpload(true)
      } else {
        setShowPaymentUpload(false)
      }
    } catch (error: any) {
      console.error("Error fetching order:", error)
      setError("Failed to load order details. Please try again.")
      toast({
        title: "Error",
        description: "Failed to load order details.",
        variant: "destructive",
      })
    } finally {
      setLoadingOrder(false)
    }
  }, [user, userProfile, params.id, toast, router])

  // Fetch order history with error handling
  const fetchOrderHistory = useCallback(async () => {
    if (!user || !params.id) return

    try {
      const { data, error } = await supabase
        .from("order_history")
        .select(`
          *,
          users (username, email)
        `)
        .eq("order_id", params.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setOrderHistory(data || [])
    } catch (error) {
      console.error("Error fetching order history:", error)
      // Don't set error state here to avoid blocking the whole page
    }
  }, [user, params.id])

  // Initial data fetch
  useEffect(() => {
    if (user && params.id) {
      fetchOrderDetails()
      fetchOrderHistory()
    }
  }, [user, params.id, fetchOrderDetails, fetchOrderHistory, refreshKey])

  // Handle payment proof upload completion
  const handlePaymentProofUpload = useCallback(
    (imageUrl: string, description: string) => {
      setShowPaymentUpload(false)
      // Use refresh key to trigger a re-fetch instead of calling the functions directly
      setRefreshKey((prev) => prev + 1)

      toast({
        title: "Payment Confirmed",
        description: "Your payment proof has been submitted. You can now chat with admin about this order.",
      })
    },
    [toast],
  )

  const copyToClipboard = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text)
      toast({
        title: "Copied",
        description: "Copied to clipboard",
      })
    },
    [toast],
  )

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "pending":
        return "secondary"
      case "confirmed":
        return "outline"
      case "completed":
        return "default"
      case "failed":
        return "destructive"
      default:
        return "secondary"
    }
  }, [])

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "confirmed":
        return <CheckCircle className="h-4 w-4" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "failed":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }, [])

  // Loading state
  if (loading || loadingOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <div className="mt-4 flex justify-between">
              <Button variant="outline" onClick={() => setRefreshKey((prev) => prev + 1)}>
                Try Again
              </Button>
              <Button asChild>
                <Link href="/orders">Back to Orders</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No user or order
  if (!user || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Order Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The order you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button className="mt-4" asChild>
              <Link href="/orders">Back to Orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Prepare order data for chat component
  const orderData = {
    productName: `${order.tokens?.name || "Token"} (${order.tokens?.symbol || "---"})`,
    buyerName: order.users?.username || order.users?.email || "Unknown Buyer",
    sellerName: "Platform Admin",
    date: new Date(order.created_at).toLocaleDateString(),
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100">
      <div className="bg-white/80 backdrop-blur-sm shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/orders">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Order Information */}
            <div className="space-y-6">
              {/* Order Summary */}
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        {getStatusIcon(order.status)}
                        <span>Order {order.order_number || `#${order.id.substring(0, 8)}`}</span>
                      </CardTitle>
                      <CardDescription>
                        {order.type === "buy" ? "Buy" : "Sell"} {order.tokens?.symbol || "Unknown"} • Created on{" "}
                        {new Date(order.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-gray-900">Order Information</h3>
                        <div className="mt-2 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Token:</span>
                            <span>
                              {order.tokens?.name || "Unknown"} ({order.tokens?.symbol || "Unknown"})
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Network:</span>
                            <span>{order.tokens?.network || "Unknown"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Quantity:</span>
                            <span>
                              {order.quantity} {order.tokens?.symbol || "Unknown"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Exchange Rate:</span>
                            <span>Rp {order.exchange_rate?.toLocaleString()}</span>
                          </div>
                          {order.fees > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Fees:</span>
                              <span>Rp {order.fees.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium border-t pt-2">
                            <span>Total:</span>
                            <span>Rp {order.total_price?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-gray-900">Payment Information</h3>
                        <div className="mt-2 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Method:</span>
                            <span>{order.payment_method || "Not specified"}</span>
                          </div>
                          {order.admin_wallet_used && (
                            <div>
                              <span className="text-gray-600">Wallet Address:</span>
                              <div className="bg-gray-50 p-2 rounded mt-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-mono text-xs break-all">{order.admin_wallet_used}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(order.admin_wallet_used)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Proof Upload */}
              {showPaymentUpload && (
                <PaymentProofUpload
                  orderId={order.id}
                  onUploadComplete={handlePaymentProofUpload}
                  existingProof={order.payment_proof}
                  existingImage={order.payment_proof_image_url}
                />
              )}

              {/* Payment Proof Display */}
              {order.payment_proof_image_url && !showPaymentUpload && (
                <Card className="bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Payment Proof</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="relative">
                        <img
                          src={order.payment_proof_image_url || "/placeholder.svg"}
                          alt="Payment proof"
                          className="w-full max-w-md h-48 object-cover rounded-lg border"
                          onError={(e) => {
                            console.error("Image load error")
                            e.currentTarget.src = "/placeholder.svg?height=200&width=400"
                          }}
                        />
                      </div>
                      {order.payment_proof && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-sm">{order.payment_proof}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Order History */}
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Order History</CardTitle>
                  <CardDescription>Track all changes and updates to this order</CardDescription>
                </CardHeader>
                <CardContent>
                  {orderHistory.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No history available</p>
                  ) : (
                    <div className="space-y-4">
                      {orderHistory.map((history) => (
                        <div key={history.id} className="flex items-start space-x-3 pb-4 border-b last:border-b-0">
                          <div className="flex-shrink-0">{getStatusIcon(history.new_status)}</div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">
                                  Status changed from {history.previous_status || "new"} to {history.new_status}
                                </p>
                                {history.notes && <p className="text-sm text-gray-600 mt-1">{history.notes}</p>}
                                {history.users && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Changed by: {history.users?.username || history.users?.email || "System"}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(history.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Chat Section */}
            <div>
              {(order.status === "confirmed" || order.payment_proof_image_url) && (
                <ErrorBoundary>
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden h-[600px]">
                    <OrderChat
                      orderId={order.id}
                      orderNumber={order.order_number || `${order.id.substring(0, 8)}`}
                      currentUserId={user.id}
                      isAdmin={userProfile?.is_admin || false}
                      orderData={orderData}
                    />
                  </div>
                </ErrorBoundary>
              )}

              {order.status === "pending" && !order.payment_proof_image_url && order.type === "buy" && (
                <Card className="bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Next Steps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Complete Your Payment</h4>
                        <ol className="text-sm space-y-1 list-decimal list-inside">
                          <li>Make payment using your selected method</li>
                          <li>Take a screenshot or photo of the payment receipt</li>
                          <li>Upload the payment proof above</li>
                          <li>Chat with admin will be available after upload</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple error boundary component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const errorHandler = (error: ErrorEvent) => {
      console.error("Error caught by boundary:", error)
      setHasError(true)
      return true // Prevent default error handling
    }

    window.addEventListener("error", errorHandler)
    return () => window.removeEventListener("error", errorHandler)
  }, [])

  if (hasError) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-amber-600">Chat Temporarily Unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p>There was a problem loading the chat. Please refresh the page to try again.</p>
          <Button className="mt-4" onClick={() => setHasError(false)}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
