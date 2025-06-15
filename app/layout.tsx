import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { Toaster } from "@/components/ui/toaster"
import ParticlesBackground from "@/components/background/ParticlesBackground"
const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Crypto Trading Platform",
  description: "Buy and sell crypto with instant payments",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
       {/* Background Particles */}
        <head>
        {/* AdSense Script */}
        <script
          async
         src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5347912081141742"

          crossOrigin="anonymous"
        ></script>
      
      </head>
      
      <body className={inter.className}>
        <AuthProvider>
        
          {children}
          <Toaster />
        </AuthProvider>
      </body>

    </html>
  )
}
