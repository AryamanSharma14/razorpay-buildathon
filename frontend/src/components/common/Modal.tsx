import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-obsidian/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          'relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-onyx shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200',
          className
        )}
      >
        {/* Sticky Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/80 px-6 py-4 bg-onyx/90 backdrop-blur-md">
          <div className="font-serif text-lg font-bold text-paper">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-text-faint transition-colors hover:bg-carbon hover:text-bone cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
