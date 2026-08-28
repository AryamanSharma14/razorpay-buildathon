import { NavLink } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { NAV_GROUPS } from '../../router'
import { cn } from '../../lib/utils'

export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-copper/15 font-serif text-[15px] text-copper">
          R
        </span>
        <div className="leading-tight">
          <div className="font-serif text-[15px] font-medium">Recovery Agent</div>
          <div className="text-[10px] uppercase tracking-[0.08em] text-text-faint">Razorpay</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mt-4 first:mt-1">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-faint">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = (Icons[item.icon as keyof typeof Icons] ??
                Icons.Circle) as Icons.LucideIcon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-nav px-3 py-2 text-[13px] transition-colors',
                      isActive
                        ? 'border-l-2 border-copper bg-carbon text-text'
                        : 'border-l-2 border-transparent text-text-muted hover:bg-surface-hover hover:text-text',
                    )
                  }
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
