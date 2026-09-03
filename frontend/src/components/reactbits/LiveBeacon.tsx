import { cn } from '../../lib/utils'

interface LiveBeaconProps {
  status?: 'active' | 'warning' | 'error' | 'offline'
  label?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LiveBeacon({
  status = 'active',
  label,
  className,
  size = 'md',
}: LiveBeaconProps) {
  const colorMap = {
    active: {
      dot: 'bg-[#5bb98c]',
      ring: 'bg-[#5bb98c]',
      text: 'text-[#5bb98c]',
      badge: 'border-[#5bb98c]/30 bg-[#5bb98c]/10',
    },
    warning: {
      dot: 'bg-[#cc9166]',
      ring: 'bg-[#cc9166]',
      text: 'text-[#cc9166]',
      badge: 'border-[#cc9166]/30 bg-[#cc9166]/10',
    },
    error: {
      dot: 'bg-[#ff5f56]',
      ring: 'bg-[#ff5f56]',
      text: 'text-[#ff5f56]',
      badge: 'border-[#ff5f56]/30 bg-[#ff5f56]/10',
    },
    offline: {
      dot: 'bg-[#777a88]',
      ring: 'bg-[#777a88]',
      text: 'text-[#777a88]',
      badge: 'border-[#777a88]/30 bg-[#777a88]/10',
    },
  }[status]

  const sizeMap = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  }[size]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[11px] font-mono font-semibold',
        colorMap.badge,
        colorMap.text,
        className
      )}
    >
      <span className="relative flex items-center justify-center">
        <span
          className={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
            colorMap.ring,
            sizeMap
          )}
        />
        <span className={cn('relative inline-flex rounded-full', colorMap.dot, sizeMap)} />
      </span>
      {label && <span>{label}</span>}
    </span>
  )
}
