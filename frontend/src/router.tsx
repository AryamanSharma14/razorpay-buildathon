import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './App'
import { Placeholder } from './components/common/Placeholder'

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
  { path: '/', el: <Placeholder name="Overview" /> },
  { path: '/queue', el: <Placeholder name="Live Queue" /> },
  { path: '/payment/:id', el: <Placeholder name="Payment Detail" /> },
  { path: '/analytics', el: <Placeholder name="Decline Analytics" /> },
  { path: '/funnel', el: <Placeholder name="Recovery Funnel" /> },
  { path: '/policy', el: <Placeholder name="Policy Comparison" /> },
  { path: '/downtime', el: <Placeholder name="Downtime Board" /> },
  { path: '/model-health', el: <Placeholder name="Model Health" /> },
  { path: '/audit', el: <Placeholder name="Audit Trail" /> },
  { path: '/economics', el: <Placeholder name="Economics" /> },
  { path: '/insights', el: <Placeholder name="Claude Insights" /> },
  { path: '/simulator', el: <Placeholder name="Simulator" /> },
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
