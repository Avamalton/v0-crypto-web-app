"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, DollarSign, Activity, Calendar, RefreshCw, PieChart, LineChart, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// Simple chart components (you can replace with recharts or other chart library)
const SimpleBarChart = ({ data, title }: { data: any[]; title: string }) => {
  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <div className="space-y-4">

      <div className="space-y-2">
 
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-20 text-sm text-gray-600">{item.label}</div>
            <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <div className="w-16 text-sm font-medium text-right">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const SimplePieChart = ({ data, title }: { data: any[]; title: string }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let currentAngle = 0

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm text-gray-600">{title}</h4>
      <div className="flex items-center space-x-6">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100
              const strokeDasharray = `${percentage} ${100 - percentage}`
              const strokeDashoffset = -currentAngle
              currentAngle += percentage

              const colors = [
                "stroke-blue-500",
                "stroke-purple-500",
                "stroke-green-500",
                "stroke-yellow-500",
                "stroke-red-500",
              ]

              return (
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r="15.915"
                  fill="transparent"
                  className={colors[index % colors.length]}
                  strokeWidth="8"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              )
            })}
          </svg>
        </div>
        <div className="space-y-2">
          {data.map((item, index) => {
            const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-yellow-500", "bg-red-500"]
            return (
              <div key={index} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                <span className="text-sm text-gray-600">{item.label}</span>
                <span className="text-sm font-medium">{item.value}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const SimpleLineChart = ({ data, title }: { data: any[]; title: string }) => {
  const maxValue = Math.max(...data.map((d) => d.value))
  const minValue = Math.min(...data.map((d) => d.value))
  const range = maxValue - minValue || 1

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm text-gray-600">{title}</h4>
      <div className="h-40 relative bg-gradient-to-t from-blue-50 to-transparent rounded-lg p-4">
        <svg className="w-full h-full" viewBox="0 0 400 120">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
          {data.map((point, index) => {
            if (index === 0) return null
            const x1 = ((index - 1) / (data.length - 1)) * 380 + 10
            const y1 = 110 - ((data[index - 1].value - minValue) / range) * 100
            const x2 = (index / (data.length - 1)) * 380 + 10
            const y2 = 110 - ((point.value - minValue) / range) * 100

            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="url(#lineGradient)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )
          })}
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * 380 + 10
            const y = 110 - ((point.value - minValue) / range) * 100

            return <circle key={index} cx={x} cy={y} r="4" fill="url(#lineGradient)" className="drop-shadow-sm" />
          })}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-4">
          {data.map((point, index) => (
            <span key={index}>{point.label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { user, loading } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [timeRange, setTimeRange] = useState("7d")
  const [loadingData, setLoadingData] = useState(true)
  const [analytics, setAnalytics] = useState({
    totalVolume: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    successRate: 0,
    monthlyGrowth: 0,
    topTokens: [] as any[],
    ordersByStatus: [] as any[],
    dailyVolume: [] as any[],
    paymentMethods: [] as any[],
  })
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchAnalytics()
    }
  }, [user, timeRange])

  const fetchAnalytics = async () => {
    setLoadingData(true)
    try {
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()

      switch (timeRange) {
        case "7d":
          startDate.setDate(endDate.getDate() - 7)
          break
        case "30d":
          startDate.setDate(endDate.getDate() - 30)
          break
        case "90d":
          startDate.setDate(endDate.getDate() - 90)
          break
        case "1y":
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }

      // Fetch orders data
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select(`
          *,
          tokens (name, symbol, network)
        `)
        .eq("user_id", user?.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true })

      if (error) throw error

      setOrders(ordersData || [])

      // Calculate analytics
      const totalOrders = ordersData?.length || 0
      const completedOrders = ordersData?.filter((o) => o.status === "completed") || []
      const totalVolume = completedOrders.reduce((sum, order) => sum + order.total_price, 0)
      const avgOrderValue = totalOrders > 0 ? totalVolume / totalOrders : 0
      const successRate = totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0

      // Top tokens
      const tokenStats =
        ordersData?.reduce((acc: any, order) => {
          const symbol = order.tokens.symbol
          if (!acc[symbol]) {
            acc[symbol] = { symbol, count: 0, volume: 0 }
          }
          acc[symbol].count += 1
          if (order.status === "completed") {
            acc[symbol].volume += order.total_price
          }
          return acc
        }, {}) || {}

      const topTokens = Object.values(tokenStats)
        .sort((a: any, b: any) => b.volume - a.volume)
        .slice(0, 5)
        .map((token: any) => ({
          label: token.symbol,
          value: token.count,
        }))

      // Orders by status
      const statusStats =
        ordersData?.reduce((acc: any, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1
          return acc
        }, {}) || {}

      const ordersByStatus = Object.entries(statusStats).map(([status, count]) => ({
        label: status,
        value: count as number,
      }))

      // Daily volume (last 7 days)
      const dailyStats: any = {}
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split("T")[0]
        dailyStats[dateStr] = 0
      }

      completedOrders.forEach((order) => {
        const dateStr = order.created_at.split("T")[0]
        if (dailyStats[dateStr] !== undefined) {
          dailyStats[dateStr] += order.total_price
        }
      })

      const dailyVolume = Object.entries(dailyStats).map(([date, volume]) => ({
        label: new Date(date).toLocaleDateString("id-ID", { month: "short", day: "numeric" }),
        value: volume as number,
      }))

      // Payment methods
      const paymentStats =
        ordersData?.reduce((acc: any, order) => {
          if (order.payment_method) {
            acc[order.payment_method] = (acc[order.payment_method] || 0) + 1
          }
          return acc
        }, {}) || {}

      const paymentMethods = Object.entries(paymentStats).map(([method, count]) => ({
        label: method,
        value: count as number,
      }))

      setAnalytics({
        totalVolume,
        totalOrders,
        avgOrderValue,
        successRate,
        monthlyGrowth: 12.5, // Mock data
        topTokens,
        ordersByStatus,
        dailyVolume,
        paymentMethods,
      })
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoadingData(false)
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
      {/* Header */}
                  <div className="bg-white shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Analytics
          </h1>
          <p className="text-gray-600">Insights into your trading performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
          </div>
 
      

      {loadingData ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">Total Volume</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-200" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Rp {analytics.totalVolume.toLocaleString()}</div>
                <div className="flex items-center space-x-1 text-blue-100 text-sm mt-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>+{analytics.monthlyGrowth}% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-100">Total Orders</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-200" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalOrders}</div>
                <div className="text-purple-100 text-sm mt-1">
                  {analytics.ordersByStatus.find((s) => s.label === "completed")?.value || 0} completed
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-100">Avg Order Value</CardTitle>
                <Activity className="h-4 w-4 text-green-200" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Rp {analytics.avgOrderValue.toLocaleString()}</div>
                <div className="text-green-100 text-sm mt-1">Per transaction</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-100">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-200" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.successRate.toFixed(1)}%</div>
                <div className="text-orange-100 text-sm mt-1">Order completion rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Daily Volume Chart */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <LineChart className="h-5 w-5" />
                  <span>Daily Volume Trend</span>
                </CardTitle>
                <CardDescription>Trading volume over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleLineChart data={analytics.dailyVolume} title="" />
              </CardContent>
            </Card>

            {/* Top Tokens */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Top Trading Tokens</span>
                </CardTitle>
                <CardDescription>Most traded cryptocurrencies</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart data={analytics.topTokens} title="" />
              </CardContent>
            </Card>

            {/* Order Status Distribution */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Order Status</span>
                </CardTitle>
                <CardDescription>Distribution of order statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <SimplePieChart data={analytics.ordersByStatus} title="" />
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Payment Methods</span>
                </CardTitle>
                <CardDescription>Preferred payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart data={analytics.paymentMethods} title="" />
              </CardContent>
            </Card>
          </div>

          {/* Insights */}
          <Card className="border-0 shadow-lg bg-gradient-to-r from-gray-50 to-gray-100">
            <CardHeader>
              <CardTitle>Trading Insights</CardTitle>
              <CardDescription>AI-powered insights based on your trading patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-lg border">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-600">Performance</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Your success rate of {analytics.successRate.toFixed(1)}% is above average. Keep up the good work!
                  </p>
                </div>

                <div className="p-4 bg-white rounded-lg border">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-600">Activity</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    You've been most active with {analytics.topTokens[0]?.label || "crypto"} trading recently.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-lg border">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-600">Volume</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Your average order value is Rp {analytics.avgOrderValue.toLocaleString()}.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
