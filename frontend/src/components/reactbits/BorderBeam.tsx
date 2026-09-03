import { cn } from '../../lib/utils'

interface BorderBeamProps {
  className?: string
  size?: number
  duration?: number
  borderWidth?: number
  anchor?: number
  colorFrom?: string
  colorTo?: string
  delay?: number
}

export function BorderBeam({
  className,
  colorFrom = '#cc9166',
  colorTo = '#5bb98c',
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] -z-0 border border-transparent',
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${colorFrom}30 0%, transparent 50%, ${colorTo}30 100%) border-box`,
        WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
      }}
    />
  )
}
