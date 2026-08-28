import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './App'
import Overview from './pages/Overview'
import Queue from './pages/Queue'
import PaymentDetail from './pages/PaymentDetail'
import Analytics from './pages/Analytics'
import FunnelPage from './pages/Funnel'
import Policy from './pages/Policy'
import Downtime from './pages/Downtime'
import ModelHealth from './pages/ModelHealth'
import Audit from './pages/Audit'
import Economics from './pages/Economics'
import Insights from './pages/Insights'
import Simulator from './pages/Simulator'

export const NAV_GROUPS = [
  {
    label: 'Recovery',
    items: [
      { path: '/', label: 'Overview', icon: 'LayoutDashboard' },
      { path: '/queue', label: 'Live Queue', icon: 'ListChecks' },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { path: '/analytics', label: 'Decline Analytics', icon: 'TrendingDown' },
      { path: '/funnel', label: 'Recovery Funnel', icon: 'Filter' },
      { path: '/policy', label: 'Policy Comparison', icon: 'FlaskConical' },
    ],
  },
  {
    label: 'Ops',
    items: [
      { path: '/downtime', label: 'Downtime Board', icon: 'AlertTriangle' },
      { path: '/model-health', label: 'Model Health', icon: 'Brain' },
      { path: '/audit', label: 'Audit Trail', icon: 'ScrollText' },
    ],
  },
  {
    label: 'Business',
    items: [{ path: '/economics', label: 'Economics', icon: 'IndianRupee' }],
  },
  {
    label: 'AI',
    items: [{ path: '/insights', label: 'Claude Insights', icon: 'Sparkles' }],
  },
  {
    label: 'Demo',
    items: [{ path: '/simulator', label: 'Simulator', icon: 'Clapperboard' }],
  },
] as const

const routeEls = [
  { path: '/', el: <Overview /> },
  { path: '/queue', el: <Queue /> },
  { path: '/payment/:id', el: <PaymentDetail /> },
  { path: '/analytics', el: <Analytics /> },
  { path: '/funnel', el: <FunnelPage /> },
  { path: '/policy', el: <Policy /> },
  { path: '/downtime', el: <Downtime /> },
  { path: '/model-health', el: <ModelHealth /> },
  { path: '/audit', el: <Audit /> },
  { path: '/economics', el: <Economics /> },
  { path: '/insights', el: <Insights /> },
  { path: '/simulator', el: <Simulator /> },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: routeEls.map(({ path, el }) => ({
      index: path === '/',
      path: path === '/' ? undefined : path.slice(1),
      element: el,
    })),
  },
])
