import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, RotateCcw, X, ShieldAlert, AlertOctagon, Layers, CheckCircle2, Loader2 } from 'lucide-react'
import { api } from '../../lib/api'
import { useVerdict } from './VerdictBanner'
import { sound } from '../../lib/sound'
import { cn } from '../../lib/utils'

interface PresenterBarProps {
  isOpen: boolean
  onClose: () => void
  onOpenCustomerPhone?: () => void
}

export function PresenterBar({ isOpen, onClose }: PresenterBarProps) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { showVerdict } = useVerdict()
  const [runningKey, setRunningKey] = useState<string | null>(null)
  const [completedKey, setCompletedKey] = useState<string | null>(null)

  const invalidateAll = () => qc.invalidateQueries()

  const simMutation = useMutation({
    mutationFn: api.simulate,
    onSuccess: () => invalidateAll(),
  })

  const resetMutation = useMutation({
    mutationFn: api.simulateReset,
    onSuccess: () => invalidateAll(),
  })

  if (!isOpen) return null

  const isPending = simMutation.isPending || resetMutation.isPending

  const runScenario = async (
    key: string,
    scenario: 'soft' | 'hard' | 'downtime' | 'ev_negative',
    destination: string,
    verdictTitle: string,
    verdictDetail: string,
    verdictType: 'recovered' | 'blocked' | 'skipped'
  ) => {
    sound.click()
    setRunningKey(key)
    setCompletedKey(null)
    try {
      await simMutation.mutateAsync({
        scenario,
        count: scenario === 'ev_negative' ? 1 : 3,
        advance_hours: 6,
      })
      navigate(destination)

      // Success animation
      setCompletedKey(key)
      setTimeout(() => setCompletedKey(null), 1500)

      if (verdictType === 'recovered') {
        sound.success()
      } else if (verdictType === 'blocked') {
        sound.guard()
      } else {
        sound.chime()
      }

      showVerdict({ type: verdictType, title: verdictTitle, detail: verdictDetail })
    } catch {
      // Handled
    } finally {
      setRunningKey(null)
    }
  }

  const handleReset = async () => {
    sound.click()
    setRunningKey('reset')
    setCompletedKey(null)
    try {
      await resetMutation.mutateAsync()
      navigate('/')
      setCompletedKey('reset')
      setTimeout(() => setCompletedKey(null), 1500)
      sound.chime()
      showVerdict({
        type: 'info',
        title: 'DEMO RESET',
        detail: 'All demo payments and audit records have been cleared.',
      })
    } finally {
      setRunningKey(null)
    }
  }

  const scenarios = [
    {
      key: 'soft',
      label: 'Low Balance',
      icon: Play,
      scenario: 'soft' as const,
      dest: '/',
      verdictTitle: 'RECOVERED — ML waited for salary day, switched to UPI',
      verdictDetail: 'Customer paid via WhatsApp UPI link on payday — ₹1,499 rescued.',
      verdictType: 'recovered' as const,
    },
    {
      key: 'hard',
      label: 'Expired Card',
      icon: ShieldAlert,
      scenario: 'hard' as const,
      dest: '/policy',
      verdictTitle: 'BLOCKED — Permanent failure shielded',
      verdictDetail: 'Expired card stopped with 0 retries. ₹8.30 fine prevented.',
      verdictType: 'blocked' as const,
    },
    {
      key: 'downtime',
      label: 'Bank Outage',
      icon: Layers,
      scenario: 'downtime' as const,
      dest: '/queue',
      verdictTitle: 'PARKED — Bank outage detected, auto-retry queued',
      verdictDetail: 'Payments held safely during outage, will auto-retry on recovery.',
      verdictType: 'recovered' as const,
    },
    {
      key: 'ev_negative',
      label: 'Micro-charge',
      icon: AlertOctagon,
      scenario: 'ev_negative' as const,
      dest: '/economics',
      verdictTitle: 'SKIPPED — Recovery cost exceeds payment value',
      verdictDetail: '₹0.01 payment skipped: sending ₹0.35 reminder would lose money.',
      verdictType: 'skipped' as const,
    },
  ]

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-[#0d0e12]/95 px-3 py-2 shadow-2xl backdrop-blur-xl">
        {/* Label */}
        <div className="px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-copper">
          Demo
        </div>

        <div className="h-5 w-px bg-border mx-0.5" />

        {/* Scenario Buttons */}
        {scenarios.map((s) => {
          const Icon = s.icon
          const isRunning = runningKey === s.key
          const isCompleted = completedKey === s.key
          return (
            <button
              key={s.key}
              type="button"
              disabled={isPending}
              onClick={() =>
                runScenario(s.key, s.scenario, s.dest, s.verdictTitle, s.verdictDetail, s.verdictType)
              }
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all cursor-pointer',
                isCompleted
                  ? 'bg-pos/20 text-pos'
                  : isRunning
                  ? 'bg-copper/20 text-copper'
                  : 'text-bone hover:bg-carbon hover:text-paper'
              )}
            >
              {isRunning ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isCompleted ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              <span>{s.label}</span>
            </button>
          )
        })}

        <div className="h-5 w-px bg-border mx-0.5" />

        {/* Reset */}
        <button
          type="button"
          disabled={isPending}
          onClick={handleReset}
          className={cn(
            'flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer',
            completedKey === 'reset'
              ? 'text-pos'
              : 'text-text-muted hover:text-copper hover:bg-carbon'
          )}
        >
          {runningKey === 'reset' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : completedKey === 'reset' ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <RotateCcw className="h-3 w-3" />
          )}
          <span>Reset</span>
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={() => {
            sound.click()
            onClose()
          }}
          className="rounded-lg p-1.5 text-text-faint hover:bg-carbon hover:text-bone transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
