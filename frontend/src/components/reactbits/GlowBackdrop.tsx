import { cn } from '../../lib/utils'

interface GlowBackdropProps {
  className?: string
  color?: 'copper' | 'emerald' | 'subtle'
}

export function GlowBackdrop({ className, color = 'copper' }: GlowBackdropProps) {
  const gradientMap = {
    copper: 'from-copper/15 via-copper/5 to-transparent',
    emerald: 'from-pos/15 via-pos/5 to-transparent',
    subtle: 'from-carbon via-onyx to-transparent',
  }[color]

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute -top-24 left-1/2 -z-10 h-96 w-[90%] -translate-x-1/2 rounded-full bg-radial blur-3xl opacity-50',
        gradientMap,
        className
      )}
    />
  )
}
