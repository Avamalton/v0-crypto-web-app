// components/background/ParticlesBackground.tsx
'use client'

import Particles from "@/components/background/ParticlesBackground"

export default function ParticlesBackground({
  className = '',
  particleCount = 1000,
  noiseIntensity = 0.001
}: {
  className?: string
  particleCount?: number
  noiseIntensity?: number
}) {
  return (
    <div
      className={`fixed top-0 left-0 w-full h-full -z-10 pointer-events-none ${className}`}
    >
      <Particles
        className="absolute inset-0"
        quantity={particleCount}
        noise={{ strength: noiseIntensity }}
      />
    </div>
  )
}
