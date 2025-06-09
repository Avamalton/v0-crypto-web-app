"use client"

import React, { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

const DNAHelix = () => {
  const groupRef = useRef<THREE.Group>(null!)

  const particles = useMemo(() => {
    const points: THREE.Vector3[] = []
    const strands = 2
    const turns = 10
    const separation = 0.3
    const radius = 1.5
    const particlesPerTurn = 100

    for (let i = 0; i < turns * particlesPerTurn; i++) {
      const angle = (i / particlesPerTurn) * Math.PI * 2
      const y = (i - (turns * particlesPerTurn) / 2) * separation * 0.1

      for (let s = 0; s < strands; s++) {
        const strandAngle = angle + (s * Math.PI)
        const x = Math.cos(strandAngle) * radius
        const z = Math.sin(strandAngle) * radius
        points.push(new THREE.Vector3(x, y, z))
      }
    }
    return points
  }, [])

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002
      groupRef.current.rotation.x += 0.0005
    }
  })

  return (
    <group ref={groupRef}>
      {particles.map((pos, i) => (
        <mesh position={pos} key={i}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#00ffff" : "#ff00ff"} emissive="#111" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* DNA rungs */}
      {particles.filter((_, i) => i % 2 === 0).map((start, i) => {
        const end = particles[i * 2 + 1]
        if (!end) return null

        const mid = start.clone().add(end).multiplyScalar(0.5)
        const dir = end.clone().sub(start).normalize()
        const length = start.distanceTo(end)

        const quaternion = new THREE.Quaternion()
        quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir)

        return (
          <mesh key={`rung-${i}`} position={mid} quaternion={quaternion}>
            <cylinderGeometry args={[0.01, 0.01, length, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#444" emissiveIntensity={0.1} />
          </mesh>
        )
      })}
    </group>
  )
}

export function DnaParticles() {
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center">
      <div className="w-[90vw] h-[90vh] backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
        <Canvas camera={{ position: [0, 0, 12], fov: 50 }}>
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={0.6} />
          <DNAHelix />
        </Canvas>
      </div>
    </div>
  )
}
