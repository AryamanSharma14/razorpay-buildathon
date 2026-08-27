import { Outlet } from 'react-router-dom'
import { Sidebar } from './components/shell/Sidebar'
import { TopBar } from './components/shell/TopBar'

export function AppLayout() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
