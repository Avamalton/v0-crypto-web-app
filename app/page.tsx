"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { PublicRecentHistory } from "@/components/public-recent-history"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, Shield, Zap, Users } from "lucide-react"
import "@/styles/globals.css"
import ParticlesBackground from "@/components/background/ParticlesBackground"
import DxmsLogoPath from "@/components/Dxms-logo-particles"

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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-pink-500"></div>
      </div>
    )
  }

  return (
    <>
      <ParticlesBackground
        particleCount={1200}
        noiseIntensity={0.002}
        particleSize={{ min: 0.5, max: 2 }}
        className="w-full"
      >
        <main className="relative w-full">
          {/* Your existing content goes here */}
          <div className="relative z-10 min-h-screen text-gray-100">
            {/* Hero Section */}
            <div className="container mx-auto px-6 py-20 text-center">
            
                <DxmsLogoPath />
  
              <div className="text-6xl animate-pulse md:text-7xl font-extrabold bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-transparent bg-clip-text mb-6">
                {/* Your logo content */}
              </div>

     
             <div className="flex justify-center gap-4">
  {/* Get Started Button - Merah */}
  <Button
    size="lg"
    className="bg-red-500 text-white border-4 border-black px-6 py-3 shadow-[4px_4px_0_#000] hover:shadow-red-700 hover:translate-x-[2px] hover:translate-y-[2px] font-bold uppercase tracking-wider transition-all"
  >
    <Link href="/auth/register" className="w-full h-full flex items-center justify-center">
      Get Started
    </Link>
  </Button>

  {/* Login Button - Hitam */}
  <Button
    size="lg"
    variant="outline"
    className="bg-black text-white border-4 border-white px-6 py-3 shadow-[4px_4px_0_#000] hover:shadow-gray-700 hover:translate-x-[2px] hover:translate-y-[2px] font-bold uppercase tracking-wider transition-all"
  >
    <Link href="/auth/login" className="w-full h-full flex items-center justify-center">
      Login
    </Link>
  </Button>
</div>

            </div>

          {/* Feature Section */}
<div className="container mx-auto px-6 py-16 grid lg:grid-cols-2 gap-10">
  <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
    <Card className="bg-yellow-100 border-4 border-black shadow-[4px_4px_0_0_#000] hover:shadow-pink-500 transition-all hover:scale-[1.02]">
      <CardHeader>
        <Coins className="h-8 w-8 text-blue-600 mb-2" />
        <CardTitle className="text-black font-bold">Multiple Tokens</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-gray-800 font-mono">
          Trade USDT, ETH, and BSC across different networks
        </CardDescription>
      </CardContent>
    </Card>

    <Card className="bg-pink-200 border-4 border-black shadow-[4px_4px_0_0_#000] hover:shadow-yellow-400 transition-all hover:scale-[1.02]">
      <CardHeader>
        <Zap className="h-8 w-8 text-pink-600 mb-2" />
        <CardTitle className="text-black font-bold">Instant Payments</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-gray-800 font-mono">
          Quick transfers via QRIS, GoPay, and bank transfer
        </CardDescription>
      </CardContent>
    </Card>

    <Card className="bg-purple-200 border-4 border-black shadow-[4px_4px_0_0_#000] hover:shadow-blue-400 transition-all hover:scale-[1.02]">
      <CardHeader>
        <Shield className="h-8 w-8 text-purple-600 mb-2" />
        <CardTitle className="text-black font-bold">Secure Trading</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-gray-800 font-mono">
          Safe and secure peer-to-peer trading platform
        </CardDescription>
      </CardContent>
    </Card>

    <Card className="bg-orange-200 border-4 border-black shadow-[4px_4px_0_0_#000] hover:shadow-lime-400 transition-all hover:scale-[1.02]">
      <CardHeader>
        <Users className="h-8 w-8 text-orange-600 mb-2" />
        <CardTitle className="text-black font-bold">Local Liquidity</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-gray-800 font-mono">
          Direct trading with local liquidity providers
        </CardDescription>
      </CardContent>
    </Card>
  </div>
 </div>

           {/* How It Works Section */}
<div className="bg-yellow-100 py-20 text-center border-t-4 border-b-4 border-black">
  <h2 className="text-4xl font-extrabold text-black mb-12 uppercase tracking-tight">
    How It Works
  </h2>
  <div className="container mx-auto grid md:grid-cols-3 gap-10 px-6">
    <div className="bg-pink-200 p-6 border-4 border-black shadow-[6px_6px_0_#000] hover:shadow-pink-600 transition-all hover:scale-[1.02]">
      <div className="text-4xl text-black font-black mb-4">1</div>
      <h3 className="text-xl text-black font-bold mb-2">Choose Token</h3>
      <p className="text-gray-900 font-mono">
        Select the cryptocurrency you want to buy or sell
      </p>
    </div>

    <div className="bg-green-200 p-6 border-4 border-black shadow-[6px_6px_0_#000] hover:shadow-green-600 transition-all hover:scale-[1.02]">
      <div className="text-4xl text-black font-black mb-4">2</div>
      <h3 className="text-xl text-black font-bold mb-2">Make Payment</h3>
      <p className="text-gray-900 font-mono">
        Transfer via QRIS, GoPay, or bank transfer
      </p>
    </div>

    <div className="bg-purple-200 p-6 border-4 border-black shadow-[6px_6px_0_#000] hover:shadow-purple-600 transition-all hover:scale-[1.02]">
      <div className="text-4xl text-black font-black mb-4">3</div>
      <h3 className="text-xl text-black font-bold mb-2">Receive Crypto</h3>
      <p className="text-gray-900 font-mono">
        Get your cryptocurrency in your wallet
      </p>
    </div>


              </div>
            </div>
          </div>
        </main>
      </ParticlesBackground>
    </>
  )
}
