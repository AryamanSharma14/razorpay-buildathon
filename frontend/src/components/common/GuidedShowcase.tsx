import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Brain,
  CreditCard,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
import { sound } from '../../lib/sound'
import { api } from '../../lib/api'
import { CustomerPhoneModal } from './CustomerPhoneModal'
import { TimingRadarModal } from './TimingRadarModal'
import { inr } from '../../lib/format'
import { cn } from '../../lib/utils'

export interface ShowcaseStep {
  title: string
  subtitle: string
  route: string
  actionLabel: string
  highlightSelector?: string
  interactiveAction?: {
    label: string
    type: 'decline' | 'radar' | 'phone'
  }
  explanation: string
}

const SHOWCASE_STEPS: ShowcaseStep[] = [
  {
    title: '1. Customer Checkout Attempt & Immediate Soft Decline',
    subtitle: 'Customer attempts ₹1,499 checkout on Cult.fit. Bank returns insufficient funds.',
    route: '/',
    actionLabel: '1. Card Failure Triggered',
    interactiveAction: {
      label: 'View Checkout Decline Simulation',
      type: 'decline',
    },
    explanation:
      'Customer attempts a ₹1,499 purchase with an HDFC debit card. The issuing bank returns insufficient funds. Rather than blindly retrying and risking a bank penalty or spamming the customer, the agent intercepts the decline in milliseconds.',
  },
  {
    title: '2. 240-Hour ML Timing Radar & Payday Alignment',
    subtitle: 'GradientBoosting model scans 240 hours into the future to find the salary credit window.',
    route: '/queue',
    actionLabel: '2. ML Radar Scans 240h',
    interactiveAction: {
      label: 'Open Interactive 240h ML Radar',
      type: 'radar',
    },
    explanation:
      'Instead of retrying blindly in 24 hours, the ML timing radar evaluates hourly recovery probability across 10 days (240h). It locates Friday 10:00 AM (Indian Salary Credit window) as the 84% peak probability slot and parks the retry.',
  },
  {
    title: '3. Multi-Rail UPI Reroute & 1-Tap WhatsApp Checkout',
    subtitle: 'Customer receives a verified WhatsApp notification on Friday with 1-tap UPI payment.',
    route: '/',
    actionLabel: '3. WhatsApp UPI Link Paid',
    interactiveAction: {
      label: 'Open Customer WhatsApp Simulation',
      type: 'phone',
    },
    explanation:
      'On Friday morning, the customer receives an official verified WhatsApp message with a direct 1-tap UPI payment link. Customer opens Google Pay / PhonePe and completes the payment in 3 seconds — ₹1,499 rescued into the merchant account!',
  },
  {
    title: '4. Regulatory Fine Shield & Visa/Mastercard Protection',
    subtitle: 'Merchant saved from Visa Category-1 fines ($0.10/retry) and Mastercard retry caps.',
    route: '/policy',
    actionLabel: '4. Regulatory Fines Prevented',
    highlightSelector: '.grid',
    explanation:
      'The engine automatically detects permanent card declines (expired card, invalid account) and enforces zero retries. This completely shields the merchant from ₹8.30 per-incident Visa/Mastercard penalties.',
  },
  {
    title: '5. Executive Scale & Net ROI Projection',
    subtitle: 'Scaling across 10,000 monthly failures yields +₹18.4 Lakhs annual profit lift at 600× ROI.',
    route: '/economics',
    actionLabel: '5. Scale ROI Verified',
    highlightSelector: '.grid',
    explanation:
      'At 10,000 monthly failed payments, moving from the 45.5% fixed retry baseline to our 61.1% ML recovery rate recovers +₹18,40,000 in net annual revenue with a 600× return over messaging costs.',
  },
]

// Inject styles once
const STYLE_ID = 'showcase-styles'
function ensureStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes showcase-pulse-ring {
      0%, 100% { box-shadow: 0 0 0 0 rgba(204, 145, 102, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(204, 145, 102, 0); }
    }
    @keyframes showcase-fade-in {
      0% { opacity: 0; transform: translateY(8px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .showcase-spotlight-target {
      position: relative;
      z-index: 25;
      border-radius: 12px;
      animation: showcase-pulse-ring 2s ease-in-out infinite;
    }
    .showcase-overlay {
      position: fixed;
      inset: 0;
      z-index: 20;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(1.5px);
      transition: opacity 300ms ease;
    }
    .showcase-panel {
      animation: showcase-fade-in 300ms ease-out forwards;
    }
  `
  document.head.appendChild(style)
}

interface GuidedShowcaseContextType {
  isActive: boolean
  currentStepIndex: number
  startShowcase: () => void
  stopShowcase: () => void
  nextStep: () => void
  prevStep: () => void
  isSoundOn: boolean
  toggleSound: () => void
}

const GuidedShowcaseContext = createContext<GuidedShowcaseContextType>({
  isActive: false,
  currentStepIndex: 0,
  startShowcase: () => {},
  stopShowcase: () => {},
  nextStep: () => {},
  prevStep: () => {},
  isSoundOn: false,
  toggleSound: () => {},
})

export function useGuidedShowcase() {
  return useContext(GuidedShowcaseContext)
}

export function GuidedShowcaseProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()

  const [isActive, setIsActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isSoundOn, setIsSoundOn] = useState(true)
  const [activePaymentId, setActivePaymentId] = useState<string>('pay_demo_cultfit_1499')
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false)
  const [isRadarModalOpen, setIsRadarModalOpen] = useState(false)
  const [showDeclineSimModal, setShowDeclineSimModal] = useState(false)
  const highlightRef = useRef<Element | null>(null)
  const prevHighlightRef = useRef<Element | null>(null)

  useEffect(() => {
    ensureStyles()
  }, [])

  const toggleSound = useCallback(() => {
    const next = !isSoundOn
    setIsSoundOn(next)
    if (next) sound.chime()
  }, [isSoundOn])

  const applyHighlight = useCallback((selector?: string) => {
    if (prevHighlightRef.current) {
      prevHighlightRef.current.classList.remove('showcase-spotlight-target')
    }

    if (!selector) return

    setTimeout(() => {
      const el = document.querySelector(selector)
      if (el) {
        el.classList.add('showcase-spotlight-target')
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        highlightRef.current = el
        prevHighlightRef.current = el
      }
    }, 350)
  }, [])

  const removeHighlight = useCallback(() => {
    if (prevHighlightRef.current) {
      prevHighlightRef.current.classList.remove('showcase-spotlight-target')
      prevHighlightRef.current = null
    }
    highlightRef.current = null
  }, [])

  const executeStepActions = useCallback(
    async (stepIdx: number) => {
      const s = SHOWCASE_STEPS[stepIdx]
      if (!s) return

      // Navigate to destination page cleanly first
      if (location.pathname !== s.route) {
        navigate(s.route)
      }

      // Close any active sub-modals so the judge sees the explanation first
      setShowDeclineSimModal(false)
      setIsRadarModalOpen(false)
      setIsPhoneModalOpen(false)

      if (stepIdx === 0) {
        sound.click()
        try {
          const res = await api.simulate({ scenario: 'soft', count: 1, amount_min_inr: 1499, amount_max_inr: 1499 })
          if (res.created && res.created[0]) {
            setActivePaymentId(res.created[0])
          }
          qc.invalidateQueries()
        } catch {
          // demo fallback
        }
      } else if (stepIdx === 1) {
        sound.chime()
      } else if (stepIdx === 2) {
        sound.chime()
        try {
          await api.forceRetry(activePaymentId)
          qc.invalidateQueries()
        } catch {
          // demo fallback
        }
      } else if (stepIdx === 3) {
        sound.chime()
      } else if (stepIdx === 4) {
        sound.success()
      }

      applyHighlight(s.highlightSelector)
    },
    [location.pathname, navigate, qc, activePaymentId, applyHighlight]
  )

  const startShowcase = useCallback(() => {
    setIsActive(true)
    setCurrentStepIndex(0)
    sound.chime()
    executeStepActions(0)
  }, [executeStepActions])

  const stopShowcase = useCallback(() => {
    setIsActive(false)
    setCurrentStepIndex(0)
    setIsPhoneModalOpen(false)
    setIsRadarModalOpen(false)
    setShowDeclineSimModal(false)
    removeHighlight()
    sound.click()
  }, [removeHighlight])

  const nextStep = useCallback(() => {
    if (currentStepIndex < SHOWCASE_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1
      setCurrentStepIndex(nextIdx)
      executeStepActions(nextIdx)
    } else {
      stopShowcase()
    }
  }, [currentStepIndex, executeStepActions, stopShowcase])

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1
      setCurrentStepIndex(prevIdx)
      executeStepActions(prevIdx)
    }
  }, [currentStepIndex, executeStepActions])

  // Global key bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        nextStep()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevStep()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        stopShowcase()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, nextStep, prevStep, stopShowcase])

  const step = SHOWCASE_STEPS[currentStepIndex]

  const handleOpenAction = (actionType: 'decline' | 'radar' | 'phone') => {
    sound.click()
    if (actionType === 'decline') {
      setShowDeclineSimModal(true)
    } else if (actionType === 'radar') {
      setIsRadarModalOpen(true)
    } else if (actionType === 'phone') {
      setIsPhoneModalOpen(true)
    }
  }

  return (
    <GuidedShowcaseContext.Provider
      value={{
        isActive,
        currentStepIndex,
        startShowcase,
        stopShowcase,
        nextStep,
        prevStep,
        isSoundOn,
        toggleSound,
      }}
    >
      {children}

      {/* Dark overlay backdrop during tour */}
      {isActive && <div className="showcase-overlay" onClick={stopShowcase} />}

      {/* Step 1 Simulation Modal: Demonstrates actual live customer checkout failure */}
      {showDeclineSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-neg/60 bg-onyx p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-paper font-serif font-bold text-base">
                <CreditCard className="h-5 w-5 text-copper" />
                <span>Cult.fit Customer Checkout</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDeclineSimModal(false)}
                className="rounded-full bg-neg/15 px-2.5 py-0.5 text-xs font-bold text-neg uppercase hover:bg-neg/25 transition-colors cursor-pointer"
              >
                Close (✕)
              </button>
            </div>

            <div className="rounded-xl bg-carbon p-4 space-y-2 border border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Customer:</span>
                <span className="font-semibold text-paper">Rahul S. (HDFC Debit Card)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Purchase:</span>
                <span className="font-semibold text-paper">Cultpass Elite Monthly</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Amount:</span>
                <span className="font-bold text-paper font-mono">{inr(1499)}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                <span className="text-neg flex items-center gap-1 font-semibold">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Bank Error:</span>
                </span>
                <span className="font-mono text-xs text-neg font-bold">51: INSUFFICIENT_FUNDS</span>
              </div>
            </div>

            <div className="rounded-xl bg-copper/10 border border-copper/30 p-3 text-xs space-y-1">
              <div className="font-bold text-copper flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>AI Agent Action:</span>
              </div>
              <p className="text-bone text-[11px] leading-relaxed">
                Classified as <strong>SOFT (Recoverable)</strong>. Immediate retry held back to avoid bank spam. ML timing radar scheduled to locate payday window.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating bottom panel */}
      {isActive && step && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-4 showcase-panel">
          <div className="rounded-2xl border border-copper/80 bg-[#0d0e12]/98 p-4 shadow-2xl backdrop-blur-xl space-y-3">
            {/* Step indicator dots */}
            <div className="flex items-center gap-1.5">
              {SHOWCASE_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i <= currentStepIndex
                      ? 'bg-copper flex-[2]'
                      : 'bg-border flex-1'
                  )}
                />
              ))}
            </div>

            {/* Content & Action Trigger */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-copper text-obsidian font-serif font-bold text-base shadow">
                  {currentStepIndex + 1}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-sm font-bold text-paper">
                      {step.title}
                    </span>
                    <span className="rounded-full bg-copper/15 px-2 py-0.5 text-[10px] font-bold text-copper uppercase">
                      Step {currentStepIndex + 1} of {SHOWCASE_STEPS.length}
                    </span>
                  </div>
                  <p className="text-xs text-bone leading-relaxed">
                    {step.explanation}
                  </p>
                </div>
              </div>

              {/* Optional Interactive Launch Pill for that step */}
              {step.interactiveAction && (
                <button
                  type="button"
                  onClick={() => handleOpenAction(step.interactiveAction!.type)}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-copper/60 bg-copper/15 px-3 py-2 text-xs font-bold text-copper hover:bg-copper hover:text-obsidian transition-all shadow-xs cursor-pointer"
                >
                  {step.interactiveAction.type === 'phone' ? (
                    <Smartphone className="h-4 w-4" />
                  ) : step.interactiveAction.type === 'radar' ? (
                    <Brain className="h-4 w-4" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  <span>{step.interactiveAction.label}</span>
                </button>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted hover:text-paper disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={stopShowcase}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted hover:text-paper hover:bg-carbon transition-colors cursor-pointer"
                >
                  Exit Tour
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-1.5 rounded-lg bg-copper px-4 py-2 text-xs font-bold text-obsidian hover:bg-copper-glow transition-all cursor-pointer shadow-sm"
                >
                  <span>{currentStepIndex === SHOWCASE_STEPS.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Modals triggered on demand by user during showcase */}
      <CustomerPhoneModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        paymentId={activePaymentId}
        amountInr={1499}
        merchantName="Cult.fit"
        customerName="Rahul S."
      />
      <TimingRadarModal
        isOpen={isRadarModalOpen}
        onClose={() => setIsRadarModalOpen(false)}
        paymentId={activePaymentId}
        chosenDelayHours={34}
        confidence={0.84}
      />
    </GuidedShowcaseContext.Provider>
  )
}
