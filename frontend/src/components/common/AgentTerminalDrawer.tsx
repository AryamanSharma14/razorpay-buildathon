import { useState, useRef, useEffect } from 'react'
import {
  X,
  Play,
  Pause,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Sparkles,
  Bot,
} from 'lucide-react'
import { useSseFeed } from '../../lib/useSse'
import { dt } from '../../lib/format'
import { formatPaymentName } from './CopyId'
import { cn } from '../../lib/utils'

interface AgentTerminalDrawerProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Translates technical backend webhook events into clear human-language thought steps
 */
function translateEventToHumanLanguage(ev: {
  type: string
  payment_id: string
  summary?: string
  data?: Record<string, unknown>
}) {
  const humanOrderName = formatPaymentName(ev.payment_id)
  const isBlocked = ev.type.includes('block') || ev.type.includes('guard')
  const isRecovered = ev.type === 'recovered'
  const isScheduled = ev.type === 'scheduled' || ev.type.includes('payday')
  const isSkip = ev.type.includes('skip')

  let title = `Evaluating order ${humanOrderName}`
  let humanThought =
    'The AI agent received a payment decline notification from the banking network and is analyzing the transaction history.'
  let policyTag = 'Classification'

  if (ev.type === 'soft' || ev.type.includes('insufficient')) {
    title = `Transient Low Balance Detected for ${humanOrderName}`
    humanThought =
      'The bank reported insufficient funds on customer card. I have classified this as temporary and postponed automated retries to avoid annoying the customer or incurring card network spam penalties.'
    policyTag = 'Soft Decline'
  } else if (ev.type === 'hard' || isBlocked) {
    title = `Regulatory Hard Decline Shield Activated for ${humanOrderName}`
    humanThought =
      'Expired card or invalid account detected. I have blocked 100% of automated retry attempts to protect the merchant from a ₹8.30 Visa Category-1 fine.'
    policyTag = 'Visa/MC Guard'
  } else if (isScheduled) {
    title = `Payday Optimization Slot Chosen for ${humanOrderName}`
    humanThought =
      'I scanned the 240-hour probability surface and scheduled the retry for Friday 10:00 AM (Indian Salary Credit Window). This lifts recovery probability to 84%.'
    policyTag = 'ML Payday Timing'
  } else if (isRecovered) {
    title = `Payment Rescued via 1-Tap WhatsApp UPI for ${humanOrderName}`
    humanThought =
      'The customer approved the WhatsApp UPI payment notification. Funds were immediately recovered and credited directly into merchant bank account.'
    policyTag = 'Recovered'
  } else if (isSkip) {
    title = `Micro-Charge Skipped for ${humanOrderName}`
    humanThought =
      'Recovery withheld because the payment amount is too small. Sending a ₹0.35 WhatsApp reminder would result in negative expected value.'
    policyTag = 'Cost Gate'
  }

  return {
    title,
    humanThought,
    policyTag,
    isBlocked,
    isRecovered,
    isScheduled,
    isSkip,
    rawType: ev.type,
    rawId: ev.payment_id,
  }
}

export function AgentTerminalDrawer({ isOpen, onClose }: AgentTerminalDrawerProps) {
  const { events, connected } = useSseFeed(50)
  const [isPaused, setIsPaused] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const terminalEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isPaused && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [events, isPaused])

  if (!isOpen) return null

  const handleCopyLogs = () => {
    const text = events
      .map((e) => {
        const parsed = translateEventToHumanLanguage(e)
        return `[${e.ts}] ${parsed.title}\nTHOUGHT: ${parsed.humanThought}\nRAW: ${e.type} | ID: ${e.payment_id}\n`
      })
      .join('\n---\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-obsidian/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-[#0a0b0e] shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-border/80 bg-[#121318] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
            </div>
            <div className="ml-2 flex items-center gap-1.5 font-mono text-xs font-semibold text-paper">
              <Bot className="h-4 w-4 text-copper" />
              <span>AI Agent Autonomous Thought Stream</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold',
                connected ? 'bg-pos/15 text-pos' : 'bg-neg/15 text-neg'
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', connected ? 'bg-pos animate-pulse' : 'bg-neg')} />
              {connected ? 'LIVE AGENT ACTIVE' : 'OFFLINE'}
            </span>

            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="flex items-center gap-1 rounded-lg border border-border bg-carbon px-2.5 py-1 text-xs text-text-muted hover:text-paper cursor-pointer"
              title={isPaused ? 'Resume live stream' : 'Pause stream'}
            >
              {isPaused ? <Play className="h-3 w-3 text-pos" /> : <Pause className="h-3 w-3 text-copper" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLogs}
              className="flex items-center gap-1 rounded-lg border border-border bg-carbon px-2.5 py-1 text-xs text-text-muted hover:text-paper cursor-pointer"
              title="Copy human-readable thought logs"
            >
              {copied ? <Check className="h-3 w-3 text-pos" /> : <Copy className="h-3 w-3 text-bone" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-text-muted hover:bg-carbon hover:text-paper cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Console Log Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#08090b]">
          {/* Welcome Intro in Terminal */}
          <div className="text-text-muted border-b border-border/40 pb-3 space-y-1 text-xs">
            <div className="text-copper font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Razorpay Autonomous Decision Copilot</span>
            </div>
            <p className="text-text-faint text-[11px] leading-relaxed">
              Streaming live reasoning: explains why payment retries are delayed, which regulatory rules are enforced, and how recovery windows are timed in plain human language.
            </p>
          </div>

          {events.length === 0 ? (
            <div className="py-16 text-center text-text-muted space-y-2">
              <Bot className="h-8 w-8 text-copper/60 mx-auto animate-pulse" />
              <p className="text-xs">Waiting for live transactions — run a demo scenario to see the AI think.</p>
            </div>
          ) : (
            events.map((ev, i) => {
              const parsed = translateEventToHumanLanguage(ev)
              const isExpanded = expandedIndex === i

              return (
                <div
                  key={`${ev.ts}-${i}`}
                  className={cn(
                    'rounded-xl border p-3.5 transition-all text-xs space-y-2',
                    parsed.isBlocked
                      ? 'border-copper/50 bg-copper/5'
                      : parsed.isRecovered
                      ? 'border-pos/50 bg-pos/5'
                      : parsed.isScheduled
                      ? 'border-copper/40 bg-carbon'
                      : 'border-border/60 bg-surface'
                  )}
                >
                  {/* Top Bar: Icon + Title + Tag */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {parsed.isRecovered ? (
                        <CheckCircle2 className="h-4 w-4 text-pos shrink-0" />
                      ) : parsed.isBlocked ? (
                        <ShieldAlert className="h-4 w-4 text-copper shrink-0" />
                      ) : parsed.isScheduled ? (
                        <Clock className="h-4 w-4 text-copper shrink-0" />
                      ) : (
                        <Bot className="h-4 w-4 text-bone shrink-0" />
                      )}
                      <span className="font-semibold text-paper text-[13px]">{parsed.title}</span>
                    </div>

                    <span className="rounded-full bg-onyx border border-border px-2 py-0.5 text-[10px] font-mono text-copper shrink-0">
                      {parsed.policyTag}
                    </span>
                  </div>

                  {/* Human Language Reasoning (Primary Text) */}
                  <p className="text-bone text-xs leading-relaxed font-sans pl-6">
                    {parsed.humanThought}
                  </p>

                  {/* Expandable Technical Details */}
                  <div className="pl-6 pt-1 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => setExpandedIndex(isExpanded ? null : i)}
                      className="flex items-center gap-1 text-[10px] font-mono text-text-faint hover:text-copper transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      <span>{isExpanded ? 'Hide Raw Technical Telemetry' : 'View Raw Technical Telemetry'}</span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 rounded-lg bg-black/60 p-2.5 font-mono text-[10px] text-text-muted space-y-1 animate-in fade-in duration-150">
                        <div><strong className="text-copper">webhook_event:</strong> {parsed.rawType}</div>
                        <div><strong className="text-copper">database_key:</strong> {parsed.rawId}</div>
                        <div><strong className="text-copper">timestamp:</strong> {dt(ev.ts)}</div>
                        {ev.summary && <div><strong className="text-copper">backend_summary:</strong> {ev.summary}</div>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  )
}
