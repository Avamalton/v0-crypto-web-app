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
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Copy } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"

export default function SellPage() {
  const { user, loading } = useAuth()
  const [tokens, setTokens] = useState<any[]>([])
  const [selectedToken, setSelectedToken] = useState<any>(null)
  const [quantity, setQuantity] = useState("")
  const [txHash, setTxHash] = useState("")
  const [totalPrice, setTotalPrice] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [paymentMethod, setPaymentMethod] = useState<string>("")

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
      const total = Number.parseFloat(quantity) * selectedToken.price_idr
      setTotalPrice(total)
    } else {
      setTotalPrice(0)
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
    if (!selectedToken || !quantity || !txHash) return

    setSubmitting(true)

    try {
      const { error } = await supabase.from("orders").insert({
        user_id: user?.id,
        type: "sell",
        token_id: selectedToken.id,
        quantity: Number.parseFloat(quantity),
        total_price: totalPrice,
        tx_hash: txHash,
        status: "pending",
        payment_method: paymentMethod,
      })

      if (error) throw error

      toast({
        title: "Sell Order Created",
        description: "Your sell order has been created successfully. Admin will review and process it.",
      })

      router.push("/orders")
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
            <h1 className="text-2xl font-bold text-gray-900">Sell Cryptocurrency</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Sell Crypto</CardTitle>
              <CardDescription>
                Select the cryptocurrency you want to sell and provide transaction details
              </CardDescription>
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
                        <span className="text-gray-600">Sell Price:</span>
                        <p className="font-medium">Rp {selectedToken.price_idr.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Network:</span>
                        <p className="font-medium">{selectedToken.network}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="text-gray-600 text-sm">Send to Admin Wallet:</span>
                      <div className="bg-white p-3 rounded border mt-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-mono">{selectedToken.wallet_address}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(selectedToken.wallet_address)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="quantity">Quantity to Sell</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.00000001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter amount to sell"
                    required
                  />
                </div>

                {totalPrice > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Sell Order Summary</h3>
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
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>You will receive:</span>
                        <span>Rp {totalPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="txHash">Transaction Hash</Label>
                  <Input
                    id="txHash"
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="Enter transaction hash after sending crypto"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Provide the transaction hash after sending your crypto to the admin wallet
                  </p>
                </div>

                <div>
                  <Label>Preferred Payment Method for Receiving IDR</Label>
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
                  <p className="text-xs text-gray-500 mt-1">Select how you want to receive your IDR payment</p>
                </div>

                {selectedToken && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Sell Instructions</h3>
                    <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                      <li>Send your {selectedToken.symbol} to the admin wallet address above</li>
                      <li>Copy the transaction hash from your wallet</li>
                      <li>Paste the transaction hash in the field above</li>
                      <li>Select your preferred payment method for receiving IDR</li>
                      <li>Submit your sell order</li>
                      <li>Admin will verify and transfer IDR payment to your selected method</li>
                    </ol>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!selectedToken || !quantity || !txHash || submitting}
                >
                  {submitting ? "Creating Sell Order..." : "Create Sell Order"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
