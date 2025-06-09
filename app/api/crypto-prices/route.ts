import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const CMC_API_KEY = process.env.CMC_API_KEY
const CMC_BASE_URL = "https://pro-api.coinmarketcap.com/v1"

// Cache duration: 1 hour in milliseconds
const CACHE_DURATION = 60 * 60 * 1000

// Mapping token symbols to CoinMarketCap IDs
const TOKEN_MAPPING: Record<string, number> = {
  BTC: 1,
  ETH: 1027,
  USDT: 825,
  USDC: 3408,
  BNB: 1839,
  ADA: 2010,
  SOL: 5426,
  DOT: 6636,
  MATIC: 3890,
  AVAX: 5805,
  LINK: 1975,
  UNI: 7083,
  LTC: 2,
  BCH: 1831,
  XRP: 52,
  DOGE: 74,
  SHIB: 5994,
  TRX: 1958,
  ATOM: 3794,
  FTM: 3513,
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const symbols = searchParams.get("symbols")?.split(",") || []
    const forceRefresh = searchParams.get("force") === "true"

    if (symbols.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No symbols provided",
        },
        { status: 400 },
      )
    }

    // Step 1: Check cached prices in database
    const { data: cachedPrices, error: cacheError } = await supabase
      .from("price_cache")
      .select("*")
      .in(
        "token_symbol",
        symbols.map((s) => s.toUpperCase()),
      )

    if (cacheError) {
      console.error("Error fetching cached prices:", cacheError)
    }

    const now = new Date()
    const cachedData: Record<string, any> = {}
    const symbolsNeedingRefresh: string[] = []

    // Step 2: Check which symbols have fresh cache data (< 1 hour old)
    symbols.forEach((symbol) => {
      const upperSymbol = symbol.toUpperCase()
      const cached = cachedPrices?.find((p) => p.token_symbol === upperSymbol)

      if (cached && !forceRefresh) {
        const lastUpdated = new Date(cached.last_updated)
        const isStale = now.getTime() - lastUpdated.getTime() > CACHE_DURATION

        if (!isStale) {
          // Use cached data (fresh)
          cachedData[upperSymbol] = {
            usd: Number(cached.price_usd),
            idr: Number(cached.price_idr),
            change_24h: Number(cached.price_change_24h || 0),
            volume_24h: Number(cached.volume_24h || 0),
            market_cap: Number(cached.market_cap || 0),
            cached: true,
            last_updated: cached.last_updated,
          }
        } else {
          // Cache is stale, need refresh
          symbolsNeedingRefresh.push(upperSymbol)
        }
      } else {
        // No cache or force refresh
        symbolsNeedingRefresh.push(upperSymbol)
      }
    })

    // Step 3: If all data is cached and fresh, return immediately
    if (symbolsNeedingRefresh.length === 0) {
      await logApiUsage("cache", "/crypto-prices", symbols, true, null, Date.now() - startTime)

      return NextResponse.json({
        success: true,
        data: cachedData,
        timestamp: new Date().toISOString(),
        source: "cache",
        cache_hit: true,
        message: "All data served from cache",
      })
    }

    // Step 4: Fetch fresh data for symbols that need refresh
    const freshData: Record<string, any> = {}
    const usdToIdr = await getUSDToIDRRate()

    if (!CMC_API_KEY) {
      // Generate mock data if no API key
      for (const symbol of symbolsNeedingRefresh) {
        const mockPrice = generateMockPrice(symbol)
        freshData[symbol] = {
          usd: mockPrice,
          idr: Math.round(mockPrice * usdToIdr),
          change_24h: (Math.random() - 0.5) * 20,
          volume_24h: Math.random() * 1000000000,
          market_cap: Math.random() * 100000000000,
          cached: false,
          mock: true,
        }

        // Save mock data to cache
        await updatePriceCache(
          symbol,
          mockPrice,
          mockPrice * usdToIdr,
          freshData[symbol].change_24h,
          freshData[symbol].volume_24h,
          freshData[symbol].market_cap,
        )
      }

      await logApiUsage("mock", "/crypto-prices", symbolsNeedingRefresh, true, null, Date.now() - startTime)
    } else {
      // Get CoinMarketCap IDs for symbols needing refresh
      const cmcIds = symbolsNeedingRefresh.map((symbol) => TOKEN_MAPPING[symbol]).filter((id) => id !== undefined)

      if (cmcIds.length > 0) {
        try {
          // Fetch from CoinMarketCap
          const response = await fetch(
            `${CMC_BASE_URL}/cryptocurrency/quotes/latest?id=${cmcIds.join(",")}&convert=USD`,
            {
              headers: {
                "X-CMC_PRO_API_KEY": CMC_API_KEY,
                Accept: "application/json",
              },
            },
          )

          if (!response.ok) {
            throw new Error(`CoinMarketCap API error: ${response.status}`)
          }

          const cmcData = await response.json()

          if (cmcData.status?.error_code !== 0) {
            throw new Error(cmcData.status?.error_message || "CoinMarketCap API error")
          }

          // Step 5: Process and cache the fresh data
          for (const coin of Object.values(cmcData.data) as any[]) {
            const symbol = coin.symbol
            const usdPrice = coin.quote?.USD?.price || 0
            const change24h = coin.quote?.USD?.percent_change_24h || 0
            const volume24h = coin.quote?.USD?.volume_24h || 0
            const marketCap = coin.quote?.USD?.market_cap || 0

            freshData[symbol] = {
              usd: Number(usdPrice.toFixed(8)),
              idr: Math.round(usdPrice * usdToIdr),
              change_24h: Number(change24h.toFixed(2)),
              volume_24h: Number(volume24h.toFixed(0)),
              market_cap: Number(marketCap.toFixed(0)),
              cached: false,
            }

            // Save to database cache
            await updatePriceCache(symbol, usdPrice, usdPrice * usdToIdr, change24h, volume24h, marketCap)
          }

          await logApiUsage(
            "coinmarketcap",
            "/crypto-prices",
            symbolsNeedingRefresh,
            true,
            null,
            Date.now() - startTime,
          )
        } catch (error) {
          console.error("Error fetching from CMC:", error)
          await logApiUsage(
            "coinmarketcap",
            "/crypto-prices",
            symbolsNeedingRefresh,
            false,
            error instanceof Error ? error.message : "Unknown error",
            Date.now() - startTime,
          )

          // Fallback to stale cached data if available
          for (const symbol of symbolsNeedingRefresh) {
            const cached = cachedPrices?.find((p) => p.token_symbol === symbol)
            if (cached) {
              freshData[symbol] = {
                usd: Number(cached.price_usd),
                idr: Number(cached.price_idr),
                change_24h: Number(cached.price_change_24h || 0),
                volume_24h: Number(cached.volume_24h || 0),
                market_cap: Number(cached.market_cap || 0),
                cached: true,
                stale: true,
                error: "API error, using stale cache",
              }
            } else {
              // No cache available, return zeros
              freshData[symbol] = {
                usd: 0,
                idr: 0,
                change_24h: 0,
                volume_24h: 0,
                market_cap: 0,
                cached: false,
                error: "No data available",
              }
            }
          }
        }
      }
    }

    // Step 6: Combine cached and fresh data
    const combinedData = { ...cachedData, ...freshData }

    return NextResponse.json({
      success: true,
      data: combinedData,
      timestamp: new Date().toISOString(),
      usd_to_idr_rate: usdToIdr,
      source: symbolsNeedingRefresh.length > 0 ? "mixed" : "cache",
      cache_hit: symbolsNeedingRefresh.length === 0,
      refreshed_symbols: symbolsNeedingRefresh,
      cached_symbols: Object.keys(cachedData),
      api_calls_saved: Object.keys(cachedData).length,
      message: `${Object.keys(cachedData).length} symbols from cache, ${symbolsNeedingRefresh.length} refreshed from API`,
    })
  } catch (error) {
    console.error("Error in crypto-prices API:", error)
    await logApiUsage(
      "error",
      "/crypto-prices",
      [],
      false,
      error instanceof Error ? error.message : "Unknown error",
      Date.now() - startTime,
    )

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        source: "error",
      },
      { status: 500 },
    )
  }
}

// Function to update price cache in database
async function updatePriceCache(
  symbol: string,
  priceUsd: number,
  priceIdr: number,
  change24h: number,
  volume24h: number,
  marketCap: number,
) {
  try {
    // Use the database function we created earlier
    const { error } = await supabase.rpc("update_price_cache", {
      p_symbol: symbol,
      p_price_usd: priceUsd,
      p_price_idr: priceIdr,
      p_change_24h: change24h,
      p_volume_24h: volume24h,
      p_market_cap: marketCap,
    })

    if (error) {
      console.error(`Error updating cache for ${symbol}:`, error)
    }
  } catch (error) {
    console.error(`Error updating price cache for ${symbol}:`, error)
  }
}

// Function to log API usage
async function logApiUsage(
  provider: string,
  endpoint: string,
  tokens: string[],
  success: boolean,
  errorMessage: string | null,
  responseTime: number,
) {
  try {
    const { error } = await supabase.from("api_usage_log").insert({
      api_provider: provider,
      endpoint: endpoint,
      tokens_requested: tokens,
      success: success,
      error_message: errorMessage,
      response_time_ms: responseTime,
    })

    if (error) {
      console.error("Error logging API usage:", error)
    }
  } catch (error) {
    console.error("Error logging API usage:", error)
  }
}

// Function to get USD to IDR exchange rate
async function getUSDToIDRRate(): Promise<number> {
  try {
    // Check if we have cached exchange rate (cache for 4 hours)
    const { data: rateCache } = await supabase
      .from("exchange_rate_cache")
      .select("*")
      .eq("from_currency", "USD")
      .eq("to_currency", "IDR")
      .gte("last_updated", new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
      .single()

    if (rateCache) {
      return Number(rateCache.rate)
    }

    // Fetch fresh exchange rate
    const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD")

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rate")
    }

    const data = await response.json()
    const rate = data.rates.IDR || 15800

    // Cache the exchange rate
    await supabase.from("exchange_rate_cache").upsert({
      from_currency: "USD",
      to_currency: "IDR",
      rate: rate,
      last_updated: new Date().toISOString(),
    })

    return rate
  } catch (error) {
    console.error("Error fetching USD to IDR rate:", error)
    return 15800 // Fallback rate
  }
}

// Function to generate mock price for testing
function generateMockPrice(symbol: string): number {
  const basePrices: Record<string, number> = {
    BTC: 45000,
    ETH: 3000,
    BNB: 300,
    ADA: 0.5,
    SOL: 100,
    DOT: 7,
    MATIC: 0.8,
    AVAX: 35,
    LINK: 15,
    UNI: 6,
    LTC: 70,
    BCH: 250,
    XRP: 0.6,
    DOGE: 0.08,
    SHIB: 0.000025,
    USDT: 1,
    USDC: 1,
  }

  const basePrice = basePrices[symbol] || 1
  // Add some random variation (±5%)
  const variation = (Math.random() - 0.5) * 0.1
  return basePrice * (1 + variation)
}
