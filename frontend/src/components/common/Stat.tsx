import { useEffect, useState, useRef } from 'react'

interface StatProps {
  value: number | string
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
  className?: string
  flashOnIncrease?: boolean
}

export function Stat({
  value,
  prefix = '',
  suffix = '',
  decimals,
  duration = 700,
  className,
  flashOnIncrease = true,
}: StatProps) {
  // If string cannot be parsed as number, render directly
  const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]+/g, ''))
  const isNumeric = !isNaN(numValue) && isFinite(numValue)

  const [displayValue, setDisplayValue] = useState<number>(() => (isNumeric ? numValue : 0))
  const [isFlashing, setIsFlashing] = useState(false)
  const prefersReducedMotion = useRef(false)
  const prevValue = useRef(numValue)

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  }, [])

  useEffect(() => {
    if (!isNumeric) return

    // Trigger green flash if number increases
    if (flashOnIncrease && numValue > prevValue.current) {
      setIsFlashing(true)
      const flashTimer = setTimeout(() => setIsFlashing(false), 1200)
      return () => clearTimeout(flashTimer)
    }
  }, [numValue, isNumeric, flashOnIncrease])

  useEffect(() => {
    if (!isNumeric) return

    if (prefersReducedMotion.current) {
      setDisplayValue(numValue)
      prevValue.current = numValue
      return
    }

    const startVal = prevValue.current
    const endVal = numValue
    const startTime = performance.now()

    let frameId: number

    const update = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      const current = startVal + (endVal - startVal) * ease
      setDisplayValue(current)

      if (progress < 1) {
        frameId = requestAnimationFrame(update)
      } else {
        setDisplayValue(endVal)
        prevValue.current = endVal
      }
    }

    frameId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frameId)
  }, [numValue, isNumeric, duration])

  if (!isNumeric) {
    return <span className={className}>{value}</span>
  }

  const dec = decimals !== undefined ? decimals : Number.isInteger(numValue) ? 0 : 1
  const formattedNumber = displayValue.toLocaleString('en-IN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })

  return (
    <span
      className={`${className || ''} transition-all duration-500 ${
        isFlashing ? 'text-pos scale-105 drop-shadow-[0_0_12px_rgba(74,222,128,0.5)]' : ''
      }`}
    >
      {prefix}
      {formattedNumber}
      {suffix}
    </span>
  )
}
