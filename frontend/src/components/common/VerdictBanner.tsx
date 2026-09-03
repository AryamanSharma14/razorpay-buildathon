import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { CheckCircle2, ShieldAlert, MinusCircle, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface VerdictInfo {
  type: 'recovered' | 'blocked' | 'skipped' | 'info'
  title: string
  detail: string
}

interface VerdictContextType {
  verdict: VerdictInfo | null
  showVerdict: (v: VerdictInfo) => void
  clearVerdict: () => void
}

const VerdictContext = createContext<VerdictContextType | undefined>(undefined)

export function VerdictProvider({ children }: { children: ReactNode }) {
  const [verdict, setVerdict] = useState<VerdictInfo | null>(null)

  const showVerdict = (v: VerdictInfo) => {
    setVerdict(v)
  }

  const clearVerdict = () => {
    setVerdict(null)
  }

  useEffect(() => {
    if (!verdict) return
    const timer = setTimeout(() => {
      setVerdict(null)
    }, 8000)
    return () => clearTimeout(timer)
  }, [verdict])

  return (
    <VerdictContext.Provider value={{ verdict, showVerdict, clearVerdict }}>
      {children}
    </VerdictContext.Provider>
  )
}

export function useVerdict() {
  const ctx = useContext(VerdictContext)
  if (!ctx) {
    throw new Error('useVerdict must be used within VerdictProvider')
  }
  return ctx
}

// CSS keyframes injected once
const STYLE_ID = 'verdict-animations'
function ensureStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes verdict-flash {
      0% { opacity: 0.5; }
      100% { opacity: 0; }
    }
    @keyframes verdict-icon-bounce {
      0% { transform: scale(0.3) rotate(-15deg); opacity: 0; }
      50% { transform: scale(1.25) rotate(5deg); opacity: 1; }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    @keyframes verdict-slide-in {
      0% { transform: translateY(-12px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes verdict-confetti {
      0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
      100% { transform: translateY(-80px) rotate(720deg) scale(0); opacity: 0; }
    }
    @keyframes verdict-progress {
      0% { width: 100%; }
      100% { width: 0%; }
    }
    .verdict-flash-overlay {
      animation: verdict-flash 400ms ease-out forwards;
      pointer-events: none;
    }
    .verdict-icon-bounce {
      animation: verdict-icon-bounce 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    .verdict-slide-in {
      animation: verdict-slide-in 350ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    .verdict-confetti-particle {
      animation: verdict-confetti 800ms ease-out forwards;
      position: absolute;
      pointer-events: none;
    }
  `
  document.head.appendChild(style)
}

const CONFETTI_COLORS = ['#cc9166', '#e2e3e9', '#5bb98c', '#c7a882', '#f5c542']

export function VerdictBanner() {
  const { verdict, clearVerdict } = useVerdict()
  const bannerRef = useRef<HTMLDivElement>(null)
  const [showFlash, setShowFlash] = useState(false)
  const prevVerdictRef = useRef<VerdictInfo | null>(null)

  useEffect(() => {
    ensureStyles()
  }, [])

  // Trigger flash on new verdict
  useEffect(() => {
    if (verdict && verdict !== prevVerdictRef.current) {
      setShowFlash(true)
      const timer = setTimeout(() => setShowFlash(false), 450)
      prevVerdictRef.current = verdict
      return () => clearTimeout(timer)
    }
    if (!verdict) {
      prevVerdictRef.current = null
    }
  }, [verdict])

  if (!verdict) return null

  const config = {
    recovered: {
      border: 'border-pos/50',
      bg: 'bg-pos/10',
      text: 'text-pos',
      flashColor: 'rgba(91, 185, 140, 0.15)',
      icon: CheckCircle2,
    },
    blocked: {
      border: 'border-copper/50',
      bg: 'bg-copper/10',
      text: 'text-copper',
      flashColor: 'rgba(204, 145, 102, 0.15)',
      icon: ShieldAlert,
    },
    skipped: {
      border: 'border-steel/50',
      bg: 'bg-steel/10',
      text: 'text-fog',
      flashColor: 'rgba(145, 148, 161, 0.1)',
      icon: MinusCircle,
    },
    info: {
      border: 'border-border-strong',
      bg: 'bg-carbon',
      text: 'text-bone',
      flashColor: 'rgba(226, 227, 233, 0.08)',
      icon: CheckCircle2,
    },
  }[verdict.type]

  const Icon = config.icon

  return (
    <>
      {/* Full-viewport flash overlay */}
      {showFlash && (
        <div
          className="fixed inset-0 z-50 verdict-flash-overlay"
          style={{ backgroundColor: config.flashColor }}
        />
      )}

      {/* Banner */}
      <div
        ref={bannerRef}
        className={cn(
          'relative mb-6 flex items-center justify-between rounded-xl border p-4 shadow-lg overflow-hidden verdict-slide-in',
          config.border,
          config.bg
        )}
      >
        {/* Confetti particles for recovered */}
        {verdict.type === 'recovered' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="verdict-confetti-particle"
                style={{
                  left: `${12 + i * 12}%`,
                  bottom: '0',
                  width: 6,
                  height: 6,
                  borderRadius: i % 2 === 0 ? '50%' : '2px',
                  backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                  animationDelay: `${i * 60}ms`,
                }}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 relative z-10">
          <div className="verdict-icon-bounce">
            <Icon className={cn('h-6 w-6 shrink-0', config.text)} />
          </div>
          <div>
            <div className={cn('font-serif text-base font-bold tracking-tight', config.text)}>
              {verdict.title}
            </div>
            <p className="text-[12px] text-text-muted mt-0.5">{verdict.detail}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={clearVerdict}
          className="relative z-10 rounded-full p-1.5 text-text-faint transition-colors hover:bg-carbon hover:text-bone cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Auto-dismiss progress bar */}
        <div
          className="absolute bottom-0 left-0 h-0.5 rounded-full"
          style={{
            backgroundColor: verdict.type === 'recovered' ? '#5bb98c' : verdict.type === 'blocked' ? '#cc9166' : '#9194a1',
            animation: 'verdict-progress 8s linear forwards',
          }}
        />
      </div>
    </>
  )
}
