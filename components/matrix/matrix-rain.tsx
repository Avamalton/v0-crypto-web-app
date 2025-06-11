"use client"

import { useEffect, useState, useRef } from "react"

export default function MatrixRain() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState<number>(0)

  // Characters used in the Matrix rain (mix of Latin and katakana-like characters)
  const matrixChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~"

  // Calculate number of columns based on container width
  useEffect(() => {
    const calculateColumns = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        // Each character is roughly 20px wide
        const newColumns = Math.floor(containerWidth / 20)
        setColumns(newColumns)
      }
    }

    calculateColumns()
    window.addEventListener("resize", calculateColumns)

    return () => {
      window.removeEventListener("resize", calculateColumns)
    }
  }, [])

  // Generate a random character from the matrixChars string
  const getRandomChar = () => {
    return matrixChars[Math.floor(Math.random() * matrixChars.length)]
  }

  // Generate a random delay for the animation
  const getRandomDelay = () => {
    return Math.random() * 3
  }

  // Generate a random duration for the animation
  const getRandomDuration = () => {
    return 1 + Math.random() * 3
  }

  // Generate a random number of characters for each column
  const getRandomLength = () => {
    return 10 + Math.floor(Math.random() * 30)
  }

  return (
    <div ref={containerRef} className="w-full h-screen bg-black overflow-hidden relative">
      {/* Generate columns */}
      {Array.from({ length: columns }).map((_, columnIndex) => {
        const columnChars = Array.from({ length: getRandomLength() })
        const animationDelay = getRandomDelay()
        const animationDuration = getRandomDuration()

        return (
          <div
            key={columnIndex}
            className="absolute top-0 inline-block"
            style={{
              left: `${(columnIndex / columns) * 100}%`,
              animationDelay: `${animationDelay}s`,
              animationDuration: `${animationDuration}s`,
            }}
          >
            <div className="animate-matrix-fall whitespace-pre text-center">
              {columnChars.map((_, charIndex) => {
                // First character is brighter
                const isFirstChar = charIndex === 0
                // Random characters have a chance to change
                const shouldChange = Math.random() > 0.9

                return (
                  <div
                    key={charIndex}
                    className={`
                      font-mono text-lg
                      ${isFirstChar ? "text-green-300" : "text-green-500"}
                      ${shouldChange ? "animate-matrix-change" : ""}
                    `}
                    style={{
                      opacity: isFirstChar ? 1 : 1 - charIndex / columnChars.length,
                    }}
                  >
                    {getRandomChar()}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
