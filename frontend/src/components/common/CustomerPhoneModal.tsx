import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ArrowLeft, Send, Sparkles, X } from 'lucide-react'
import { api } from '../../lib/api'
import { inr } from '../../lib/format'
import { sound } from '../../lib/sound'
import { useVerdict } from './VerdictBanner'

interface CustomerPhoneModalProps {
  isOpen: boolean
  onClose: () => void
  paymentId?: string
  amountInr?: number
  merchantName?: string
  customerName?: string
}

export function CustomerPhoneModal({
  isOpen,
  onClose,
  paymentId = 'pay_sim_soft_demo',
  amountInr = 1499,
  merchantName = 'Cult.fit',
  customerName = 'Rahul',
}: CustomerPhoneModalProps) {
  const qc = useQueryClient()
  const { showVerdict } = useVerdict()
  const [stage, setStage] = useState<'chat' | 'processing' | 'success'>('chat')

  const forceMutation = useMutation({
    mutationFn: () => api.forceRetry(paymentId),
    onSuccess: () => {
      qc.invalidateQueries()
    },
  })

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!isOpen) return null

  const handlePayNow = async () => {
    sound.click()
    setStage('processing')

    // Simulate OTP / UPI PIN processing delay
    setTimeout(() => {
      forceMutation.mutate()
      sound.success()
      setStage('success')

      showVerdict({
        type: 'recovered',
        title: `PAYMENT RECOVERED: ${inr(amountInr)}`,
        detail: `Customer ${customerName} successfully completed checkout via 1-tap WhatsApp UPI link. Merchant bank balance credited.`,
      })
    }, 1200)
  }

  const handleClose = () => {
    setStage('chat')
    onClose()
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      {/* Mobile Device Frame */}
      <div className="relative w-full max-w-[340px] rounded-[42px] border-[6px] border-[#2e3038] bg-[#0c0d11] p-3 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 h-4 w-24 rounded-full bg-black flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-[#1a1b20]" />
        </div>

        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-carbon border border-border text-text-muted hover:text-paper shadow-md cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* WhatsApp Mobile App UI */}
        <div className="mt-5 flex flex-col h-[560px] rounded-[32px] overflow-hidden bg-[#0b141a] border border-[#1f2c34]">
          {/* WhatsApp Header */}
          <div className="flex items-center gap-2.5 bg-[#1f2c34] px-3.5 py-3 text-white">
            <ArrowLeft className="h-4 w-4 text-[#8696a0]" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-copper text-obsidian font-bold text-xs">
              R
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-xs text-[#e9edef] truncate">{merchantName}</span>
                <CheckCircle2 className="h-3 w-3 text-[#53bdeb] fill-[#53bdeb] text-obsidian shrink-0" />
              </div>
              <div className="text-[10px] text-[#8696a0]">Verified Business</div>
            </div>
          </div>

          {/* Chat Canvas */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px]">
            {/* Timestamp */}
            <div className="text-center">
              <span className="rounded-md bg-[#182229] px-2 py-0.5 text-[9px] text-[#8696a0]">
                TODAY (FRIDAY SALARY MORNING)
              </span>
            </div>

            {/* Inbound AI Recovery Message */}
            <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-[#1f2c34] p-3 text-xs text-[#e9edef] shadow space-y-2.5 border border-[#2a3942]">
              <div className="flex items-center gap-1.5 font-bold text-copper text-[11px]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Hi {customerName}! Complete your {merchantName} order</span>
              </div>

              <p className="text-[11px] leading-relaxed text-[#d1d7db]">
                Your previous card attempt didn’t go through. We’ve held your order for you — complete payment in 1 tap with UPI Autopay.
              </p>

              {/* Interactive UPI Payment Card inside WhatsApp */}
              <div className="rounded-xl border border-[#2a3942] bg-[#111b21] p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#8696a0]">Amount Due:</span>
                  <span className="font-bold text-white font-mono">{inr(amountInr)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#8696a0]">Ref:</span>
                  <span className="font-mono text-[10px] text-copper">{paymentId}</span>
                </div>

                {stage === 'chat' && (
                  <button
                    type="button"
                    onClick={handlePayNow}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#00a884] py-2 text-xs font-bold text-black hover:bg-[#06cf9c] transition-colors cursor-pointer shadow-sm"
                  >
                    <span>Pay with Google Pay / PhonePe</span>
                  </button>
                )}

                {stage === 'processing' && (
                  <div className="flex items-center justify-center gap-2 py-2 text-xs text-copper animate-pulse font-medium">
                    <span className="h-3 w-3 rounded-full border-2 border-copper border-t-transparent animate-spin" />
                    <span>Verifying UPI PIN…</span>
                  </div>
                )}

                {stage === 'success' && (
                  <div className="rounded-lg bg-[#00a884]/20 border border-[#00a884]/40 p-2.5 text-center space-y-1">
                    <div className="flex items-center justify-center gap-1 text-[#00a884] font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Payment Successful!</span>
                    </div>
                    <div className="text-[10px] text-[#8696a0]">
                      {inr(amountInr)} transferred to {merchantName}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-right text-[9px] text-[#8696a0]">10:02 AM ✓✓</div>
            </div>
          </div>

          {/* Bottom WhatsApp Input Bar */}
          <div className="flex items-center gap-2 bg-[#1f2c34] px-3 py-2 border-t border-[#2a3942]">
            <div className="flex-1 rounded-full bg-[#2a3942] px-3 py-1.5 text-[11px] text-[#8696a0]">
              Type a message
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00a884] text-black">
              <Send className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
