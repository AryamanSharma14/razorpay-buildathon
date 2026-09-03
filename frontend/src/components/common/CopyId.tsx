import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, HelpCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

interface CopyIdProps {
  id: string
  truncate?: number
  linkTo?: string
  showDecisionAction?: boolean
  onViewDecision?: (id: string) => void
  className?: string
}

/**
 * Formats system payment IDs (e.g., 'pay_sim_soft_d4fc', 'pay_live_01928374') into
 * user-friendly, human-readable labels with a clean reference tag.
 */
export function formatPaymentName(rawId: string): string {
  if (!rawId) return 'Payment'
  if (rawId === 'system') return 'System Event'
  
  // Format simulated / demo keys cleanly
  if (rawId.includes('soft')) {
    const suffix = rawId.split('_').pop()?.slice(-4).toUpperCase() || 'TX'
    return `Cult.fit Checkout #${suffix}`
  }
  if (rawId.includes('hard')) {
    const suffix = rawId.split('_').pop()?.slice(-4).toUpperCase() || 'TX'
    return `Expired Card #${suffix}`
  }
  if (rawId.includes('downtime')) {
    const suffix = rawId.split('_').pop()?.slice(-4).toUpperCase() || 'TX'
    return `Bank Outage Hold #${suffix}`
  }
  if (rawId.includes('ev_negative')) {
    const suffix = rawId.split('_').pop()?.slice(-4).toUpperCase() || 'TX'
    return `Micro-Order #${suffix}`
  }

  // General format
  const suffix = rawId.replace('pay_', '').slice(-5).toUpperCase()
  return `Order #${suffix}`
}

export function CopyId({
  id,
  truncate,
  linkTo,
  showDecisionAction,
  onViewDecision,
  className,
}: CopyIdProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback
    }
  }

  const humanName = formatPaymentName(id)
  const isCustomName = humanName !== id && id !== 'system'
  const displayText = truncate && id.length > truncate ? `${id.slice(0, truncate)}…` : id

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', className)}>
      {linkTo ? (
        <Link
          to={linkTo}
          className="hover:text-copper transition-colors flex items-center gap-1.5"
          title={`Click to inspect ${id}`}
        >
          <span className="font-semibold text-paper text-xs">{humanName}</span>
          {isCustomName && (
            <span className="font-mono text-[10px] text-text-faint bg-onyx/80 px-1.5 py-0.2 rounded border border-border/50">
              {displayText}
            </span>
          )}
        </Link>
      ) : (
        <span className="flex items-center gap-1.5" title={id}>
          <span className="font-semibold text-paper text-xs">{humanName}</span>
          {isCustomName && (
            <span className="font-mono text-[10px] text-text-faint bg-onyx/80 px-1.5 py-0.2 rounded border border-border/50">
              {displayText}
            </span>
          )}
        </span>
      )}

      {id !== 'system' && (
        <button
          type="button"
          onClick={handleCopy}
          className="rounded p-0.5 text-text-faint hover:bg-carbon hover:text-bone transition-colors cursor-pointer"
          title={copied ? 'Copied ID to clipboard!' : `Copy raw ID: ${id}`}
        >
          {copied ? (
            <Check className="h-3 w-3 text-pos animate-in fade-in zoom-in duration-150" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      )}

      {showDecisionAction && onViewDecision && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onViewDecision(id)
          }}
          className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-sans font-semibold text-copper bg-copper/10 hover:bg-copper/20 transition-colors cursor-pointer"
          title="See AI decision breakdown for this payment"
        >
          <HelpCircle className="h-2.5 w-2.5" />
          <span>Why</span>
        </button>
      )}
    </span>
  )
}
