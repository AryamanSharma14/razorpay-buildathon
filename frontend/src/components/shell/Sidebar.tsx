import { NavLink } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { NAV_GROUPS } from '../../router'
import { cn } from '../../lib/utils'

export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="h-2 w-2 animate-pulse rounded-full bg-pos" />
        <div className="leading-tight">
          <div className="text-sm font-semibold">Recovery Agent</div>
          <div className="text-[11px] text-text-faint">Compliance-Bounded · Razorpay</div>
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
                      'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors',
                      isActive
                        ? 'bg-accent/15 text-text'
                        : 'text-text-muted hover:bg-surface-hover hover:text-text',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
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
