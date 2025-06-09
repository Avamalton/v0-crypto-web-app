"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Users, ShoppingCart, TrendingUp, Settings, RefreshCw, Search, Eye } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function AdminPage() {
  const { user, userProfile, loading } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [filteredOrders, setFilteredOrders] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    completedOrders: 0,
    failedOrders: 0,
    totalVolume: 0,
    totalUsers: 0,
  })
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({})
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login")
        return
      }

      if (!userProfile) {
        setAdminError("User profile not found. Please try logging out and back in.")
        return
      }

      if (!userProfile.is_admin) {
        setAdminError("You don't have admin privileges to access this page.")
        setTimeout(() => {
          router.push("/dashboard")
        }, 3000)
        return
      }

      // User is admin, proceed with loading data
      fetchOrders()
      fetchStats()
    }
  }, [user, userProfile, loading, router])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, statusFilter])

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

      if (error) throw error

      console.log("Fetched orders:", data) // Debug log
      setOrders(data || [])

      // Initialize admin notes
      const notes: { [key: string]: string } = {}
      data?.forEach((order) => {
        notes[order.id] = order.admin_notes || ""
      })
      setAdminNotes(notes)
    } catch (error: any) {
      console.error("Error fetching orders:", error)
      toast({
        title: "Error fetching orders",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoadingOrders(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc("get_order_statistics")

      if (error) throw error

      if (data && data.length > 0) {
        const statsData = data[0]
        setStats({
          totalOrders: Number(statsData.total_orders),
          pendingOrders: Number(statsData.pending_orders),
          confirmedOrders: Number(statsData.confirmed_orders),
          completedOrders: Number(statsData.completed_orders),
          failedOrders: Number(statsData.failed_orders),
          totalVolume: Number(statsData.total_volume),
          totalUsers: Number(statsData.total_users),
        })
      }
    } catch (error: any) {
      console.error("Error fetching stats:", error)
      toast({
        title: "Error fetching stats",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const filterOrders = () => {
    let filtered = orders

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.tokens?.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.users?.username?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    setFilteredOrders(filtered)
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdatingOrder(orderId)
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
        admin_notes: adminNotes[orderId] || null,
      }

      const { error } = await supabase.from("orders").update(updateData).eq("id", orderId)

      if (error) throw error

      toast({
        title: "Order Updated",
        description: `Order status updated to ${status}`,
      })

      fetchOrders()
      fetchStats()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setUpdatingOrder(null)
    }
  }

  const updateAdminNotes = async (orderId: string) => {
    try {
      const { error } = await supabase.from("orders").update({ admin_notes: adminNotes[orderId] }).eq("id", orderId)

      if (error) throw error

      toast({
        title: "Notes Updated",
        description: "Admin notes have been updated",
      })

      fetchOrders()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary"
      case "confirmed":
        return "outline"
      case "completed":
        return "default"
      case "failed":
        return "destructive"
      default:
        return "secondary"
    }
  }

  // Show error state if there's an admin error
  if (adminError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">{adminError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state
  if (loading || loadingOrders) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  // Main admin panel content
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
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            </div>
            <div className="flex space-x-2">
              <Button onClick={fetchOrders} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/tokens">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Tokens
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp {stats.totalVolume.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Management */}
        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
            <CardDescription>Manage and update order statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by order number, user, or token..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {orders.length === 0 ? "No orders found" : "No orders match your filters"}
                </p>
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
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.users?.username || "N/A"}</p>
                            <p className="text-sm text-gray-600">{order.users?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.type === "buy" ? "default" : "outline"}>{order.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.tokens?.symbol}</p>
                            <p className="text-sm text-gray-600">{order.tokens?.network}</p>
                          </div>
                        </TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>Rp {order.total_price.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex space-x-1">
                              <Select
                                value={order.status}
                                onValueChange={(value) => updateOrderStatus(order.id, value)}
                                disabled={updatingOrder === order.id}
                              >
                                <SelectTrigger className="w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="confirmed">Confirmed</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/orders/${order.id}`}>
                                  <Eye className="h-3 w-3" />
                                </Link>
                              </Button>
                            </div>
                            {order.tx_hash && (
                              <p className="text-xs text-gray-600 font-mono">TX: {order.tx_hash.substring(0, 10)}...</p>
                            )}
                            <div className="space-y-1">
                              <Textarea
                                placeholder="Admin notes..."
                                value={adminNotes[order.id] || ""}
                                onChange={(e) => setAdminNotes((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                className="text-xs"
                                rows={2}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateAdminNotes(order.id)}
                                className="text-xs"
                              >
                                Save Notes
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
