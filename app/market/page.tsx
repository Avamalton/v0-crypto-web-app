"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Search, TrendingUp, TrendingDown, Coins, Clock, Users, MessageCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function MarketPage() {
  const { user, loading } = useAuth()
  const [marketAds, setMarketAds] = useState<any[]>([])
  const [filteredAds, setFilteredAds] = useState<any[]>([])
  const [tokens, setTokens] = useState<any[]>([])
  const [loadingAds, setLoadingAds] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [tokenFilter, setTokenFilter] = useState("all")
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchMarketAds()
    fetchTokens()
  }, [])

  useEffect(() => {
    filterAds()
  }, [marketAds, searchTerm, typeFilter, tokenFilter])

  const fetchMarketAds = async () => {
    try {
      const { data, error } = await supabase
        .from("market_ads")
        .select(`
          *,
          tokens (name, symbol, network, logo),
          users (username)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) throw error
      setMarketAds(data || [])
    } catch (error) {
      console.error("Error fetching market ads:", error)
    } finally {
      setLoadingAds(false)
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

  const filterAds = () => {
    let filtered = marketAds

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (ad) =>
          ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ad.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ad.tokens.symbol.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter((ad) => ad.type === typeFilter)
    }

    // Filter by token
    if (tokenFilter !== "all") {
      filtered = filtered.filter((ad) => ad.token_id === tokenFilter)
    }

    setFilteredAds(filtered)
  }

  const handleContactSeller = (ad: any) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to contact the seller",
        variant: "destructive",
      })
      router.push("/auth/login")
      return
    }

    // Here you could implement a chat system or redirect to order creation
    toast({
      title: "Contact Seller",
      description: "Feature coming soon! For now, please create an order directly.",
    })
  }

  if (loading || loadingAds) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
                  Crypto Market
                </h1>
                <p className="text-gray-600">Buy and sell crypto with verified traders</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button asChild>
                <Link href="/buy">Quick Buy</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/sell">Quick Sell</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-8 bg-white/70 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Find the Best Deals</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Input
                  placeholder="Search ads, tokens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/80"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-white/80">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="buy">Buy Offers</SelectItem>
                  <SelectItem value="sell">Sell Offers</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tokenFilter} onValueChange={setTokenFilter}>
                <SelectTrigger className="bg-white/80">
                  <SelectValue placeholder="All Tokens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tokens</SelectItem>
                  {tokens.map((token) => (
                    <SelectItem key={token.id} value={token.id}>
                      {token.symbol} - {token.network}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm text-gray-600 flex items-center">
                <Coins className="h-4 w-4 mr-1" />
                {filteredAds.length} offers available
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Market Ads Grid */}
        {filteredAds.length === 0 ? (
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="text-center py-12">
              <Coins className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No offers found</h3>
              <p className="text-gray-500">Try adjusting your filters or check back later for new offers.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAds.map((ad) => (
              <div key={ad.id} className="relative group">
                {/* Rainbow Border Animation */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 via-purple-600 via-blue-600 via-green-600 via-yellow-600 to-red-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-gradient-x"></div>

                <Card className="relative bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <Badge
                        variant={ad.type === "buy" ? "default" : "outline"}
                        className={`${
                          ad.type === "buy"
                            ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                            : "bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-0"
                        } px-3 py-1`}
                      >
                        {ad.type === "buy" ? (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        )}
                        {ad.type === "buy" ? "BUYING" : "SELLING"}
                      </Badge>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(ad.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <CardTitle className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      {ad.title}
                    </CardTitle>
                    {ad.description && (
                      <CardDescription className="text-sm text-gray-600">{ad.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Token Info */}
                    <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                      <Image
                        src={ad.tokens.logo || "/placeholder.svg"}
                        alt={ad.tokens.name}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                      <div>
                        <p className="font-semibold text-gray-800">{ad.tokens.symbol}</p>
                        <p className="text-xs text-gray-600">{ad.tokens.network}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Price per {ad.tokens.symbol}</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Rp {ad.price_idr.toLocaleString()}
                      </p>
                    </div>

                    {/* Amount Range */}
                    {(ad.min_amount || ad.max_amount) && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-medium">
                          {ad.min_amount && ad.max_amount
                            ? `${ad.min_amount} - ${ad.max_amount} ${ad.tokens.symbol}`
                            : ad.min_amount
                              ? `Min: ${ad.min_amount} ${ad.tokens.symbol}`
                              : `Max: ${ad.max_amount} ${ad.tokens.symbol}`}
                        </span>
                      </div>
                    )}

                    {/* Payment Methods */}
                    {ad.payment_methods && ad.payment_methods.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Payment Methods:</p>
                        <div className="flex flex-wrap gap-1">
                          {ad.payment_methods.slice(0, 3).map((method: string) => (
                            <Badge key={method} variant="secondary" className="text-xs">
                              {method.toUpperCase()}
                            </Badge>
                          ))}
                          {ad.payment_methods.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{ad.payment_methods.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Trader Info */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{ad.users?.username || "Verified Trader"}</span>
                      </div>
                      <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                        ✓ Verified
                      </Badge>
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => handleContactSeller(ad)}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {ad.type === "buy" ? "Sell to Trader" : "Buy from Trader"}
                    </Button>

                    {/* Terms */}
                    {ad.terms && (
                      <details className="text-xs text-gray-600">
                        <summary className="cursor-pointer hover:text-gray-800">Terms & Conditions</summary>
                        <p className="mt-2 p-2 bg-gray-50 rounded">{ad.terms}</p>
                      </details>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom CSS for gradient animation */}
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            background-size: 200% 200%;
            background-position: left center;
          }
          50% {
            background-size: 200% 200%;
            background-position: right center;
          }
        }
        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  )
}
