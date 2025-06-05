"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { PublicRecentHistory } from "@/components/public-recent-history"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, Shield, Zap, Users } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Crypto Trading Platform</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Buy and sell cryptocurrency instantly with secure payments via QRIS, GoPay, and bank transfer
          </p>
          <div className="space-x-4">
            <Button asChild size="lg">
              <Link href="/auth/register">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">Login</Link>
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Features */}
          <div className="lg:col-span-2">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <Coins className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Multiple Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Trade USDT, ETH, and BSC across different networks</CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Zap className="h-8 w-8 text-green-600 mb-2" />
                  <CardTitle>Instant Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Quick transfers via QRIS, GoPay, and bank transfer</CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-8 w-8 text-purple-600 mb-2" />
                  <CardTitle>Secure Trading</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Safe and secure peer-to-peer trading platform</CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Users className="h-8 w-8 text-orange-600 mb-2" />
                  <CardTitle>Local Liquidity</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Direct trading with local liquidity providers</CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Public Recent History */}
          <div>
            <PublicRecentHistory />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Choose Token</h3>
              <p className="text-gray-600">Select the cryptocurrency you want to buy or sell</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Make Payment</h3>
              <p className="text-gray-600">Transfer via QRIS, GoPay, or bank transfer</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Receive Crypto</h3>
              <p className="text-gray-600">Get your cryptocurrency in your wallet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
