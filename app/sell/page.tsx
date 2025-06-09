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
import { ArrowLeft, Copy, RefreshCw, TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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

export default function SellPage() {
  const { user, loading } = useAuth()
  const [tokens, setTokens] = useState<TokenWithCurrentPrice[]>([])
  const [selectedToken, setSelectedToken] = useState<TokenWithCurrentPrice | null>(null)
  const [quantity, setQuantity] = useState("")
  const [txHash, setTxHash] = useState("")
  const [totalPrice, setTotalPrice] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [loadingPrices, setLoadingPrices] = useState(false)
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
    fetchTokensWithCurrentPrices()
    fetchPaymentMethods()
  }, [])

  useEffect(() => {
    if (selectedToken && quantity) {
      const total = Number.parseFloat(quantity) * selectedToken.current_price_idr
      setTotalPrice(total)
    } else {
      setTotalPrice(0)
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
        exchange_rate: selectedToken.current_price_idr, // Use current market price
      })

      if (error) throw error

      toast({
        title: "Sell Order Created",
        description: "Your sell order has been created with current market price. Admin will review and process it.",
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
              <h1 className="text-2xl font-bold text-gray-900">Sell Cryptocurrency</h1>
            </div>
            <Button variant="outline" size="sm" onClick={refreshCurrentPrices} disabled={loadingPrices}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingPrices ? "animate-spin" : ""}`} />
              {loadingPrices ? "Updating..." : "Refresh Prices"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Sell Crypto</CardTitle>
              <CardDescription>
                Select the cryptocurrency you want to sell using current market prices and provide transaction details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="token">Select Token</Label>
                  <Select
                    onValueChange={(value) => {
                      const token = tokens.find((t) => t.id === value)
                      setSelectedToken(token || null)
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
                            <div className="flex items-center space-x-1">
                              <span className="text-sm text-gray-500">Rp {formatNumber(token.current_price_idr)}</span>
                              {isUsingCurrentPrice(token) && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                  Live
                                </Badge>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedToken && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Current Market Price</h3>
                      <div className="flex items-center space-x-2">
                        {isUsingCurrentPrice(selectedToken) ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Live Price
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Fallback Price
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Sell Price (IDR):</span>
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
                    {selectedToken.last_price_update && (
                      <div className="mt-3 text-xs text-gray-500">
                        Last updated: {new Date(selectedToken.last_price_update).toLocaleString()}
                      </div>
                    )}
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
                    <h3 className="font-medium mb-2">Sell Order Summary (Current Market Price)</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Quantity:</span>
                        <span>
                          {quantity} {selectedToken?.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current price per token:</span>
                        <span>Rp {formatNumber(selectedToken?.current_price_idr || 0)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>You will receive:</span>
                        <span>Rp {formatNumber(totalPrice)}</span>
                      </div>
                    </div>
                    {selectedToken && isUsingCurrentPrice(selectedToken) && (
                      <div className="mt-2 text-xs text-green-600">✓ Using live market price from CoinMarketCap</div>
                    )}
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
                      <li>Submit your sell order (using current market price)</li>
                      <li>Admin will verify and transfer IDR payment to your selected method</li>
                    </ol>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!selectedToken || !quantity || !txHash || submitting}
                >
                  {submitting ? "Creating Sell Order..." : "Create Sell Order with Current Market Price"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
