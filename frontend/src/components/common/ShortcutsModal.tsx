import { Modal } from './Modal'

interface ShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { key: 'P', desc: 'Toggle Presenter Mode (floating demo scenario bar)' },
  { key: 'T', desc: 'Toggle Live AI Agent Reasoning Terminal' },
  { key: 'C', desc: 'Open Interactive Customer Phone & WhatsApp Simulator' },
  { key: 'D', desc: 'Go to Scenario Simulator' },
  { key: 'R', desc: 'Reset all demo data (with confirmation)' },
  { key: '?', desc: 'Show keyboard shortcuts' },
  { key: 'Esc', desc: 'Close dialogs, drawers, and overlays' },
]

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts">
      <div className="space-y-3">
        <p className="text-[13px] text-text-muted">
          Use these shortcuts to navigate and control the recovery agent during live demos.
        </p>
        <div className="divide-y divide-border/60 rounded-md border border-border bg-surface p-3">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-2.5 first:pt-1 last:pb-1">
              <span className="text-[13px] text-bone">{s.desc}</span>
              <kbd className="min-w-[28px] rounded border border-steel/50 bg-carbon px-2 py-1 text-center font-mono text-[12px] font-semibold text-paper">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
