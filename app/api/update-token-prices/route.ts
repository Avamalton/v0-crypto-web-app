import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Get all active tokens from database
    const { data: tokens, error: tokensError } = await supabase
      .from("tokens")
      .select("id, symbol, cmc_id")
      .eq("is_active", true)

    if (tokensError) {
      throw new Error(`Database error: ${tokensError.message}`)
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ message: "No tokens found" })
    }

    // Get symbols for API call
    const symbols = tokens.map((token) => token.symbol).join(",")

    // Fetch prices from our crypto-prices API
    const pricesResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/crypto-prices?symbols=${symbols}`,
      { method: "GET" },
    )

    if (!pricesResponse.ok) {
      throw new Error("Failed to fetch prices from API")
    }

    const pricesData = await pricesResponse.json()

    if (!pricesData.success) {
      throw new Error("Price API returned error")
    }

    // Update each token price in database
    const updatePromises = tokens.map(async (token) => {
      const priceInfo = pricesData.data[token.symbol]

      if (priceInfo) {
        const { error } = await supabase
          .from("tokens")
          .update({
            price_idr: priceInfo.idr,
            price_usd: priceInfo.usd,
            price_change_24h: priceInfo.change_24h,
            last_price_update: new Date().toISOString(),
          })
          .eq("id", token.id)

        if (error) {
          console.error(`Error updating ${token.symbol}:`, error)
          return { symbol: token.symbol, success: false, error: error.message }
        }

        return { symbol: token.symbol, success: true, price_idr: priceInfo.idr }
      }

      return { symbol: token.symbol, success: false, error: "Price not found" }
    })

    const results = await Promise.all(updatePromises)

    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    return NextResponse.json({
      success: true,
      message: `Updated ${successful.length} tokens, ${failed.length} failed`,
      updated: successful,
      failed: failed,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Error updating token prices:", error)
    return NextResponse.json({ error: "Failed to update token prices", details: error.message }, { status: 500 })
  }
}
