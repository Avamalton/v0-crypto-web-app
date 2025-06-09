"use client"

import type React from "react"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { toast } = useToast()

const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    })

    if (error) throw error

    if (data.user) {
      const { error: rpcError } = await supabase.rpc("create_user", {
        user_id: data.user.id,
        user_email: email,
        user_username: username,
        user_role: 'User', // PENTING!
      })

      if (rpcError) console.error("Error creating user profile:", rpcError)
    }

    setEmailSent(true)
    toast({
      title: "Success",
      description: "Account created! Please check your email to verify.",
    })
  } catch (error: any) {
    toast({
      title: "Registration Error",
      description: error.message,
      variant: "destructive",
    })
  } finally {
    setLoading(false)
  }
}


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <Card className="w-full max-w-md rounded-2xl shadow-lg border-none">
        <CardHeader>
          <CardTitle className="text-xl text-center">Create Your Account</CardTitle>
          <CardDescription className="text-center text-sm text-gray-500">
            Join and start your journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="text-center space-y-4">
              <h2 className="text-lg font-semibold text-green-600">🎉 Verify your email</h2>
              <p className="text-gray-600">A confirmation email has been sent to <strong>{email}</strong>.</p>
              <p className="text-sm text-gray-500">Please check your inbox and follow the link to complete registration.</p>
              <Link
                href="/auth/login"
                className="inline-block mt-4 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all duration-200 text-sm"
              >
                Go to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="yourname"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-full"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Register"}
              </Button>
            </form>
          )}

          {!emailSent && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-blue-600 font-medium hover:underline">
                  Login here
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
