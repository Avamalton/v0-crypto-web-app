"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Database,
  Wifi,
  TrendingUp,
  Clock,
  Activity,
  Zap,
  BarChart3,
} from "lucide-react"

interface ApiUsageLog {
  id: string
  api_provider: string
  endpoint: string
  tokens_requested: string[]
  success: boolean
  error_message: string | null
  response_time_ms: number
  created_at: string
}

interface UsageStats {
  total_calls: number
  successful_calls: number
  failed_calls: number
  cache_hits: number
  api_calls: number
  avg_response_time: number
  calls_last_hour: number
  calls_today: number
  monthly_limit: number
  cache_hit_rate: number
  error_rate: number
}

interface DailyUsage {
  date: string
  cache_hits: number
  api_calls: number
  total_calls: number
}

export function ApiUsageMonitor() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [logs, setLogs] = useState<ApiUsageLog[]>([])
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchUsageData()

    // Auto refresh every 2 minutes
    const interval = setInterval(fetchUsageData, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchUsageData = async () => {
    if (!refreshing) setLoading(true)
    setRefreshing(true)

    try {
      // Fetch API usage logs
      const { data: logsData, error: logsError } = await supabase
        .from("api_usage_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      if (logsError) {
        console.error("Error fetching logs:", logsError)
      } else {
        setLogs(logsData || [])
      }

      // Fetch price cache data for cache statistics
      const { data: cacheData, error: cacheError } = await supabase.from("price_cache").select("*")

      if (cacheError) {
        console.error("Error fetching cache data:", cacheError)
      }

      // Calculate statistics from logs
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const allLogs = logsData || []
      const todayLogs = allLogs.filter((log) => new Date(log.created_at) > oneDayAgo)
      const hourLogs = allLogs.filter((log) => new Date(log.created_at) > oneHourAgo)
      const monthLogs = allLogs.filter((log) => new Date(log.created_at) > oneMonthAgo)

      const totalCalls = todayLogs.length
      const successfulCalls = todayLogs.filter((log) => log.success).length
      const failedCalls = totalCalls - successfulCalls
      const cacheHits = todayLogs.filter((log) => log.api_provider === "cache").length
      const apiCalls = todayLogs.filter((log) => log.api_provider === "coinmarketcap").length
      const avgResponseTime =
        totalCalls > 0 ? todayLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / totalCalls : 0

      const calculatedStats: UsageStats = {
        total_calls: totalCalls,
        successful_calls: successfulCalls,
        failed_calls: failedCalls,
        cache_hits: cacheHits,
        api_calls: apiCalls,
        avg_response_time: Math.round(avgResponseTime),
        calls_last_hour: hourLogs.length,
        calls_today: totalCalls,
        monthly_limit: 10000, // This should come from your config
        cache_hit_rate: totalCalls > 0 ? (cacheHits / totalCalls) * 100 : 0,
        error_rate: totalCalls > 0 ? (failedCalls / totalCalls) * 100 : 0,
      }

      setStats(calculatedStats)

      // Calculate daily usage for the last 7 days
      const dailyStats: DailyUsage[] = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dayStart = new Date(date.setHours(0, 0, 0, 0))
        const dayEnd = new Date(date.setHours(23, 59, 59, 999))

        const dayLogs = allLogs.filter((log) => {
          const logDate = new Date(log.created_at)
          return logDate >= dayStart && logDate <= dayEnd
        })

        dailyStats.push({
          date: dayStart.toISOString().split("T")[0],
          cache_hits: dayLogs.filter((log) => log.api_provider === "cache").length,
          api_calls: dayLogs.filter((log) => log.api_provider === "coinmarketcap").length,
          total_calls: dayLogs.length,
        })
      }

      setDailyUsage(dailyStats)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Error fetching usage data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "cache":
        return <Database className="h-4 w-4 text-blue-500" />
      case "coinmarketcap":
        return <Wifi className="h-4 w-4 text-green-500" />
      case "mock":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  const getProviderBadge = (provider: string, success: boolean) => {
    if (!success) {
      return <Badge variant="destructive">Error</Badge>
    }

    switch (provider) {
      case "cache":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Cache Hit
          </Badge>
        )
      case "coinmarketcap":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            CMC API
          </Badge>
        )
      case "mock":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Mock Data
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-500" />
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Usage Monitor</h2>
          <p className="text-sm text-muted-foreground">Track API calls, cache efficiency, and system performance</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsageData}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Cache Hit Rate</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.cache_hit_rate.toFixed(1)}%</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {stats.cache_hits} / {stats.total_calls} requests
                  </p>
                </div>
                <Database className="h-8 w-8 text-blue-500" />
              </div>
              <Progress value={stats.cache_hit_rate} className="h-2 mt-3" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">API Calls Today</p>
                  <p className="text-2xl font-bold text-green-900">{stats.api_calls}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {((stats.api_calls / stats.monthly_limit) * 100).toFixed(1)}% of monthly limit
                  </p>
                </div>
                <Wifi className="h-8 w-8 text-green-500" />
              </div>
              <Progress value={(stats.api_calls / stats.monthly_limit) * 100} className="h-2 mt-3" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Avg Response Time</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.avg_response_time}ms</p>
                  <p className="text-xs text-purple-600 mt-1">{stats.successful_calls} successful calls</p>
                </div>
                <Zap className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">System Health</p>
                  <div className="flex items-center gap-2 mt-1">
                    {stats.error_rate < 5 ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-lg font-bold text-green-700">Healthy</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <span className="text-lg font-bold text-red-700">Warning</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-orange-600 mt-1">{stats.error_rate.toFixed(1)}% error rate</p>
                </div>
                <Activity className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Detailed Analytics
          </CardTitle>
          <CardDescription>Comprehensive API usage analytics and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">Daily Usage</TabsTrigger>
              <TabsTrigger value="logs">Recent Logs</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4">
              <div className="h-64 flex items-end justify-between gap-2 p-4 bg-gray-50 rounded-lg">
                {dailyUsage.map((day, index) => {
                  const maxCalls = Math.max(...dailyUsage.map((d) => d.total_calls))
                  const height = maxCalls > 0 ? (day.total_calls / maxCalls) * 200 : 0

                  return (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div className="flex flex-col items-center gap-1 mb-2">
                        <div
                          className="bg-blue-500 rounded-t w-full min-h-[4px]"
                          style={{ height: `${(day.cache_hits / (day.total_calls || 1)) * height}px` }}
                          title={`Cache hits: ${day.cache_hits}`}
                        />
                        <div
                          className="bg-green-500 rounded-b w-full min-h-[4px]"
                          style={{ height: `${(day.api_calls / (day.total_calls || 1)) * height}px` }}
                          title={`API calls: ${day.api_calls}`}
                        />
                      </div>
                      <div className="text-xs text-center">
                        <div className="font-medium">{day.total_calls}</div>
                        <div className="text-muted-foreground">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span>Cache Hits</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span>API Calls</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Time</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.slice(0, 20).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getProviderIcon(log.api_provider)}
                            {getProviderBadge(log.api_provider, log.success)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {log.tokens_requested.slice(0, 2).map((token, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {token}
                              </Badge>
                            ))}
                            {log.tokens_requested.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{log.tokens_requested.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.success)}
                            <span className="text-xs">{log.success ? "Success" : "Failed"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{log.response_time_ms}ms</TableCell>
                        <TableCell className="text-xs text-red-600 max-w-[200px] truncate">
                          {log.error_message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Response Time Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>{"< 100ms"}</span>
                        <span className="font-medium">{logs.filter((log) => log.response_time_ms < 100).length}</span>
                      </div>
                      <Progress
                        value={(logs.filter((log) => log.response_time_ms < 100).length / logs.length) * 100}
                        className="h-2"
                      />

                      <div className="flex justify-between text-sm">
                        <span>100-500ms</span>
                        <span className="font-medium">
                          {logs.filter((log) => log.response_time_ms >= 100 && log.response_time_ms < 500).length}
                        </span>
                      </div>
                      <Progress
                        value={
                          (logs.filter((log) => log.response_time_ms >= 100 && log.response_time_ms < 500).length /
                            logs.length) *
                          100
                        }
                        className="h-2"
                      />

                      <div className="flex justify-between text-sm">
                        <span>{"> 500ms"}</span>
                        <span className="font-medium">{logs.filter((log) => log.response_time_ms >= 500).length}</span>
                      </div>
                      <Progress
                        value={(logs.filter((log) => log.response_time_ms >= 500).length / logs.length) * 100}
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Provider Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {["cache", "coinmarketcap", "mock"].map((provider) => {
                        const count = logs.filter((log) => log.api_provider === provider).length
                        const percentage = logs.length > 0 ? (count / logs.length) * 100 : 0

                        return (
                          <div key={provider}>
                            <div className="flex justify-between text-sm mb-1">
                              <div className="flex items-center gap-2">
                                {getProviderIcon(provider)}
                                <span className="capitalize">{provider}</span>
                              </div>
                              <span className="font-medium">{count}</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between text-sm text-muted-foreground">
          <span>Last updated: {lastUpdated?.toLocaleString() || "Never"}</span>
          <span>Showing data from last 24 hours</span>
        </CardFooter>
      </Card>

      {/* Optimization Recommendations */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Optimization Recommendations
            </CardTitle>
            <CardDescription>Smart suggestions to improve API efficiency and reduce costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.cache_hit_rate < 80 && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-800">Low Cache Hit Rate</p>
                    <p className="text-sm text-yellow-700">
                      Consider increasing cache duration to improve efficiency. Current rate:{" "}
                      {stats.cache_hit_rate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}

              {stats.api_calls > stats.monthly_limit * 0.8 && (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-red-800">High API Usage</p>
                    <p className="text-sm text-red-700">
                      You're approaching your monthly API limit. Consider optimizing cache settings.
                    </p>
                  </div>
                </div>
              )}

              {stats.avg_response_time > 1000 && (
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <Clock className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-orange-800">Slow Response Times</p>
                    <p className="text-sm text-orange-700">
                      Average response time is {stats.avg_response_time}ms. Consider implementing request batching.
                    </p>
                  </div>
                </div>
              )}

              {stats.cache_hit_rate >= 80 &&
                stats.api_calls < stats.monthly_limit * 0.5 &&
                stats.avg_response_time < 500 && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-green-800">Excellent Performance</p>
                      <p className="text-sm text-green-700">
                        Your API usage is well optimized with high cache efficiency and fast response times.
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
