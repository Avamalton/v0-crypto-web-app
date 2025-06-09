"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react"

export function AdminPriceUpdater() {
  const [updating, setUpdating] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<any>(null)
  const { toast } = useToast()

  const updatePrices = async () => {
    setUpdating(true)
    try {
      const response = await fetch("/api/update-token-prices", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setLastUpdate(data)
        toast({
          title: "Prices Updated",
          description: `Successfully updated ${data.updated.length} tokens`,
        })
      } else {
        throw new Error(data.error || "Failed to update prices")
      }
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5" />
          <span>Price Management</span>
        </CardTitle>
        <CardDescription>Update cryptocurrency prices from CoinMarketCap API</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={updatePrices} disabled={updating} className="w-full">
          <RefreshCw className={`h-4 w-4 mr-2 ${updating ? "animate-spin" : ""}`} />
          {updating ? "Updating Prices..." : "Update All Prices"}
        </Button>

        {lastUpdate && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Update:</span>
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {new Date(lastUpdate.timestamp).toLocaleString()}
              </Badge>
            </div>

            <div className="text-sm">
              <p className="mb-2 font-medium">Update Results:</p>
              <div className="space-y-1">
                {lastUpdate.updated.map((token: any) => (
                  <div key={token.symbol} className="flex items-center justify-between">
                    <span className="flex items-center">
                      <CheckCircle className="h-3 w-3 text-green-600 mr-1" />
                      {token.symbol}
                    </span>
                    <span className="text-xs text-gray-600">Rp {token.price_idr.toLocaleString()}</span>
                  </div>
                ))}
                {lastUpdate.failed.map((token: any) => (
                  <div key={token.symbol} className="flex items-center justify-between">
                    <span className="flex items-center">
                      <XCircle className="h-3 w-3 text-red-600 mr-1" />
                      {token.symbol}
                    </span>
                    <span className="text-xs text-red-600">{token.error}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
