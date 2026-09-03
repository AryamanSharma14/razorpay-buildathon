import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

interface BlurTextProps {
  text: string
  className?: string
  delay?: number
}

export function BlurText({ text, className, delay = 50 }: BlurTextProps) {
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    setInView(true)
  }, [])

  const words = text.split(' ')

  return (
    <p ref={ref} className={cn('flex flex-wrap gap-x-1.5', className)}>
      {words.map((word, index) => (
        <span
          key={index}
          style={{
            transitionDuration: '600ms',
            transitionDelay: `${index * delay}ms`,
          }}
          className={cn(
            'inline-block transition-all ease-out transform',
            inView
              ? 'opacity-100 blur-0 translate-y-0'
              : 'opacity-0 blur-md translate-y-2'
          )}
        >
          {word}
        </span>
      ))}
    </p>
  )
}
