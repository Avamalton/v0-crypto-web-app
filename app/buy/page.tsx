"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Copy } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

export default function BuyPage() {
  const { user, loading } = useAuth()
  const [tokens, setTokens] = useState<any[]>([])
  const [selectedToken, setSelectedToken] = useState<any>(null)
  const [quantity, setQuantity] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [paymentProof, setPaymentProof] = useState("")
  const [totalPrice, setTotalPrice] = useState(0)
  const [fees, setFees] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    fetchTokens()
    fetchPaymentMethods()
  }, [])

  useEffect(() => {
    if (selectedToken && quantity) {
      const subtotal = Number.parseFloat(quantity) * selectedToken.price_idr
      const calculatedFees = subtotal * 0.001 // 0.1% fee
      setFees(calculatedFees)
      setTotalPrice(subtotal + calculatedFees)
    } else {
      setTotalPrice(0)
      setFees(0)
    }
  }, [selectedToken, quantity])

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase.from("tokens").select("*").eq("is_active", true).order("name")

      if (error) throw error
      setTokens(data || [])
    } catch (error) {
      console.error("Error fetching tokens:", error)
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("type", { ascending: true })

      if (error) throw error
      setPaymentMethods(data || [])
    } catch (error) {
      console.error("Error fetching payment methods:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedToken || !quantity || !paymentMethod) return

    setSubmitting(true)

    try {
      // Create order with all tracking information
      const orderData = {
        user_id: user?.id,
        type: "buy" as const,
        token_id: selectedToken.id,
        quantity: Number.parseFloat(quantity),
        total_price: totalPrice,
        payment_method: paymentMethod,
        payment_proof: paymentProof || null,
        admin_wallet_used: selectedToken.wallet_address,
        exchange_rate: selectedToken.price_idr,
        fees: fees,
        status: "pending" as const,
      }

      const { data, error } = await supabase.from("orders").insert(orderData).select().single()

      if (error) throw error

      // Log the successful order creation
      console.log("Order created successfully:", data)

      toast({
        title: "Order Created Successfully",
        description: `Order ${data.order_number} has been created. Please complete the payment and confirm.`,
      })

      // Redirect to order details
      router.push(`/orders/${data.id}`)
    } catch (error: any) {
      console.error("Error creating order:", error)
      toast({
        title: "Error Creating Order",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Wallet address copied to clipboard",
    })
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
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Buy Cryptocurrency</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Buy Crypto</CardTitle>
              <CardDescription>Select the cryptocurrency you want to buy and complete the payment</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="token">Select Token</Label>
                  <Select
                    onValueChange={(value) => {
                      const token = tokens.find((t) => t.id === value)
                      setSelectedToken(token)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a cryptocurrency" />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.map((token) => (
                        <SelectItem key={token.id} value={token.id}>
                          <div className="flex items-center space-x-2">
                            <Image
                              src={token.logo || "/placeholder.svg"}
                              alt={token.name}
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                            <span>
                              {token.name} ({token.symbol}) - {token.network}
                            </span>
                            <span className="text-sm text-gray-500">Rp {token.price_idr.toLocaleString()}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedToken && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Token Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Price:</span>
                        <p className="font-medium">Rp {selectedToken.price_idr.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Network:</span>
                        <p className="font-medium">{selectedToken.network}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.00000001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter amount to buy"
                    required
                  />
                </div>

                {totalPrice > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Order Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Quantity:</span>
                        <span>
                          {quantity} {selectedToken?.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Price per token:</span>
                        <span>Rp {selectedToken?.price_idr.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>Rp {(totalPrice - fees).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fees (0.1%):</span>
                        <span>Rp {fees.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>Rp {totalPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Payment Method</Label>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={method.name} id={method.name} />
                        <Label htmlFor={method.name} className="flex items-center space-x-2">
                          <span>{method.display_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {method.type.replace("_", " ").toUpperCase()}
                          </Badge>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {selectedToken && paymentMethod && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Payment Instructions</h3>
                    {(() => {
                      const method = paymentMethods.find((m) => m.name === paymentMethod)
                      if (!method) return null

                      return (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600">{method.description}</p>

                          {method.qr_code_url && (
                            <div className="text-center">
                              <img
                                src={method.qr_code_url || "/placeholder.svg"}
                                alt="QR Code"
                                className="w-48 h-48 mx-auto border rounded-lg"
                              />
                              <p className="text-xs text-gray-500 mt-2">Scan with your mobile banking app</p>
                            </div>
                          )}

                          {method.account_number && (
                            <div className="bg-white p-3 rounded border">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-600">Account:</span>
                                  <p className="font-mono">{method.account_number}</p>
                                </div>
                                <div>
                                  <span className="text-gray-600">Name:</span>
                                  <p className="font-medium">{method.account_name}</p>
                                </div>
                                {method.bank_name && (
                                  <div className="col-span-2">
                                    <span className="text-gray-600">Bank:</span>
                                    <p className="font-medium">{method.bank_name}</p>
                                  </div>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => copyToClipboard(method.account_number)}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Account Number
                              </Button>
                            </div>
                          )}

                          <div className="text-sm text-gray-600">
                            <p className="font-medium mb-1">Instructions:</p>
                            <p>{method.instructions}</p>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                <div>
                  <Label htmlFor="paymentProof">Payment Proof (Optional)</Label>
                  <Textarea
                    id="paymentProof"
                    value={paymentProof}
                    onChange={(e) => setPaymentProof(e.target.value)}
                    placeholder="Enter transaction ID, screenshot description, or other payment proof"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can add payment proof now or later in the order details page.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!selectedToken || !quantity || !paymentMethod || submitting}
                >
                  {submitting ? "Creating Order..." : "Create Order"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
