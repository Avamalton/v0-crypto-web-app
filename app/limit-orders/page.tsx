"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Clock, X, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LimitOrdersPage() {
  const { user, loading } = useAuth()
  const [tokens, setTokens] = useState<any[]>([])
  const [limitOrders, setLimitOrders] = useState<any[]>([])
  const [marketOrders, setMarketOrders] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    token_id: "",
    type: "buy" as "buy" | "sell",
    quantity: "",
    target_price: "",
    payment_method: "",
    notes: "",
    expires_in_days: "7",
  })
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({})
  const [loadingPrices, setLoadingPrices] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchTokens()
      fetchLimitOrders()
      fetchMarketOrders()
      fetchPaymentMethods()
    }
  }, [user])

  useEffect(() => {
    if (formData.token_id) {
      fetchCurrentPrices()
    }
  }, [formData.token_id])

  const fetchCurrentPrices = async () => {
    if (!formData.token_id) return

    setLoadingPrices(true)
    try {
      const token = tokens.find((t) => t.id === formData.token_id)
      if (!token) return

      const response = await fetch(`/api/crypto-prices?symbols=${token.symbol}`)
      const data = await response.json()

      if (data.success && data.data[token.symbol]) {
        setCurrentPrices((prev) => ({
          ...prev,
          [token.symbol]: data.data[token.symbol].idr,
        }))
      }
    } catch (error) {
      console.error("Error fetching current price:", error)
    } finally {
      setLoadingPrices(false)
    }
  }

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase.from("tokens").select("*").eq("is_active", true).order("name")

      if (error) throw error
      setTokens(data || [])
    } catch (error) {
      console.error("Error fetching tokens:", error)
    }
  }

  const fetchLimitOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("limit_orders")
        .select(`
          *,
          tokens (name, symbol, network, logo),
          users (username, email)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setLimitOrders(data || [])
    } catch (error) {
      console.error("Error fetching limit orders:", error)
    }
  }

  const fetchMarketOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("limit_orders")
        .select(`
          *,
          tokens (name, symbol, network, logo),
          users (username, email)
        `)
        .eq("status", "active")
        .neq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error
      setMarketOrders(data || [])
    } catch (error) {
      console.error("Error fetching market orders:", error)
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase.from("payment_methods").select("*").eq("is_active", true).order("type")

      if (error) throw error
      setPaymentMethods(data || [])
    } catch (error) {
      console.error("Error fetching payment methods:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.token_id || !formData.quantity || !formData.target_price) return

    setSubmitting(true)
    try {
      const quantity = Number.parseFloat(formData.quantity)
      const targetPrice = Number.parseFloat(formData.target_price)
      const totalAmount = quantity * targetPrice

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + Number.parseInt(formData.expires_in_days))

      const { error } = await supabase.from("limit_orders").insert({
        user_id: user?.id,
        token_id: formData.token_id,
        type: formData.type,
        quantity,
        target_price: targetPrice,
        total_amount: totalAmount,
        payment_method: formData.payment_method,
        notes: formData.notes,
        expires_at: expiresAt.toISOString(),
      })

      if (error) throw error

      toast({
        title: "Limit Order Created",
        description: "Your limit order has been created successfully",
      })

      setShowCreateForm(false)
      setFormData({
        token_id: "",
        type: "buy",
        quantity: "",
        target_price: "",
        payment_method: "",
        notes: "",
        expires_in_days: "7",
      })
      fetchLimitOrders()
      fetchMarketOrders()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const cancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("limit_orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("user_id", user?.id)

      if (error) throw error

      toast({
        title: "Order Cancelled",
        description: "Your limit order has been cancelled",
      })

      fetchLimitOrders()
      fetchMarketOrders()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "partially_filled":
        return "outline"
      case "filled":
        return "secondary"
      case "cancelled":
        return "destructive"
      case "expired":
        return "secondary"
      default:
        return "secondary"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Limit Orders</h1>
            </div>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Limit Order
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Create Order Form */}
          {showCreateForm && (
            <div className="lg:col-span-3">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Create Limit Order</CardTitle>
                  <CardDescription>
                    Set your desired price and quantity. Your order will be matched automatically when conditions are
                    met.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Order Type</Label>
                        <RadioGroup
                          value={formData.type}
                          onValueChange={(value: "buy" | "sell") => setFormData((prev) => ({ ...prev, type: value }))}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="buy" id="buy" />
                            <Label htmlFor="buy" className="flex items-center">
                              <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
                              Buy
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="sell" id="sell" />
                            <Label htmlFor="sell" className="flex items-center">
                              <TrendingDown className="h-4 w-4 mr-1 text-red-600" />
                              Sell
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div>
                        <Label>Token</Label>
                        <Select
                          value={formData.token_id}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, token_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select token" />
                          </SelectTrigger>
                          <SelectContent>
                            {tokens.map((token) => (
                              <SelectItem key={token.id} value={token.id}>
                                {token.name} ({token.symbol})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          step="0.00000001"
                          value={formData.quantity}
                          onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                          placeholder="Enter quantity"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <Label>Target Price (IDR)</Label>
                          {formData.token_id && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const token = tokens.find((t) => t.id === formData.token_id)
                                if (token && currentPrices[token.symbol]) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    target_price: currentPrices[token.symbol].toString(),
                                  }))
                                } else {
                                  fetchCurrentPrices()
                                }
                              }}
                              disabled={loadingPrices}
                            >
                              {loadingPrices ? (
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <TrendingUp className="h-3 w-3 mr-1" />
                              )}
                              Use Current Price
                            </Button>
                          )}
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.target_price}
                          onChange={(e) => setFormData((prev) => ({ ...prev, target_price: e.target.value }))}
                          placeholder="Enter target price"
                        />
                        {formData.token_id &&
                          currentPrices[tokens.find((t) => t.id === formData.token_id)?.symbol || ""] && (
                            <p className="text-xs text-gray-500 mt-1">
                              Current price: Rp{" "}
                              {currentPrices[
                                tokens.find((t) => t.id === formData.token_id)?.symbol || ""
                              ]?.toLocaleString()}
                            </p>
                          )}
                      </div>

                      <div>
                        <Label>Payment Method</Label>
                        <Select
                          value={formData.payment_method}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, payment_method: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods.map((method) => (
                              <SelectItem key={method.id} value={method.name}>
                                {method.display_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Expires In</Label>
                        <Select
                          value={formData.expires_in_days}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, expires_in_days: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 Day</SelectItem>
                            <SelectItem value="3">3 Days</SelectItem>
                            <SelectItem value="7">7 Days</SelectItem>
                            <SelectItem value="14">14 Days</SelectItem>
                            <SelectItem value="30">30 Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add any additional notes..."
                        rows={2}
                      />
                    </div>

                    {formData.quantity && formData.target_price && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Order Summary</h4>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>Total Amount:</span>
                            <span className="font-medium">
                              Rp{" "}
                              {(
                                Number.parseFloat(formData.quantity) * Number.parseFloat(formData.target_price)
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button type="submit" disabled={submitting}>
                        {submitting ? "Creating..." : "Create Limit Order"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* My Limit Orders */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>My Limit Orders</CardTitle>
                <CardDescription>Your active and completed limit orders</CardDescription>
              </CardHeader>
              <CardContent>
                {limitOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No limit orders yet</p>
                    <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
                      Create Your First Limit Order
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Token</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Target Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {limitOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <Badge variant={order.type === "buy" ? "default" : "outline"}>
                                {order.type === "buy" ? (
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {order.type.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{order.tokens.symbol}</p>
                                <p className="text-sm text-gray-600">{order.tokens.name}</p>
                              </div>
                            </TableCell>
                            <TableCell>{order.quantity}</TableCell>
                            <TableCell>Rp {order.target_price.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {order.status === "active" && (
                                <Button variant="outline" size="sm" onClick={() => cancelOrder(order.id)}>
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Market Orders */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Market Orders</CardTitle>
                <CardDescription>Available orders from other users</CardDescription>
              </CardHeader>
              <CardContent>
                {marketOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No market orders available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {marketOrders.slice(0, 10).map((order) => (
                      <div key={order.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <Badge variant={order.type === "buy" ? "default" : "outline"} className="mb-1">
                              {order.type.toUpperCase()}
                            </Badge>
                            <p className="font-medium">{order.tokens.symbol}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">Rp {order.target_price.toLocaleString()}</p>
                            <p className="text-xs text-gray-600">
                              {order.quantity} {order.tokens.symbol}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-500">by {order.users?.username || "Anonymous"}</p>
                          <Button size="sm" variant="outline">
                            Match Order
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
