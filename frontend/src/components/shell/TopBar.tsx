import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  RotateCcw,
  Sparkles,
  HelpCircle,
  Volume2,
  VolumeX,
  Terminal,
  FileText,
  ChevronDown,
  Play,
  Zap,
  Globe,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useVerdict } from '../common/VerdictBanner'
import { useGuidedShowcase } from '../common/GuidedShowcase'
import { JudgeScenariosModal } from '../common/JudgeScenariosModal'
import { IntegrationModal } from '../common/IntegrationModal'
import { isSoundEnabled, setSoundEnabled, sound } from '../../lib/sound'
import { cn } from '../../lib/utils'

interface TopBarProps {
  isPresenterOpen: boolean
  onTogglePresenter: () => void
  onOpenShortcuts: () => void
  onOpenTerminal?: () => void
  onOpenCustomerPhone?: () => void
  onOpenExecutiveBrief?: () => void
}

export function TopBar({
  isPresenterOpen,
  onTogglePresenter,
  onOpenShortcuts,
  onOpenTerminal,
  onOpenExecutiveBrief,
}: TopBarProps) {
  const qc = useQueryClient()
  const { showVerdict } = useVerdict()
  const { startShowcase } = useGuidedShowcase()
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  const [isJudgeScenariosOpen, setIsJudgeScenariosOpen] = useState(false)
  const [isIntegrationOpen, setIsIntegrationOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsToolsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
    if (next) sound.chime()
  }

  const resetMutation = useMutation({
    mutationFn: api.simulateReset,
    onSuccess: () => {
      qc.invalidateQueries()
      sound.chime()
      showVerdict({
        type: 'info',
        title: 'DEMO RESET',
        detail: 'All demo payments and audit records have been cleared.',
      })
    },
  })

  const handleReset = () => {
    sound.click()
    if (window.confirm('Reset all demo data? This will clear active events and the audit trail.')) {
      resetMutation.mutate()
    }
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-surface/90 backdrop-blur-md px-6 z-30">
        {/* Left: Clean App Branding with Tooltip */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-copper/20 border border-copper/40 text-copper font-serif font-bold text-sm"
            title="Razorpay Autonomous Recovery Agent — Production Edition"
          >
            R
          </div>
          <span
            className="font-serif text-[15px] font-bold tracking-tight text-paper cursor-help"
            title="Autonomous Recovery Orchestrator: Combines 240h ML horizon scanning, Visa/Mastercard regulatory guardrails, and WhatsApp UPI multi-rail routing."
          >
            Autonomous Payment Recovery
          </span>
          <div
            className="flex items-center gap-1.5 rounded-full border border-border/80 bg-onyx px-2.5 py-0.5 text-[11px] font-medium text-pos cursor-help"
            title="Live AI recovery engine active and connected to Razorpay webhook bus."
          >
            <span className="h-1.5 w-1.5 rounded-full bg-pos animate-pulse" />
            <span>Engine Active</span>
          </div>
        </div>

        {/* Right: Consolidated, Clean Controls */}
        <div className="flex items-center gap-2">
          {/* Presenter Mode Pill */}
          <button
            type="button"
            onClick={() => {
              sound.click()
              onTogglePresenter()
            }}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold transition-all shadow-sm cursor-pointer',
              isPresenterOpen
                ? 'border border-copper bg-copper text-obsidian'
                : 'border border-copper/60 bg-copper/15 text-copper hover:bg-copper hover:text-obsidian'
            )}
            title="Toggle Judge Presenter Bar: 1-click live demo scenarios for Soft Decline, Hard Decline, Outage, and Micro-Payments (Press P)"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Demo Controller</span>
            <kbd className="ml-0.5 rounded bg-onyx/40 px-1 py-0.2 font-mono text-[9px]">P</kbd>
          </button>

          {/* Consolidated Tools Menu Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              className="flex items-center gap-1 rounded-full border border-border bg-carbon px-2.5 py-1 text-xs font-medium text-bone hover:border-steel hover:text-paper transition-colors cursor-pointer"
              title="Click to access Guided Tour, Evaluation Scenarios, Gateway Integration, Agent Thought Terminal, Executive Brief, and Shortcuts"
            >
              <span>Tools</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', isToolsOpen && 'rotate-180')} />
            </button>

            {isToolsOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl border border-border bg-onyx p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                {/* Guided Tour in Tools Dropdown */}
                <button
                  type="button"
                  onClick={() => {
                    sound.click()
                    setIsToolsOpen(false)
                    startShowcase()
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-paper hover:bg-copper/20 hover:text-copper transition-colors cursor-pointer"
                  title="Launch automated 30-second multi-step tour demonstrating the full recovery pipeline."
                >
                  <div className="flex items-center gap-2">
                    <Play className="h-3.5 w-3.5 text-copper fill-copper" />
                    <span className="font-bold">Play Guided Tour (30s)</span>
                  </div>
                </button>

                {/* Evaluation Scenarios in Tools Dropdown */}
                <button
                  type="button"
                  onClick={() => {
                    sound.click()
                    setIsToolsOpen(false)
                    setIsJudgeScenariosOpen(true)
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-paper hover:bg-carbon hover:text-copper transition-colors cursor-pointer"
                  title="1-Click Evaluation Scenarios: Payday ML, Visa Cat-1 Shield, Bank Outage, and Micro-Payments."
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-copper" />
                    <span className="font-semibold">Evaluation Scenarios</span>
                  </div>
                  <kbd className="rounded bg-carbon px-1.5 py-0.5 font-mono text-[9px] text-text-faint">J</kbd>
                </button>

                {/* Gateway Integration Hub */}
                <button
                  type="button"
                  onClick={() => {
                    sound.click()
                    setIsToolsOpen(false)
                    setIsIntegrationOpen(true)
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-bone hover:bg-carbon hover:text-copper transition-colors cursor-pointer"
                  title="Razorpay webhook URL, subscribed event triggers, test ping, and integration snippets."
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-copper" />
                    <span>Gateway Integration</span>
                  </div>
                  <span className="text-[10px] text-pos font-mono">LIVE</span>
                </button>

                {onOpenTerminal && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.click()
                      setIsToolsOpen(false)
                      onOpenTerminal()
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-bone hover:bg-carbon hover:text-copper transition-colors cursor-pointer"
                    title="Open live terminal streaming AI autonomous decisions and webhook events."
                  >
                    <div className="flex items-center gap-2">
                      <Terminal className="h-3.5 w-3.5 text-copper" />
                      <span>Agent Terminal</span>
                    </div>
                    <kbd className="rounded bg-carbon px-1.5 py-0.5 font-mono text-[9px] text-text-faint">T</kbd>
                  </button>
                )}

                {onOpenExecutiveBrief && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.click()
                      setIsToolsOpen(false)
                      onOpenExecutiveBrief()
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-bone hover:bg-carbon hover:text-copper transition-colors cursor-pointer"
                    title="Open 1-minute executive summary explaining unit economics and compliance."
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-copper" />
                      <span>Executive Brief</span>
                    </div>
                    <kbd className="rounded bg-carbon px-1.5 py-0.5 font-mono text-[9px] text-text-faint">E</kbd>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    sound.click()
                    setIsToolsOpen(false)
                    onOpenShortcuts()
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-bone hover:bg-carbon hover:text-copper transition-colors cursor-pointer"
                  title="View all keyboard hotkeys (P, T, E, C, R, ?)"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-3.5 w-3.5 text-fog" />
                    <span>Shortcuts & Hotkeys</span>
                  </div>
                  <kbd className="rounded bg-carbon px-1.5 py-0.5 font-mono text-[9px] text-text-faint">?</kbd>
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Audio Effects Icon Button */}
          <button
            type="button"
            onClick={handleToggleSound}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full border transition-colors cursor-pointer',
              soundOn
                ? 'border-copper/60 bg-copper/15 text-copper'
                : 'border-border bg-carbon text-text-faint hover:border-steel hover:text-bone'
            )}
            title={soundOn ? 'Sound Effects Enabled: Chimes on recovery events and clicks. (Click to Mute)' : 'Sound Effects Muted (Click to Enable)'}
          >
            {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>

          {/* Reset Demo Icon Button */}
          <button
            type="button"
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-carbon text-text-muted hover:border-copper hover:text-copper transition-colors disabled:opacity-40 cursor-pointer"
            title="Reset Demo Data: Clears active demo payments and resets the audit trail to default baseline (Press R)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Modals rendered outside header */}
      <JudgeScenariosModal
        isOpen={isJudgeScenariosOpen}
        onClose={() => setIsJudgeScenariosOpen(false)}
      />
      <IntegrationModal
        isOpen={isIntegrationOpen}
        onClose={() => setIsIntegrationOpen(false)}
      />
    </>
  )
}
