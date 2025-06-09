"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { AdminPriceUpdater } from "@/components/admin-price-updater"
import { ApiUsageMonitor } from "@/components/api-usage-monitor"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowUpRight,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Settings,
  Database,
  Activity,
} from "lucide-react"

interface Order {
  id: string
  order_number: string
  created_at: string
  type: "buy" | "sell"
  status: "pending" | "confirmed" | "completed" | "cancelled"
  quantity: number
  price_per_unit: number
  total_price: number
  token_id: string
  user_id: string
  tokens: {
    name: string
    symbol: string
    network: string
  }
  users: {
    username: string
    email: string
  }
}

interface Token {
  id: string
  name: string
  symbol: string
  price_idr: number
  price_usd: number
  network: string
  contract_address: string
  is_active: boolean
  logo_url: string
  created_at: string
}

interface Stats {
  totalUsers: number
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  cancelledOrders: number
  totalVolume: number
  todayVolume: number
  weeklyVolume: number
  monthlyVolume: number
}

interface SystemAlert {
  id: string
  title: string
  description: string
  type: "warning" | "error" | "info"
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const { user, userProfile, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [tokens, setTokens] = useState<Token[]>([])
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalVolume: 0,
    todayVolume: 0,
    weeklyVolume: 0,
    monthlyVolume: 0,
  })
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
      return
    }

    if (!authLoading && user && !userProfile?.is_admin) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      })
      router.push("/dashboard")
      return
    }

    if (user && userProfile?.is_admin) {
      fetchData()
      // Auto refresh every 2 minutes
      const interval = setInterval(fetchData, 120000)
      return () => clearInterval(interval)
    }
  }, [user, userProfile, authLoading, router, toast])

  const fetchData = async () => {
    if (!user || !userProfile?.is_admin) return

    setRefreshing(true)
    try {
      await Promise.all([fetchOrders(), fetchTokens(), fetchStats(), fetchSystemAlerts()])
      setLastUpdated(new Date())
      toast({
        title: "Data Updated",
        description: "Dashboard data has been refreshed",
      })
    } catch (error) {
      console.error("Error fetching admin data:", error)
      toast({
        title: "Error",
        description: "Failed to refresh dashboard data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          tokens (name, symbol, network),
          users (username, email)
        `)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
    }
  }

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase.from("tokens").select("*").order("symbol")

      if (error) throw error
      setTokens(data || [])
    } catch (error) {
      console.error("Error fetching tokens:", error)
    }
  }

  const fetchStats = async () => {
    try {
      // Get total users
      const { count: userCount, error: userError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })

      if (userError) throw userError

      // Get order stats
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("status, total_price, created_at, type")

      if (orderError) throw orderError

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      const orders = orderData || []
      const totalOrders = orders.length
      const pendingOrders = orders.filter((order) => ["pending", "confirmed"].includes(order.status)).length
      const completedOrders = orders.filter((order) => order.status === "completed").length
      const cancelledOrders = orders.filter((order) => order.status === "cancelled").length

      const completedOrdersData = orders.filter((order) => order.status === "completed")
      const totalVolume = completedOrdersData.reduce(
        (sum, order) => sum + (Number.parseFloat(order.total_price) || 0),
        0,
      )

      const todayOrders = completedOrdersData.filter((order) => new Date(order.created_at) >= today)
      const todayVolume = todayOrders.reduce((sum, order) => sum + (Number.parseFloat(order.total_price) || 0), 0)

      const weeklyOrders = completedOrdersData.filter((order) => new Date(order.created_at) >= weekAgo)
      const weeklyVolume = weeklyOrders.reduce((sum, order) => sum + (Number.parseFloat(order.total_price) || 0), 0)

      const monthlyOrders = completedOrdersData.filter((order) => new Date(order.created_at) >= monthAgo)
      const monthlyVolume = monthlyOrders.reduce((sum, order) => sum + (Number.parseFloat(order.total_price) || 0), 0)

      setStats({
        totalUsers: userCount || 0,
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalVolume,
        todayVolume,
        weeklyVolume,
        monthlyVolume,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const fetchSystemAlerts = async () => {
    // Simulate system alerts - in real app, this would come from monitoring system
    const alerts: SystemAlert[] = []

    // Check API usage
    try {
      const { data: apiLogs } = await supabase
        .from("api_usage_logs")
        .select("*")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      const todayApiCalls = apiLogs?.length || 0
      if (todayApiCalls > 800) {
        alerts.push({
          id: "api-usage-high",
          title: "High API Usage",
          description: `${todayApiCalls} API calls made today. Consider optimizing cache settings.`,
          type: "warning",
          created_at: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error("Error checking API usage:", error)
    }

    // Check pending orders
    if (stats.pendingOrders > 10) {
      alerts.push({
        id: "pending-orders-high",
        title: "High Pending Orders",
        description: `${stats.pendingOrders} orders are pending. Review and process them.`,
        type: "warning",
        created_at: new Date().toISOString(),
      })
    }

    // Check inactive tokens
    const inactiveTokens = tokens.filter((token) => !token.is_active).length
    if (inactiveTokens > 0) {
      alerts.push({
        id: "inactive-tokens",
        title: "Inactive Tokens",
        description: `${inactiveTokens} tokens are currently inactive.`,
        type: "info",
        created_at: new Date().toISOString(),
      })
    }

    setSystemAlerts(alerts)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case "confirmed":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600">
            <RefreshCw className="w-3 h-3 mr-1" />
            Confirmed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge className="bg-red-500 hover:bg-red-600">
            <X className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case "error":
        return <X className="h-5 w-5 text-red-500" />
      case "info":
        return <CheckCircle className="h-5 w-5 text-blue-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString))
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !userProfile?.is_admin) {
    return null
  }

  return (
    <div className="container mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Last updated: {formatDate(lastUpdated.toISOString())}</p>
        </div>
        <Button onClick={fetchData} disabled={refreshing} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              {loading ? <Skeleton className="h-8 w-20" /> : stats.totalUsers.toLocaleString()}
            </div>
            <p className="text-xs text-blue-600 mt-1">Registered users</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">
              {loading ? <Skeleton className="h-8 w-20" /> : stats.totalOrders.toLocaleString()}
            </div>
            <p className="text-xs text-green-600 mt-1">
              {stats.completedOrders} completed ({Math.round((stats.completedOrders / stats.totalOrders) * 100) || 0}%)
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800">
              {loading ? <Skeleton className="h-8 w-20" /> : formatCurrency(stats.totalVolume)}
            </div>
            <p className="text-xs text-purple-600 mt-1">
              {formatCurrency(stats.todayVolume)} today
              {stats.todayVolume > 0 && <ArrowUpRight className="inline h-3 w-3 text-green-500 ml-1" />}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-800">
              {loading ? <Skeleton className="h-8 w-20" /> : stats.pendingOrders}
            </div>
            <p className="text-xs text-yellow-600 mt-1">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="tokens" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Tokens
          </TabsTrigger>
          <TabsTrigger value="market" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Market
          </TabsTrigger>
          <TabsTrigger value="api-usage" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            API Usage
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Price Management */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Price Management
                </CardTitle>
                <CardDescription>Update token prices and manage market data</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminPriceUpdater />
              </CardContent>
            </Card>

            {/* System Alerts */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  System Alerts
                </CardTitle>
                <CardDescription>Monitor system health and performance</CardDescription>
              </CardHeader>
              <CardContent>
                {systemAlerts.length > 0 ? (
                  <div className="space-y-4">
                    {systemAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`flex items-start gap-4 p-4 rounded-lg border ${
                          alert.type === "warning"
                            ? "bg-amber-50 border-amber-200"
                            : alert.type === "error"
                              ? "bg-red-50 border-red-200"
                              : "bg-blue-50 border-blue-200"
                        }`}
                      >
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <h4 className="font-medium">{alert.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5" />
                    <span>All systems operational</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Volume Analytics */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Volume Analytics
              </CardTitle>
              <CardDescription>Trading volume breakdown by time period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-800">{formatCurrency(stats.todayVolume)}</div>
                  <div className="text-sm text-blue-600">Today</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-800">{formatCurrency(stats.weeklyVolume)}</div>
                  <div className="text-sm text-green-600">This Week</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-800">{formatCurrency(stats.monthlyVolume)}</div>
                  <div className="text-sm text-purple-600">This Month</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Recent Orders
              </CardTitle>
              <CardDescription>Manage and monitor all platform orders</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Token</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">#{order.order_number}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.users?.username || "Unknown"}</div>
                              <div className="text-xs text-gray-500">{order.users?.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={order.type === "buy" ? "default" : "secondary"}>
                              {order.type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.tokens?.symbol}</div>
                              <div className="text-xs text-gray-500">{order.tokens?.network}</div>
                            </div>
                          </TableCell>
                          <TableCell>{Number.parseFloat(order.quantity.toString()).toFixed(8)}</TableCell>
                          <TableCell>{formatCurrency(order.total_price)}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-xs">{formatDate(order.created_at)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/admin/orders/${order.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" disabled>
                Previous
              </Button>
              <span className="text-sm text-gray-500">Showing latest 20 orders</span>
              <Button variant="outline" disabled>
                Next
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Tokens Tab */}
        <TabsContent value="tokens" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Token Management
              </CardTitle>
              <CardDescription>Manage available tokens and their settings</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Price (IDR)</TableHead>
                        <TableHead>Price (USD)</TableHead>
                        <TableHead>Network</TableHead>
                        <TableHead>Contract</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tokens.map((token) => (
                        <TableRow key={token.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <img
                                src={token.logo_url || "/placeholder.svg"}
                                alt={token.name}
                                className="w-6 h-6 rounded-full"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg?height=24&width=24"
                                }}
                              />
                              {token.name}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{token.symbol}</TableCell>
                          <TableCell>{formatCurrency(token.price_idr)}</TableCell>
                          <TableCell>${token.price_usd?.toFixed(2) || "0.00"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{token.network}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {token.contract_address?.substring(0, 6)}...
                            {token.contract_address?.substring(token.contract_address.length - 4)}
                          </TableCell>
                          <TableCell>
                            {token.is_active ? (
                              <Badge className="bg-green-500">Active</Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/admin/tokens/${token.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push("/admin/tokens")}>Manage Tokens</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Market Tab */}
        <TabsContent value="market" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Market Management
              </CardTitle>
              <CardDescription>Configure market settings and parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Trading Fee</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">0.5%</div>
                      <p className="text-xs text-muted-foreground">Applied to all transactions</p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" size="sm">
                        Adjust Fee
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Market Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-500">Online</div>
                      <p className="text-xs text-muted-foreground">Last maintenance: 7 days ago</p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" size="sm">
                        Toggle Status
                      </Button>
                    </CardFooter>
                  </Card>
                </div>

                <div className="flex gap-4">
                  <Button onClick={() => router.push("/admin/market")}>Advanced Market Settings</Button>
                  <Button variant="outline" onClick={() => router.push("/analytics")}>
                    View Analytics
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Usage Tab */}
        <TabsContent value="api-usage" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                API Usage Monitor
              </CardTitle>
              <CardDescription>Track and optimize external API usage</CardDescription>
            </CardHeader>
            <CardContent>
              <ApiUsageMonitor />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
