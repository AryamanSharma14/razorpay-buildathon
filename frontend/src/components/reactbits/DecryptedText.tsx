import { useEffect, useState, useRef } from 'react'

interface DecryptedTextProps {
  text: string
  speed?: number
  maxIterations?: number
  characters?: string
  className?: string
  parentClassName?: string
  encryptedClassName?: string
  animateOn?: 'view' | 'hover'
  revealDirection?: 'start' | 'end' | 'center'
}

export function DecryptedText({
  text,
  speed = 40,
  maxIterations = 10,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+',
  className = '',
  parentClassName = '',
  encryptedClassName = 'text-copper font-mono',
  animateOn = 'hover',
  revealDirection = 'start',
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text)
  const [isHovering, setIsHovering] = useState(false)
  const [isScrambling, setIsScrambling] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const iterationRef = useRef(0)

  useEffect(() => {
    let currentIteration = 0

    const getNextChar = (char: string, index: number, total: number) => {
      if (char === ' ') return ' '
      if (revealDirection === 'start' && index < currentIteration) return text[index]
      if (revealDirection === 'end' && total - index <= currentIteration) return text[index]
      return characters[Math.floor(Math.random() * characters.length)]
    }

    if (isHovering || isScrambling) {
      intervalRef.current = window.setInterval(() => {
        setDisplayText(
          text
            .split('')
            .map((char, index) => getNextChar(char, index, text.length))
            .join('')
        )

        currentIteration += 1
        iterationRef.current = currentIteration

        if (currentIteration >= text.length + maxIterations) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setDisplayText(text)
          setIsScrambling(false)
        }
      }, speed)
    } else {
      setDisplayText(text)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isHovering, isScrambling, text, speed, maxIterations, characters, revealDirection])

  const triggerAnimation = () => {
    setIsScrambling(true)
  }

  return (
    <span
      className={`inline-block whitespace-pre-wrap ${parentClassName}`}
      onMouseEnter={() => (animateOn === 'hover' ? setIsHovering(true) : triggerAnimation())}
      onMouseLeave={() => (animateOn === 'hover' ? setIsHovering(false) : null)}
    >
      <span className={className}>
        {displayText.split('').map((char, index) => {
          const isDecrypted = char === text[index]
          return (
            <span key={index} className={isDecrypted ? className : encryptedClassName}>
              {char}
            </span>
          )
        })}
      </span>
    </span>
  )
}
