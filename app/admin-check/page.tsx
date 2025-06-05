"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AdminCheckPage() {
  const { user, userProfile, loading } = useAuth()
  const [adminStatus, setAdminStatus] = useState<string>("Checking...")

  useEffect(() => {
    if (!loading) {
      checkAdminStatus()
    }
  }, [loading, user, userProfile])

  const checkAdminStatus = async () => {
    if (!user) {
      setAdminStatus("Not logged in. Please log in first.")
      return
    }

    try {
      // Check if user exists in the users table
      const { data: userData, error: userError } = await supabase.from("users").select("*").eq("id", user.id).single()

      if (userError) {
        setAdminStatus(`User not found in database: ${userError.message}`)
        return
      }

      if (!userData) {
        setAdminStatus("User exists in auth but not in the users table.")
        return
      }

      if (userData.is_admin) {
        setAdminStatus("✅ User is an admin. You should be able to access the admin panel.")
      } else {
        setAdminStatus("❌ User is not an admin. You need admin privileges to access the admin panel.")
      }
    } catch (error: any) {
      setAdminStatus(`Error checking admin status: ${error.message}`)
    }
  }

  const makeAdmin = async () => {
    if (!user) return

    try {
      const { error } = await supabase.from("users").update({ is_admin: true }).eq("id", user.id)

      if (error) throw error

      setAdminStatus("✅ You are now an admin! Please refresh the page.")
    } catch (error: any) {
      setAdminStatus(`Error making user admin: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Admin Access Check</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Admin Status Check</CardTitle>
            <CardDescription>Check if you have admin access to the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p>Loading...</p>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="font-medium">User Information:</h3>
                  <p>User ID: {user?.id || "Not logged in"}</p>
                  <p>Email: {user?.email || "N/A"}</p>
                  <p>Username: {userProfile?.username || "N/A"}</p>
                </div>

                <div className="p-4 bg-gray-100 rounded-md">
                  <h3 className="font-medium mb-2">Admin Status:</h3>
                  <p className="text-lg">{adminStatus}</p>
                </div>

                {user && userProfile && !userProfile.is_admin && <Button onClick={makeAdmin}>Make Me Admin</Button>}

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Admin Panel Access:</h3>
                  <Button asChild>
                    <Link href="/admin">Try Accessing Admin Panel</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
