"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { PublicRecentHistory } from "@/components/public-recent-history"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Coins, TrendingUp, TrendingDown, History, BarChart3, Store } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth()
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalVolume: 0,
  })
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchRecentOrders()
      fetchStats()
    }
  }, [user])

  const fetchRecentOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          tokens (name, symbol, network)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) throw error
      setRecentOrders(data || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
    }
  }

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.from("orders").select("status, total_price").eq("user_id", user?.id)

      if (error) throw error

      const totalOrders = data?.length || 0
      const pendingOrders = data?.filter((order) => order.status === "pending").length || 0
      const completedOrders = data?.filter((order) => order.status === "completed").length || 0
      const totalVolume =
        data?.filter((order) => order.status === "completed").reduce((sum, order) => sum + order.total_price, 0) || 0

      setStats({ totalOrders, pendingOrders, completedOrders, totalVolume })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {userProfile?.username || user.email?.split("@")[0]}! 👋
        </h1>
        <p className="text-blue-100">Ready to trade some crypto today?</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Orders</CardTitle>
            <History className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">{stats.totalOrders}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Pending Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-800">{stats.pendingOrders}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Completed Orders</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">{stats.completedOrders}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Total Volume</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800">Rp {stats.totalVolume.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button
          asChild
          className="h-20 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          <Link href="/buy" className="flex flex-col items-center space-y-2">
            <Coins className="h-6 w-6" />
            <span className="font-semibold">Buy Crypto</span>
          </Link>
        </Button>

        <Button asChild variant="outline" className="h-20 border-2 border-blue-200 hover:bg-blue-50">
          <Link href="/sell" className="flex flex-col items-center space-y-2">
            <TrendingDown className="h-6 w-6 text-blue-600" />
            <span className="font-semibold text-blue-600">Sell Crypto</span>
          </Link>
        </Button>

        <Button asChild variant="outline" className="h-20 border-2 border-purple-200 hover:bg-purple-50">
          <Link href="/market" className="flex flex-col items-center space-y-2">
            <Store className="h-6 w-6 text-purple-600" />
            <span className="font-semibold text-purple-600">Browse Market</span>
          </Link>
        </Button>

        <Button asChild variant="outline" className="h-20 border-2 border-orange-200 hover:bg-orange-50">
          <Link href="/analytics" className="flex flex-col items-center space-y-2">
            <BarChart3 className="h-6 w-6 text-orange-600" />
            <span className="font-semibold text-orange-600">View Analytics</span>
          </Link>
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Recent Orders</span>
            </CardTitle>
            <CardDescription>Your latest trading activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <Coins className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">No orders yet</p>
                <Button asChild>
                  <Link href="/buy">Start Trading</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium">
                        {order.type === "buy" ? "Buy" : "Sell"} {order.tokens.symbol}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.quantity} {order.tokens.symbol} • {order.tokens.network}
                      </p>
                      <p className="text-xs text-gray-500">#{order.order_number}</p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          order.status === "completed"
                            ? "default"
                            : order.status === "pending"
                              ? "secondary"
                              : order.status === "confirmed"
                                ? "outline"
                                : "destructive"
                        }
                      >
                        {order.status}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">Rp {order.total_price.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                <Button asChild variant="outline" className="w-full">
                  <Link href="/orders">View All Orders</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Public Recent History */}
        <PublicRecentHistory />
      </div>
    </div>
  )
}
