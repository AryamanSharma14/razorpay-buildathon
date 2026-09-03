import { useEffect } from 'react'

export interface HotkeyHandlers {
  onTogglePresenter?: () => void
  onToggleTerminal?: () => void
  onToggleCustomerPhone?: () => void
  onOpenSimulator?: () => void
  onResetDemo?: () => void
  onShowShortcuts?: () => void
  onEscape?: () => void
}

export function useHotkeys(handlers: HotkeyHandlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if (e.key === 'Escape') {
        handlers.onEscape?.()
        return
      }

      if (isInput || e.metaKey || e.ctrlKey || e.altKey) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'p':
          e.preventDefault()
          handlers.onTogglePresenter?.()
          break
        case 't':
          e.preventDefault()
          handlers.onToggleTerminal?.()
          break
        case 'c':
          e.preventDefault()
          handlers.onToggleCustomerPhone?.()
          break
        case 'd':
          e.preventDefault()
          handlers.onOpenSimulator?.()
          break
        case 'r':
          e.preventDefault()
          handlers.onResetDemo?.()
          break
        case '?':
          e.preventDefault()
          handlers.onShowShortcuts?.()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}
