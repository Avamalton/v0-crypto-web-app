"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Copy, CheckCircle, Clock, AlertCircle, FileText } from "lucide-react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"

export default function OrderDetailPage() {
  const { user, loading } = useAuth()
  const [order, setOrder] = useState<any>(null)
  const [orderHistory, setOrderHistory] = useState<any[]>([])
  const [paymentProof, setPaymentProof] = useState("")
  const [loadingOrder, setLoadingOrder] = useState(true)
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && params.id) {
      fetchOrderDetails()
      fetchOrderHistory()
    }
  }, [user, params.id])

  const fetchOrderDetails = async () => {
    try {
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
      if (data.user_id !== user?.id) {
        const { data: userProfile } = await supabase.from("users").select("is_admin").eq("id", user?.id).single()
        if (!userProfile?.is_admin) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to view this order.",
            variant: "destructive",
          })
          router.push("/orders")
          return
        }
      }

      setOrder(data)
      setPaymentProof(data.payment_proof || "")
    } catch (error: any) {
      console.error("Error fetching order:", error)
      toast({
        title: "Error",
        description: "Failed to load order details.",
        variant: "destructive",
      })
    } finally {
      setLoadingOrder(false)
    }
  }

  const fetchOrderHistory = async () => {
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
    }
  }

  const confirmPayment = async () => {
    setUpdating(true)
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "confirmed",
          payment_proof: paymentProof,
        })
        .eq("id", params.id)
        .eq("user_id", user?.id)

      if (error) throw error

      toast({
        title: "Payment Confirmed",
        description: "Your payment has been confirmed. Admin will process your order.",
      })

      fetchOrderDetails()
      fetchOrderHistory()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const updatePaymentProof = async () => {
    setUpdating(true)
    try {
      const { error } = await supabase
        .from("orders")
        .update({ payment_proof: paymentProof })
        .eq("id", params.id)
        .eq("user_id", user?.id)

      if (error) throw error

      toast({
        title: "Payment Proof Updated",
        description: "Your payment proof has been updated.",
      })

      fetchOrderDetails()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    })
  }

  const getStatusColor = (status: string) => {
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
  }

  const getStatusIcon = (status: string) => {
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
  }

  if (loading || loadingOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !order) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
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
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    {getStatusIcon(order.status)}
                    <span>Order {order.order_number}</span>
                  </CardTitle>
                  <CardDescription>
                    {order.type === "buy" ? "Buy" : "Sell"} {order.tokens.symbol} • Created on{" "}
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
                          {order.tokens.name} ({order.tokens.symbol})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Network:</span>
                        <span>{order.tokens.network}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Quantity:</span>
                        <span>
                          {order.quantity} {order.tokens.symbol}
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
                        <span>Rp {order.total_price.toLocaleString()}</span>
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
                        <span>{order.payment_method}</span>
                      </div>
                      {order.admin_wallet_used && (
                        <div>
                          <span className="text-gray-600">Wallet Address:</span>
                          <div className="bg-gray-50 p-2 rounded mt-1">
                            <div className="flex justify-between items-center">
                              <span className="font-mono text-xs">{order.admin_wallet_used}</span>
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

          {/* Payment Actions */}
          {order.type === "buy" && order.status === "pending" && order.user_id === user.id && (
            <Card>
              <CardHeader>
                <CardTitle>Complete Payment</CardTitle>
                <CardDescription>Add payment proof and confirm your payment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="paymentProof">Payment Proof</Label>
                  <Textarea
                    id="paymentProof"
                    value={paymentProof}
                    onChange={(e) => setPaymentProof(e.target.value)}
                    placeholder="Enter transaction ID, screenshot description, or other payment proof"
                    rows={3}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={confirmPayment} disabled={updating}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {updating ? "Confirming..." : "Confirm Payment"}
                  </Button>
                  <Button variant="outline" onClick={updatePaymentProof} disabled={updating}>
                    <FileText className="h-4 w-4 mr-2" />
                    Update Proof Only
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order History */}
          <Card>
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
                                Changed by: {history.users.username || history.users.email}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{new Date(history.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Notes */}
          {order.admin_notes && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{order.admin_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
