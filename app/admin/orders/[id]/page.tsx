"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
  Coins,
  CreditCard,
  Calendar,
  DollarSign,
  Shield,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"

export default function AdminOrderDetailPage() {
  const { user, userProfile, loading } = useAuth()
  const [order, setOrder] = useState<any>(null)
  const [orderHistory, setOrderHistory] = useState<any[]>([])
  const [adminNotes, setAdminNotes] = useState("")
  const [newStatus, setNewStatus] = useState("")
  const [loadingOrder, setLoadingOrder] = useState(true)
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    if (!loading && (!user || !userProfile?.is_admin)) {
      router.push("/dashboard")
    }
  }, [user, userProfile, loading, router])

  useEffect(() => {
    if (user && userProfile?.is_admin && params.id) {
      fetchOrderDetails()
      fetchOrderHistory()
    }
  }, [user, userProfile, params.id])

  const fetchOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          tokens (name, symbol, network, wallet_address, logo),
          users (username, email, is_admin)
        `)
        .eq("id", params.id)
        .single()

      if (error) throw error

      setOrder(data)
      setAdminNotes(data.admin_notes || "")
      setNewStatus(data.status)
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

  const updateOrderStatus = async () => {
    if (!newStatus || newStatus === order.status) return

    setUpdating(true)
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          admin_notes: adminNotes,
        })
        .eq("id", params.id)

      if (error) throw error

      toast({
        title: "Order Updated",
        description: `Order status updated to ${newStatus}`,
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

  const updateAdminNotes = async () => {
    setUpdating(true)
    try {
      const { error } = await supabase.from("orders").update({ admin_notes: adminNotes }).eq("id", params.id)

      if (error) throw error

      toast({
        title: "Notes Updated",
        description: "Admin notes have been updated.",
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
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

  if (loading || loadingOrder || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!order || !order.tokens) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Order not found</h2>
          <p className="text-gray-600 mt-2">The requested order could not be loaded.</p>
          <Button asChild className="mt-4">
            <Link href="/admin">Back to Admin</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Order Details</h1>
                <p className="text-gray-600">Order #{order.order_number}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={getStatusColor(order.status)} className="text-sm px-3 py-1">
                {getStatusIcon(order.status)}
                <span className="ml-1">{order.status.toUpperCase()}</span>
              </Badge>
              <Button onClick={fetchOrderDetails} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Order Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Coins className="h-5 w-5" />
                  <span>Order Summary</span>
                </CardTitle>
                <CardDescription>
                  {order.type === "buy" ? "Buy" : "Sell"} order created on{" "}
                  {new Date(order.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                      <img
                        src={order.tokens.logo || "/placeholder.svg"}
                        alt={order.tokens.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-semibold">{order.tokens.name}</p>
                        <p className="text-sm text-gray-600">
                          {order.tokens.symbol} • {order.tokens.network}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Quantity:</span>
                        <span className="font-medium">
                          {order.quantity} {order.tokens.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Exchange Rate:</span>
                        <span className="font-medium">Rp {order.exchange_rate?.toLocaleString()}</span>
                      </div>
                      {order.fees > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fees:</span>
                          <span className="font-medium">Rp {order.fees.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg border-t pt-3">
                        <span>Total:</span>
                        <span>Rp {order.total_price.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Timeline
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Created:</span>
                          <span>{new Date(order.created_at).toLocaleString()}</span>
                        </div>
                        {order.confirmed_at && (
                          <div className="flex justify-between">
                            <span>Confirmed:</span>
                            <span>{new Date(order.confirmed_at).toLocaleString()}</span>
                          </div>
                        )}
                        {order.completed_at && (
                          <div className="flex justify-between">
                            <span>Completed:</span>
                            <span>{new Date(order.completed_at).toLocaleString()}</span>
                          </div>
                        )}
                        {order.failed_at && (
                          <div className="flex justify-between">
                            <span>Failed:</span>
                            <span>{new Date(order.failed_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Customer Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Username:</span>
                      <span className="font-medium">{order.users?.username || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{order.users?.email || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">User Type:</span>
                      <Badge variant={order.users?.is_admin ? "default" : "secondary"}>
                        {order.users?.is_admin ? "Admin" : "Customer"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">User ID:</span>
                      <span className="font-mono text-sm">{order.user_id.substring(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order ID:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm">{order.id.substring(0, 8)}...</span>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(order.id, "Order ID")}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Payment Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-medium">{order.payment_method || "Not specified"}</span>
                    </div>
                    {order.admin_wallet_used && (
                      <div>
                        <span className="text-gray-600">Admin Wallet:</span>
                        <div className="bg-gray-50 p-2 rounded mt-1">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-xs">{order.admin_wallet_used}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(order.admin_wallet_used, "Wallet address")}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {order.tx_hash && (
                      <div>
                        <span className="text-gray-600">Transaction Hash:</span>
                        <div className="bg-gray-50 p-2 rounded mt-1">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-xs">{order.tx_hash}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(order.tx_hash, "Transaction hash")}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    {order.payment_proof && (
                      <div>
                        <span className="text-gray-600">Payment Proof:</span>
                        <div className="bg-gray-50 p-2 rounded mt-1">
                          <p className="text-sm">{order.payment_proof}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order History */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Order History</span>
                </CardTitle>
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

          {/* Admin Actions Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Admin Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="status">Update Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="adminNotes">Admin Notes</Label>
                  <Textarea
                    id="adminNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this order..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={updateOrderStatus}
                    disabled={updating || newStatus === order.status}
                    className="w-full"
                  >
                    {updating ? "Updating..." : "Update Order"}
                  </Button>
                  <Button onClick={updateAdminNotes} variant="outline" disabled={updating} className="w-full">
                    Save Notes Only
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Order Statistics */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Order Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Type:</span>
                  <Badge variant={order.type === "buy" ? "default" : "outline"}>{order.type.toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Processing Time:</span>
                  <span className="text-sm">
                    {order.completed_at
                      ? `${Math.round((new Date(order.completed_at).getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60))}h`
                      : "In progress"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Value (USD):</span>
                  <span className="text-sm">~${(order.total_price / 15800).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href={`/orders/${order.id}`}>
                    <User className="h-4 w-4 mr-2" />
                    View as Customer
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/admin">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to All Orders
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
