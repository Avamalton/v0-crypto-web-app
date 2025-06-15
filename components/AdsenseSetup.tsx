"use client"

import { useEffect, useRef } from "react"

export default function AdsenseSetup() {
  const adRef = useRef<HTMLModElement | null>(null)

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && adRef.current) {
        const adsbygoogle = (window as any).adsbygoogle || []
        
        // Cegah push jika sudah pernah dilakukan
        if (!adRef.current.getAttribute("data-adsbygoogle-status")) {
          adsbygoogle.push({})
        }
      }
    } catch (e) {
      console.error("AdSense init error:", e)
    }
  }, [])

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client="ca-pub-5347912081141742"
      data-ad-slot="1726483816" // ganti slot ID kamu
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}
