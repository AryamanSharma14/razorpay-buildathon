import { useRef, useState, type MouseEvent, type ReactNode } from 'react'

interface ShinyButtonProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}

export function ShinyButton({
  children,
  onClick,
  className = '',
  disabled = false,
}: ShinyButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-copper bg-gradient-to-r from-copper via-copper-glow to-copper px-5 py-2 text-xs font-bold text-obsidian shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-copper/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${className}`}
    >
      {/* Dynamic Shine Light Sweep */}
      <span
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: isHovered
            ? `radial-gradient(120px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.4), transparent 80%)`
            : 'none',
        }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  )
}
