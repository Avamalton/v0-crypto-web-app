"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, TrendingUp, Coins, Users } from "lucide-react"

export function PublicRecentHistory() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicActivities()

    // Set up real-time subscription
    const subscription = supabase
      .channel("public_activities")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "public_activities" }, (payload) => {
        setActivities((prev) => [payload.new, ...prev].slice(0, 10))
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchPublicActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("public_activities")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error
      setActivities(data || [])
    } catch (error) {
      console.error("Error fetching public activities:", error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "order_completed":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "token_added":
        return <Coins className="h-4 w-4 text-blue-600" />
      case "platform_launch":
        return <Users className="h-4 w-4 text-purple-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getActivityBadge = (type: string) => {
    switch (type) {
      case "order_completed":
        return <Badge variant="default">Trade</Badge>
      case "token_added":
        return <Badge variant="outline">New Token</Badge>
      case "platform_launch":
        return <Badge variant="secondary">Platform</Badge>
      default:
        return <Badge variant="secondary">Activity</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Recent Activity</span>
        </CardTitle>
        <CardDescription>Latest platform activities and completed trades</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent activities</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 mt-1">{getActivityIcon(activity.activity_type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{activity.title}</p>
                    {getActivityBadge(activity.activity_type)}
                  </div>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                  {activity.amount && activity.token_symbol && (
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>
                        {activity.amount} {activity.token_symbol}
                      </span>
                      {activity.amount_idr && <span>Rp {activity.amount_idr.toLocaleString()}</span>}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{new Date(activity.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
