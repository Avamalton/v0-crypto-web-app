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
import { ArrowLeft, Copy, AlertTriangle, RefreshCw, TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

interface TokenWithCurrentPrice {
  id: string
  name: string
  symbol: string
  network: string
  logo: string | null
  wallet_address: string
  is_active: boolean
  // Current market prices from cache
  current_price_idr: number
  current_price_usd: number
  price_change_24h: number
  last_price_update: string | null
  // Fallback prices from tokens table
  fallback_price_idr: number
}

export default function BuyPage() {
  const { user, loading } = useAuth()
  const [tokens, setTokens] = useState<TokenWithCurrentPrice[]>([])
  const [selectedToken, setSelectedToken] = useState<TokenWithCurrentPrice | null>(null)
  const [quantity, setQuantity] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [paymentProof, setPaymentProof] = useState("")
  const [totalPrice, setTotalPrice] = useState(0)
  const [fees, setFees] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState("")
  const [loadingPrices, setLoadingPrices] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    fetchTokensWithCurrentPrices()
    fetchPaymentMethods()
  }, [])

  useEffect(() => {
    if (selectedToken && quantity) {
      validateAndCalculate()
    } else {
      setTotalPrice(0)
      setFees(0)
      setValidationError("")
    }
  }, [selectedToken, quantity])

  const fetchTokensWithCurrentPrices = async () => {
    setLoadingPrices(true)
    try {
      // Fetch tokens with current prices from cache
      const { data: tokensData, error: tokensError } = await supabase
        .from("tokens")
        .select("*")
        .eq("is_active", true)
        .order("name")

      if (tokensError) throw tokensError

      // Fetch current prices from cache
      const { data: pricesData, error: pricesError } = await supabase
        .from("price_cache")
        .select("*")
        .order("last_updated", { ascending: false })

      if (pricesError) {
        console.error("Error fetching price cache:", pricesError)
      }

      // Combine tokens with current prices
      const tokensWithPrices: TokenWithCurrentPrice[] = (tokensData || []).map((token) => {
        const currentPrice = pricesData?.find((price) => price.token_symbol === token.symbol)

        return {
          id: token.id,
          name: token.name,
          symbol: token.symbol,
          network: token.network,
          logo: token.logo,
          wallet_address: token.wallet_address,
          is_active: token.is_active,
          // Use current market price if available, otherwise fallback to token price
          current_price_idr: currentPrice ? Number(currentPrice.price_idr) : token.price_idr,
          current_price_usd: currentPrice ? Number(currentPrice.price_usd) : token.price_usd || 0,
          price_change_24h: currentPrice ? Number(currentPrice.price_change_24h || 0) : 0,
          last_price_update: currentPrice?.last_updated || null,
          fallback_price_idr: token.price_idr,
        }
      })

      setTokens(tokensWithPrices)
    } catch (error) {
      console.error("Error fetching tokens with prices:", error)
      toast({
        title: "Error",
        description: "Failed to fetch current prices. Using fallback prices.",
        variant: "destructive",
      })
    } finally {
      setLoadingPrices(false)
    }
  }

  const refreshCurrentPrices = async () => {
    if (tokens.length === 0) return

    setLoadingPrices(true)
    try {
      // Force refresh prices from CMC
      const symbols = tokens.map((token) => token.symbol).join(",")
      const response = await fetch(`/api/crypto-prices?symbols=${symbols}&force=true`)

      if (!response.ok) {
        throw new Error("Failed to refresh prices")
      }

      const data = await response.json()

      if (data.success) {
        // Update tokens with new prices
        const updatedTokens = tokens.map((token) => {
          const newPrice = data.data[token.symbol]
          if (newPrice) {
            return {
              ...token,
              current_price_idr: newPrice.idr,
              current_price_usd: newPrice.usd,
              price_change_24h: newPrice.change_24h,
              last_price_update: new Date().toISOString(),
            }
          }
          return token
        })

        setTokens(updatedTokens)

        // Update selected token if it exists
        if (selectedToken) {
          const updatedSelectedToken = updatedTokens.find((t) => t.id === selectedToken.id)
          if (updatedSelectedToken) {
            setSelectedToken(updatedSelectedToken)
          }
        }

        toast({
          title: "Prices Updated",
          description: `Updated prices for ${data.refreshed_symbols?.length || 0} tokens`,
        })
      }
    } catch (error) {
      console.error("Error refreshing prices:", error)
      toast({
        title: "Error",
        description: "Failed to refresh prices",
        variant: "destructive",
      })
    } finally {
      setLoadingPrices(false)
    }
  }

  const validateAndCalculate = () => {
    if (!selectedToken) return

    const qty = Number.parseFloat(quantity)

    // Validation checks
    if (isNaN(qty) || qty <= 0) {
      setValidationError("Please enter a valid quantity")
      return
    }

    if (qty > 999999999) {
      setValidationError("Quantity too large. Maximum is 999,999,999")
      return
    }

    if (selectedToken.current_price_idr > 999999999) {
      setValidationError("Token price too high for calculation")
      return
    }

    const subtotal = qty * selectedToken.current_price_idr

    // Check if subtotal would cause overflow (PostgreSQL numeric limit)
    if (subtotal > 999999999999) {
      setValidationError("Order value too large. Please reduce quantity.")
      return
    }

    const calculatedFees = subtotal * 0.001 // 0.1% fee
    const total = subtotal + calculatedFees

    if (total > 999999999999) {
      setValidationError("Total order value exceeds maximum limit")
      return
    }

    setFees(Math.round(calculatedFees))
    setTotalPrice(Math.round(total))
    setValidationError("")
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

    if (!selectedToken || !quantity || !paymentMethod) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      // Final validation before submission
      const qty = Number.parseFloat(quantity)
      const exchangeRate = selectedToken.current_price_idr || 0
      const calculatedFees = Math.round(qty * exchangeRate * 0.001)
      const calculatedTotal = Math.round(qty * exchangeRate + calculatedFees)

      // Double-check for overflow
      if (calculatedTotal > 999999999999 || qty > 999999999) {
        throw new Error("Order value exceeds maximum limits")
      }

      // Create order with current market price
      const orderData = {
        user_id: user?.id,
        type: "buy" as const,
        token_id: selectedToken.id,
        quantity: qty,
        total_price: calculatedTotal,
        payment_method: paymentMethod,
        payment_proof: paymentProof?.trim() || null,
        admin_wallet_used: selectedToken.wallet_address,
        exchange_rate: exchangeRate,
        fees: calculatedFees,
        status: "pending" as const,
      }

      console.log("Creating order with current market price:", orderData)

      const { data, error } = await supabase.from("orders").insert(orderData).select().single()

      if (error) {
        console.error("Database error:", error)
        throw error
      }

      toast({
        title: "Order Created Successfully",
        description: `Order ${data.order_number} created with current market price.`,
      })

      router.push(`/orders/${data.id}`)
    } catch (error: any) {
      console.error("Error creating order:", error)

      let errorMessage = "Failed to create order"
      if (error.message.includes("overflow")) {
        errorMessage = "Order value is too large. Please reduce the quantity."
      } else if (error.message.includes("numeric")) {
        errorMessage = "Invalid number format. Please check your input."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Error Creating Order",
        description: errorMessage,
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("id-ID").format(num)
  }

  const formatChange = (change: number): string => {
    return `${change > 0 ? "+" : ""}${change.toFixed(2)}%`
  }

  const isUsingCurrentPrice = (token: TokenWithCurrentPrice): boolean => {
    return token.last_price_update !== null && token.current_price_idr !== token.fallback_price_idr
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
    {/* Header */}
    <div className="bg-white shadow">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard" className="flex items-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshCurrentPrices}
            disabled={loadingPrices}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingPrices ? "animate-spin" : ""}`} />
            {loadingPrices ? "Updating..." : "Refresh Prices"}
          </Button>
        </div>
      </div>
    </div>

    {/* Main Content */}
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Buy Crypto</CardTitle>
          <CardDescription>
            Select the cryptocurrency you want to buy and complete the payment using current market prices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Select Token */}
            <div>
              <Label htmlFor="token">Select Token</Label>
              <Select
                onValueChange={(value) => {
                  const token = tokens.find((t) => t.id === value)
                  setSelectedToken(token || null)
                  setQuantity("")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a cryptocurrency" />
                </SelectTrigger>
               <SelectContent>
  {tokens.map((token) => (
    <SelectItem key={token.id} value={token.id}>
      <div className="flex items-center space-x-3 overflow-hidden">
        <Image
          src={token.logo || "/placeholder.svg"}
          alt={token.name}
          width={20}
          height={20}
          className="rounded-full shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {token.name} ({token.symbol}) - {token.network}
          </p>
          <div className="flex items-center text-xs text-gray-500">
            <span>Rp {formatNumber(token.current_price_idr)}</span>
            {isUsingCurrentPrice(token) && (
              <Badge variant="secondary" className="ml-2 text-[10px] bg-green-100 text-green-800">
                Live
              </Badge>
            )}
          </div>
        </div>
      </div>
    </SelectItem>
  ))}
</SelectContent>

              </Select>
            </div>

            {/* Token Details */}
            {selectedToken && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                  <h3 className="font-medium">Current Market Price</h3>
                  <Badge
                    variant="secondary"
                    className={`${
                      isUsingCurrentPrice(selectedToken) ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {isUsingCurrentPrice(selectedToken) ? "Live Price" : "Fallback Price"}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">IDR Price:</span>
                    <p className="font-medium text-lg">Rp {formatNumber(selectedToken.current_price_idr)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">USD Price:</span>
                    <p className="font-medium">${selectedToken.current_price_usd.toFixed(8)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Network:</span>
                    <p className="font-medium">{selectedToken.network}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">24h Change:</span>
                    <div className="flex items-center space-x-1">
                      {selectedToken.price_change_24h >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span
                        className={`font-medium ${
                          selectedToken.price_change_24h >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatChange(selectedToken.price_change_24h)}
                      </span>
                    </div>
                  </div>
                </div>
                {selectedToken.last_price_update && (
                  <div className="mt-3 text-xs text-gray-500">
                    Last updated: {new Date(selectedToken.last_price_update).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.00000001"
                max="999999999"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter amount to buy (max: 999,999,999)"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Maximum quantity: 999,999,999</p>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-red-700 text-sm">{validationError}</span>
                </div>
              </div>
            )}

            {/* Summary */}
            {totalPrice > 0 && !validationError && (
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
                    <span>Rp {formatNumber(selectedToken?.current_price_idr || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rp {formatNumber(totalPrice - fees)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fees (0.1%):</span>
                    <span>Rp {formatNumber(fees)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>Rp {formatNumber(totalPrice)}</span>
                  </div>
                </div>
                {selectedToken && isUsingCurrentPrice(selectedToken) && (
                  <div className="mt-2 text-xs text-green-600">
                    ✓ Using live market price from CoinMarketCap
                  </div>
                )}
              </div>
            )}

            {/* Payment Method */}
            <div>
              <Label>Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                    <RadioGroupItem value={method.name} id={method.name} />
                    <Label htmlFor={method.name} className="flex items-center space-x-2">
                      <span>{method.display_name}</span>
                      <Badge variant="outline" className="text-xs">{method.type.replace("_", " ").toUpperCase()}</Badge>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Payment Instructions */}
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
                            src={method.qr_code_url}
                            alt="QR Code"
                            className="w-48 h-48 mx-auto border rounded-lg"
                          />
                          <p className="text-xs text-gray-500 mt-2">Scan with your mobile banking app</p>
                        </div>
                      )}

                      {method.account_number && (
                        <div className="bg-white p-3 rounded border">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
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

            {/* Payment Proof */}
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

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={!selectedToken || !quantity || !paymentMethod || submitting || !!validationError}
            >
              {submitting ? "Creating Order..." : "Create Order Current Price"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  </div>
)

}
