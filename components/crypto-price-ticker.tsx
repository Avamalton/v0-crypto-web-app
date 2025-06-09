"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, TrendingUp, TrendingDown, Clock, Database, Wifi } from "lucide-react"

interface Token {
  id: string
  symbol: string
  name: string
  price_idr: number
  price_usd?: number | null
  price_change_24h?: number | null
  last_price_update?: string | null
  cmc_id?: number | null
}

interface PriceData {
  idr: number
  usd: number
  change_24h: number
  volume_24h?: number
  market_cap?: number
  cached?: boolean
  stale?: boolean
  error?: boolean
  last_updated?: string
}

interface CryptoPriceTickerProps {
  tokens: Token[]
  compact?: boolean
  showRefresh?: boolean
  showCacheInfo?: boolean
}

export function CryptoPriceTicker({
  tokens,
  compact = false,
  showRefresh = true,
  showCacheInfo = false,
}: CryptoPriceTickerProps) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cacheInfo, setCacheInfo] = useState<{
    cached_symbols: string[]
    refreshed_symbols: string[]
    cache_hit: boolean
    source: string
  } | null>(null)

  const fetchPrices = async (forceRefresh = false) => {
    if (tokens.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const symbols = tokens.map((token) => token.symbol).join(",")
      const url = `/api/crypto-prices?symbols=${symbols}${forceRefresh ? "&force=true" : ""}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.data) {
        setPrices(data.data)
        setLastUpdate(new Date())
        setCacheInfo({
          cached_symbols: data.cached_symbols || [],
          refreshed_symbols: data.refreshed_symbols || [],
          cache_hit: data.cache_hit || false,
          source: data.source || "unknown",
        })
      } else {
        throw new Error(data.message || "Failed to fetch prices")
      }
    } catch (error) {
      console.error("Error fetching prices:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch prices")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tokens.length > 0) {
      fetchPrices()

      // Auto-refresh every 5 minutes (since we have caching)
      const interval = setInterval(() => fetchPrices(), 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [tokens])

  const formatPrice = (price: number | null | undefined): string => {
    const safePrice = price || 0
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(safePrice)
  }

  const formatUSDPrice = (price: number | null | undefined): string => {
    const safePrice = price || 0
    return safePrice.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    })
  }

  const formatChange = (change: number | null | undefined): string => {
    const safeChange = change || 0
    return `${safeChange > 0 ? "+" : ""}${safeChange.toFixed(2)}%`
  }

  const getTokenPrice = (token: Token): PriceData => {
    const livePrice = prices[token.symbol]
    return {
      idr: livePrice?.idr || token.price_idr || 0,
      usd: livePrice?.usd || token.price_usd || 0,
      change_24h: livePrice?.change_24h || token.price_change_24h || 0,
      volume_24h: livePrice?.volume_24h || 0,
      market_cap: livePrice?.market_cap || 0,
      cached: livePrice?.cached || false,
      stale: livePrice?.stale || false,
      error: livePrice?.error || false,
      last_updated: livePrice?.last_updated,
    }
  }

  if (tokens.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <p>No tokens available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-4 overflow-x-auto pb-2">
        {tokens.slice(0, 5).map((token) => {
          const price = getTokenPrice(token)
          const isPositive = price.change_24h >= 0

          return (
            <div key={token.id} className="flex items-center space-x-2 whitespace-nowrap">
              <span className="font-medium">{token.symbol}</span>
              <span className="text-sm">{formatPrice(price.idr)}</span>
              <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
                {formatChange(price.change_24h)}
              </Badge>
              {price.cached && <Database className="h-3 w-3 text-blue-500" title="Cached data" />}
            </div>
          )
        })}
        {loading && <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />}
        {error && <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">Error loading prices</div>}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <span>Live Crypto Prices</span>
          <Badge
            variant="outline"
            className={`${loading ? "bg-yellow-50 text-yellow-700" : "bg-green-50 text-green-700"}`}
          >
            {loading ? "UPDATING..." : "LIVE"}
          </Badge>
          {cacheInfo && showCacheInfo && (
            <Badge variant="secondary" className="text-xs">
              {cacheInfo.source === "cache" ? (
                <>
                  <Database className="h-3 w-3 mr-1" />
                  CACHED
                </>
              ) : cacheInfo.source === "mixed" ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  MIXED
                </>
              ) : (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  LIVE
                </>
              )}
            </Badge>
          )}
        </CardTitle>
        {showRefresh && (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => fetchPrices()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchPrices(true)} disabled={loading}>
              <Wifi className="h-4 w-4 mr-2" />
              Force Update
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">⚠️ {error}</p>
            <p className="text-xs text-red-500 mt-1">Showing cached prices. Click refresh to try again.</p>
          </div>
        )}

        {cacheInfo && showCacheInfo && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm">
              <p className="font-medium mb-2">Cache Information:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-medium">Cached:</span> {cacheInfo.cached_symbols.length} tokens
                </div>
                <div>
                  <span className="font-medium">Refreshed:</span> {cacheInfo.refreshed_symbols.length} tokens
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Source:</span> {cacheInfo.source}
                  {cacheInfo.cache_hit && <span className="text-green-600 ml-1">(100% cache hit)</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tokens.map((token) => {
            const price = getTokenPrice(token)
            const isPositive = price.change_24h >= 0

            return (
              <div key={token.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-lg">{token.symbol}</h3>
                      {price.cached && <Database className="h-4 w-4 text-blue-500" title="Data from cache" />}
                      {price.stale && <Clock className="h-4 w-4 text-orange-500" title="Stale cached data" />}
                      {price.error && <div className="h-4 w-4 bg-red-500 rounded-full" title="Error fetching data" />}
                    </div>
                    <p className="text-sm text-gray-600">{token.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatPrice(price.idr)}</p>
                    <p className="text-sm text-gray-600">{formatUSDPrice(price.usd)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
                    {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {formatChange(price.change_24h)}
                  </Badge>
                  <span className="text-xs text-gray-500">24h change</span>
                </div>

                {price.last_updated && (
                  <div className="mt-2 text-xs text-gray-400">
                    Updated: {new Date(price.last_updated).toLocaleTimeString()}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {lastUpdate && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refresh every 5 minutes
              {cacheInfo && (
                <span className="ml-2">
                  • API calls saved: {cacheInfo.cached_symbols.length}/{tokens.length}
                </span>
              )}
            </p>
          </div>
        )}

        {!loading && Object.keys(prices).length === 0 && !error && (
          <div className="text-center py-4">
            <p className="text-gray-500 mb-2">No prices available</p>
            <Button variant="outline" size="sm" onClick={() => fetchPrices()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Load Prices
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
