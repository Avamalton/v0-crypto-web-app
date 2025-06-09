'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Canvas } from '@react-three/fiber'
import { useAuth } from '@/components/auth-provider'
import { PublicRecentHistory } from '@/components/public-recent-history'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Coins, Shield, Zap, Users } from 'lucide-react'
import { Particles } from '@/components/particles/Particles'
import { OrbitControls } from '@react-three/drei'
import "@/styles/globals.css"
import DxmsLogo from "../public/dxmshub.png"
import { VideoTextDemo } from '@/components/VideoText'
import { Ripple } from "@/components/magicui/ripple";


// Load Particles component dynamically (no SSR)

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
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
   
      {/* Foreground UI */}
      <div className="min-h-screen bg-black text-gray-100">

        {/* Hero Section */}
        <div className="container mx-auto px-6 py-20 text-center">

          <div className="text-6xl animate-pulse  md:text-7xl font-extrabold bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-transparent bg-clip-text mb-6">
          <Image 
          src={DxmsLogo}
          alt="DXMSHub Logo"
          width={300}
          height={300}
          className="mx-auto mb-6 rounded-full bg-black shadow-lg hover:shadow-yellow-500/50 shadow-white/80 transition-shadow duration-300"
          loading="eager"
          priority
          unoptimized={true} // Use this if you have issues with Next.js image optimization
          quality={100} // Set quality to 100 for best image quality
          style={{ width: '300px', height: '300px' }} // Ensure the image is displayed at 150x150 pixels
         
          >
       

          </Image>
         <div className=' flex items-center pt-20 pb-11 justify-center mx-auto'> 
          <VideoTextDemo/>

          </div>
          </div>
 
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Secure. Scalable. Limitless. Buy and sell cryptocurrency instantly with secure payments via QRIS, GoPay, and bank transfer.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md">
              <Link href="/auth/register">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" className="border-gray-700 text-gray-300 hover:bg-gray-800">
              <Link href="/auth/login">Login</Link>
            </Button>
          </div>
        </div>
      {/* Background Particles */}
      <div className="fixed i">
      
      </div>
        {/* Feature Section */}
        <div className="container mx-auto px-6 py-16 grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
            <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-md shadow-md hover:shadow-pink-500/20 transition hover:scale-105">
              <CardHeader>
                <Coins className="h-8 w-8 text-blue-400 mb-2" />
                <CardTitle className="text-white">Multiple Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400">Trade USDT, ETH, and BSC across different networks</CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-md shadow-md hover:shadow-pink-500/20 transition hover:scale-105">
              <CardHeader>
                <Zap className="h-8 w-8 text-pink-400 mb-2" />
                <CardTitle className="text-white">Instant Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400">Quick transfers via QRIS, GoPay, and bank transfer</CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-md shadow-md hover:shadow-pink-500/20 transition hover:scale-105">
              <CardHeader>
                <Shield className="h-8 w-8 text-purple-400 mb-2" />
                <CardTitle className="text-white">Secure Trading</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400">Safe and secure peer-to-peer trading platform</CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-md shadow-md hover:shadow-pink-500/20 transition hover:scale-105">
              <CardHeader>
                <Users className="h-8 w-8 text-orange-400 mb-2" />
                <CardTitle className="text-white">Local Liquidity</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400">Direct trading with local liquidity providers</CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
            <PublicRecentHistory />
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-gradient-to-br from-black via-gray-900 to-black py-20 text-center">
          <h2 className="text-4xl font-bold text-white mb-12">How It Works</h2>
          <div className="container mx-auto grid md:grid-cols-3 gap-10 px-6">
            <div className="bg-gray-800/60 p-6 rounded-2xl border border-gray-700 shadow-md hover:scale-105 transition">
              <div className="text-3xl text-pink-500 font-bold mb-4">1</div>
              <h3 className="text-xl text-white font-semibold mb-2">Choose Token</h3>
              <p className="text-gray-400">Select the cryptocurrency you want to buy or sell</p>
            </div>

            <div className="bg-gray-800/60 p-6 rounded-2xl border border-gray-700 shadow-md hover:scale-105 transition">
              <div className="text-3xl text-green-400 font-bold mb-4">2</div>
              <h3 className="text-xl text-white font-semibold mb-2">Make Payment</h3>
              <p className="text-gray-400">Transfer via QRIS, GoPay, or bank transfer</p>
            </div>

            <div className="bg-gray-800/60 p-6 rounded-2xl border border-gray-700 shadow-md hover:scale-105 transition">
              <div className="text-3xl text-purple-400 font-bold mb-4">3</div>
              <h3 className="text-xl text-white font-semibold mb-2">Receive Crypto</h3>
              <p className="text-gray-400">Get your cryptocurrency in your wallet</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
