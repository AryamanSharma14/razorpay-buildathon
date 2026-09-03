import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sidebar } from './components/shell/Sidebar'
import { TopBar } from './components/shell/TopBar'
import { DateRangeProvider, useDateRange } from './lib/dateRange'
import { VerdictProvider, VerdictBanner, useVerdict } from './components/common/VerdictBanner'
import { GuidedShowcaseProvider } from './components/common/GuidedShowcase'
import { PresenterBar } from './components/common/PresenterBar'
import { ShortcutsModal } from './components/common/ShortcutsModal'
import { AgentTerminalDrawer } from './components/common/AgentTerminalDrawer'
import { CustomerPhoneModal } from './components/common/CustomerPhoneModal'
import { ExecutiveBriefModal } from './components/common/ExecutiveBriefModal'
import { useHotkeys } from './lib/useHotkeys'
import { api } from './lib/api'
import { qk } from './lib/queryKeys'
import { sound } from './lib/sound'

function AppContent() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { showVerdict } = useVerdict()
  const { fromDate, toDate, rangeKey } = useDateRange()

  const [isPresenterOpen, setIsPresenterOpen] = useState(() => {
    return localStorage.getItem('presenter_mode') === 'true'
  })
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)
  const [isCustomerPhoneOpen, setIsCustomerPhoneOpen] = useState(false)
  const [isExecutiveBriefOpen, setIsExecutiveBriefOpen] = useState(false)

  // Fetch live stats and fines for executive brief
  const stats = useQuery({
    queryKey: qk.stats(rangeKey),
    queryFn: () => api.stats(fromDate, toDate),
  })
  const fines = useQuery({
    queryKey: qk.fineAvoidance(),
    queryFn: () => api.fineAvoidance(),
  })

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

  useEffect(() => {
    localStorage.setItem('presenter_mode', String(isPresenterOpen))
  }, [isPresenterOpen])

  useHotkeys({
    onTogglePresenter: () => {
      sound.click()
      setIsPresenterOpen((prev) => !prev)
    },
    onToggleTerminal: () => {
      sound.click()
      setIsTerminalOpen((prev) => !prev)
    },
    onOpenSimulator: () => navigate('/simulator'),
    onResetDemo: () => {
      if (window.confirm('Reset all demo data?')) resetMutation.mutate()
    },
    onShowShortcuts: () => setIsShortcutsOpen(true),
    onEscape: () => {
      setIsShortcutsOpen(false)
      setIsTerminalOpen(false)
      setIsCustomerPhoneOpen(false)
      setIsExecutiveBriefOpen(false)
      setIsPresenterOpen(false)
    },
  })

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        <TopBar
          isPresenterOpen={isPresenterOpen}
          onTogglePresenter={() => setIsPresenterOpen((prev) => !prev)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          onOpenTerminal={() => setIsTerminalOpen(true)}
          onOpenCustomerPhone={() => setIsCustomerPhoneOpen(true)}
          onOpenExecutiveBrief={() => setIsExecutiveBriefOpen(true)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-8 py-6">
          <VerdictBanner />
          <Outlet />
        </main>
      </div>

      <PresenterBar
        isOpen={isPresenterOpen}
        onClose={() => setIsPresenterOpen(false)}
        onOpenCustomerPhone={() => setIsCustomerPhoneOpen(true)}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <AgentTerminalDrawer
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
      />

      <CustomerPhoneModal
        isOpen={isCustomerPhoneOpen}
        onClose={() => setIsCustomerPhoneOpen(false)}
        paymentId="pay_demo_recovery"
        amountInr={1499}
        merchantName="Cult.fit"
        customerName="Rahul"
      />

      <ExecutiveBriefModal
        isOpen={isExecutiveBriefOpen}
        onClose={() => setIsExecutiveBriefOpen(false)}
        stats={stats.data}
        fines={fines.data}
      />
    </div>
  )
}

export function AppLayout() {
  return (
    <DateRangeProvider>
      <VerdictProvider>
        <GuidedShowcaseProvider>
          <AppContent />
        </GuidedShowcaseProvider>
      </VerdictProvider>
    </DateRangeProvider>
  )
}
