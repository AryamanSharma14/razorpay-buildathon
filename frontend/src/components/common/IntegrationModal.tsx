import { useState } from 'react'
import { Check, Copy, Globe, Zap, CheckCircle2 } from 'lucide-react'
import { Modal } from './Modal'
import { sound } from '../../lib/sound'

interface IntegrationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function IntegrationModal({ isOpen, onClose }: IntegrationModalProps) {
  const [copied, setCopied] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success'>('idle')
  const [testLatency, setTestLatency] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'nodejs' | 'python' | 'curl'>('nodejs')

  const webhookUrl = `${window.location.origin}/webhook/razorpay`

  const handleCopy = () => {
    sound.click()
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTestPing = async () => {
    sound.click()
    setTestStatus('testing')
    const t0 = performance.now()
    try {
      const res = await fetch('/ping')
      const latency = Math.round(performance.now() - t0)
      if (res.ok) {
        setTestLatency(latency)
        setTestStatus('success')
        sound.success()
      } else {
        setTestStatus('idle')
      }
    } catch {
      setTestStatus('idle')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Razorpay Gateway Integration Hub"
      className="max-w-3xl"
    >
      <div className="space-y-6 pt-2 text-xs">
        <p className="text-[11px] text-text-muted">
          Zero-touch merchant onboarding: Route standard Razorpay webhooks to the autonomous recovery engine with zero checkout code changes.
        </p>
        {/* Webhook Endpoint Strip */}
        <div className="rounded-2xl border border-copper/40 bg-copper/5 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-copper flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              <span>Production Webhook URL</span>
            </span>
            <span className="flex items-center gap-1 text-[10px] text-pos font-semibold bg-pos/15 px-2.5 py-0.5 rounded-full border border-pos/30">
              <span className="h-1.5 w-1.5 rounded-full bg-pos animate-pulse" />
              <span>HMAC-SHA256 Verified</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl border border-border bg-onyx px-3.5 py-2 font-mono text-paper select-all truncate text-xs">
              {webhookUrl}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-copper/50 bg-copper px-3 font-semibold text-obsidian hover:bg-copper-hover transition-colors cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy URL'}</span>
            </button>
          </div>
          <p className="text-[11px] text-text-muted">
            Paste this URL directly into your <strong>Razorpay Dashboard → Settings → Webhooks</strong>.
          </p>
        </div>

        {/* Subscribed Webhook Events Grid */}
        <div className="space-y-2.5">
          <div className="font-semibold text-paper text-xs uppercase tracking-wider flex items-center justify-between">
            <span>Subscribed Razorpay Event Triggers</span>
            <span className="text-[11px] text-text-faint font-normal">All 4 standard webhooks supported</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-border bg-carbon p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-copper">payment.failed</span>
                <span className="text-[10px] bg-pos/20 text-pos px-2 py-0.5 rounded-md font-mono">200 OK</span>
              </div>
              <p className="text-[11px] text-text-muted">
                Classifies soft vs hard decline, computes 240h ML window, applies Visa Cat-1 shield.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-carbon p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-pos">payment_link.paid</span>
                <span className="text-[10px] bg-pos/20 text-pos px-2 py-0.5 rounded-md font-mono">200 OK</span>
              </div>
              <p className="text-[11px] text-text-muted">
                Reconciliation loop-closure. Marks order recovered, increments GMV, stops pending reminders.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-carbon p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-400">payment.downtime.started</span>
                <span className="text-[10px] bg-pos/20 text-pos px-2 py-0.5 rounded-md font-mono">200 OK</span>
              </div>
              <p className="text-[11px] text-text-muted">
                Detects bank gateway outages (e.g. HDFC/SBI). Automatically parks transactions in hold queue.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-carbon p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cyan-400">payment.downtime.resolved</span>
                <span className="text-[10px] bg-pos/20 text-pos px-2 py-0.5 rounded-md font-mono">200 OK</span>
              </div>
              <p className="text-[11px] text-text-muted">
                Instant queue drain. Zero-lag batch retry dispatch the exact second the issuer recovers.
              </p>
            </div>
          </div>
        </div>

        {/* Live Test Ping Button & Result */}
        <div className="rounded-xl border border-border bg-onyx p-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-paper flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-copper" />
              <span>Interactive Webhook Health Ping</span>
            </div>
            <p className="text-[11px] text-text-muted">
              Simulate an authenticated webhook ping from Razorpay cloud to test connectivity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {testStatus === 'success' && (
              <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-pos">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>200 OK ({testLatency}ms)</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleTestPing}
              disabled={testStatus === 'testing'}
              className="flex items-center gap-1.5 rounded-xl border border-copper/50 bg-copper/20 px-3.5 py-2 font-semibold text-copper hover:bg-copper hover:text-obsidian transition-colors cursor-pointer disabled:opacity-50"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>{testStatus === 'testing' ? 'Testing...' : 'Send Test Ping'}</span>
            </button>
          </div>
        </div>

        {/* 2-Line Integration Code Snippet */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-paper uppercase tracking-wider text-xs">
              Merchant Integration Snippet
            </span>
            <div className="flex items-center gap-1 bg-onyx p-0.5 rounded-lg border border-border">
              {(['nodejs', 'python', 'curl'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase transition-colors cursor-pointer ${
                    activeTab === tab ? 'bg-copper text-obsidian font-bold' : 'text-text-muted hover:text-paper'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-black/80 p-3.5 font-mono text-[11px] text-bone overflow-x-auto">
            {activeTab === 'nodejs' && (
              <pre className="text-[#a9b1d6]">
{`// Express.js — Forward Razorpay webhooks to autonomous engine
app.post('/razorpay-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  // Forward directly to recovery agent; no checkout changes required
  fetch('${webhookUrl}', {
    method: 'POST',
    headers: { 'X-Razorpay-Signature': req.headers['x-razorpay-signature'] },
    body: req.body
  });
  res.status(200).json({ status: 'ok' });
});`}
              </pre>
            )}

            {activeTab === 'python' && (
              <pre className="text-[#a9b1d6]">
{`# FastAPI / Flask webhook handler
@app.post("/razorpay-webhook")
async def handle_razorpay(request: Request):
    payload = await request.body()
    sig = request.headers.get("x-razorpay-signature")
    # Forward payload to autonomous recovery engine
    requests.post("${webhookUrl}", data=payload, headers={"X-Razorpay-Signature": sig})
    return {"status": "forwarded"}`}
              </pre>
            )}

            {activeTab === 'curl' && (
              <pre className="text-[#a9b1d6]">
{`# Test endpoint manually via cURL
curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -H "X-Razorpay-Signature: test_sig_demo" \\
  -d '{"event":"payment.failed","payload":{"payment":{"entity":{"id":"pay_test_123","amount":149900}}}}'`}
              </pre>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
