const { chromium } = require('../frontend/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:8000';
const RAW_VIDEO_DIR = path.join(__dirname, '..', 'build', 'raw_video_4min');

// Exact audio scene cumulative milestones (seconds) matching the user's audio tracks:
// Act 1: 52.14s
// Act 2: 110.47s
// Act 3: 150.86s
// Act 4: 200.78s
// Act 5: 229.85s
// Act 6: 275.36s

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

async function setupCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('custom-cursor')) return;

    const style = document.createElement('style');
    style.id = 'cursor-styles';
    style.textContent = `
      #custom-cursor {
        position: fixed;
        top: 100px;
        left: 100px;
        width: 22px;
        height: 22px;
        pointer-events: none;
        z-index: 9999999;
        transition: transform 0.04s ease-out;
      }
      #custom-cursor svg {
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.75));
      }
      .custom-click-ripple {
        position: fixed;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 2px solid #cc9166;
        background: rgba(204, 145, 102, 0.3);
        pointer-events: none;
        z-index: 9999998;
        transform: translate(-50%, -50%) scale(0.2);
        animation: cursor-ripple-anim 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
      }
      @keyframes cursor-ripple-anim {
        0% { transform: translate(-50%, -50%) scale(0.2); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    const cursor = document.createElement('div');
    cursor.id = 'custom-cursor';
    cursor.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L5.85 2.35a.5.5 0 0 0-.35-.14Z" fill="#cc9166" stroke="#08080a" stroke-width="1.8"/>
      </svg>
    `;
    document.body.appendChild(cursor);

    window.__cursorX = 100;
    window.__cursorY = 100;

    window.__moveCursor = (x, y) => {
      window.__cursorX = x;
      window.__cursorY = y;
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
    };

    window.__clickRipple = (x, y) => {
      const ripple = document.createElement('div');
      ripple.className = 'custom-click-ripple';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 550);
    };
  });
}

class CursorDriver {
  constructor(page, startTime) {
    this.page = page;
    this.startTime = startTime;
    this.x = 260;
    this.y = 120;
  }

  async init() {
    await setupCursor(this.page);
    await this.page.evaluate(({ x, y }) => {
      if (window.__moveCursor) window.__moveCursor(x, y);
    }, { x: this.x, y: this.y });
  }

  async moveTo(targetX, targetY, durationMs = 600, steps = 24) {
    const startX = this.x;
    const startY = this.y;
    const dt = durationMs / steps;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const currentX = Math.round(startX + (targetX - startX) * ease);
      const currentY = Math.round(startY + (targetY - startY) * ease);

      await this.page.evaluate(({ x, y }) => {
        if (window.__moveCursor) window.__moveCursor(x, y);
      }, { x: currentX, y: currentY });

      await this.page.mouse.move(currentX, currentY);
      await sleep(dt);
    }

    this.x = targetX;
    this.y = targetY;
  }

  async hoverSafe(selector, moveDurationMs = 500) {
    try {
      const loc = this.page.locator(selector).first();
      const box = await loc.boundingBox({ timeout: 500 });
      if (box) {
        const targetX = Math.round(box.x + box.width / 2);
        const targetY = Math.round(box.y + box.height / 2);
        await this.moveTo(targetX, targetY, moveDurationMs);
      }
    } catch {}
  }

  async clickSafe(selector, moveDurationMs = 450) {
    try {
      const loc = this.page.locator(selector).first();
      const box = await loc.boundingBox({ timeout: 500 });
      if (box) {
        const targetX = Math.round(box.x + box.width / 2);
        const targetY = Math.round(box.y + box.height / 2);
        await this.moveTo(targetX, targetY, moveDurationMs);
        await this.page.evaluate(({ x, y }) => {
          if (window.__clickRipple) window.__clickRipple(x, y);
        }, { x: targetX, y: targetY });
        await loc.click({ force: true });
        await sleep(200);
      }
    } catch {}
  }

  async smoothScroll(deltaY, durationMs = 600, steps = 15) {
    const dt = durationMs / steps;
    const dy = deltaY / steps;
    for (let i = 0; i < steps; i++) {
      await this.page.evaluate((d) => window.scrollBy(0, d), dy);
      await sleep(dt);
    }
  }

  async closeModal() {
    await this.page.keyboard.press('Escape');
    await sleep(150);
    try {
      const closeBtn = this.page.locator('button:has(svg.lucide-x)').first();
      if (await closeBtn.isVisible({ timeout: 300 })) {
        await closeBtn.click({ force: true });
      }
    } catch {}
    await sleep(200);
  }

  // Waits calmly until an exact second mark from start of recording
  async waitUntil(targetSec, desc = '') {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const remaining = targetSec - elapsed;
    if (remaining > 0) {
      if (desc) console.log(`[${elapsed.toFixed(1)}s -> ${targetSec.toFixed(1)}s] ${desc}`);
      await sleep(remaining * 1000);
    }
  }
}

async function record() {
  if (!fs.existsSync(RAW_VIDEO_DIR)) {
    fs.mkdirSync(RAW_VIDEO_DIR, { recursive: true });
  }

  const oldFiles = fs.readdirSync(RAW_VIDEO_DIR);
  for (const f of oldFiles) {
    if (f.endsWith('.webm') || f.endsWith('.mp4')) {
      try { fs.unlinkSync(path.join(RAW_VIDEO_DIR, f)); } catch {}
    }
  }

  console.log('🚀 Launching Chromium (1920x1080, Calm & Perfectly Synchronized Master)...');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--window-size=1920,1080',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: RAW_VIDEO_DIR,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();
  const startTime = Date.now();
  const driver = new CursorDriver(page, startTime);

  page.on('load', async () => {
    try { await driver.init(); } catch {}
  });

  // =========================================================================
  // 📍 Act 1: The Hook & Executive Telemetry (0:00 – 0:52)
  // Voice: Cult.fit ₹1,499 decline, ₹10k Cr drop-off, naive retries, introducing agent
  // =========================================================================
  console.log('[0.0s] [ACT 1] Navigating to Home (Overview)...');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await driver.init();

  // 0:00 - 0:10: Hover over glowing green "Engine Active" beacon in header
  await driver.moveTo(275, 110, 800);
  await driver.waitUntil(10.0, 'Hovering Engine Active beacon');

  // 0:10 - 0:25: Move cursor smoothly across the 4 spotlight KPI cards
  await driver.hoverSafe('div:has-text("Revenue Recovered") >> nth=-1', 700);
  await driver.waitUntil(14.0, 'Hovering Revenue Recovered card');

  await driver.hoverSafe('div:has-text("Recovery Rate") >> nth=-1', 700);
  await driver.waitUntil(18.0, 'Hovering Recovery Rate (+15.6 pts lift) card');

  await driver.hoverSafe('div:has-text("Orders Evaluated") >> nth=-1', 700);
  await driver.waitUntil(21.5, 'Hovering Orders Evaluated card');

  await driver.hoverSafe('div:has-text("Fines Prevented") >> nth=-1', 700);
  await driver.waitUntil(25.0, 'Hovering Fines Prevented card');

  // 0:25 - 0:34: Click the 7D (Baseline) filter pill
  await driver.clickSafe('button:has-text("7D")', 600);
  await driver.waitUntil(34.0, 'Displaying 7D baseline comparison ledger');

  // 0:34 - 0:42: Scroll down smoothly to Live Decision Stream. Hover over payment rows
  await driver.smoothScroll(340, 700);
  await driver.hoverSafe('.cursor-pointer:has-text("pay_")', 600);
  await driver.waitUntil(42.0, 'Hovering Live Decision Stream rows');

  // 0:42 - 0:50: Click payment row to open AI Decision Breakdown modal
  await driver.clickSafe('.cursor-pointer:has-text("pay_")', 500);
  await driver.moveTo(960, 520, 600);
  await driver.waitUntil(50.0, 'Inspecting AI Decision Breakdown modal');

  // 0:50 - 0:52: Close modal and scroll back to top
  await driver.closeModal();
  await driver.smoothScroll(-340, 400);
  await driver.waitUntil(52.14, 'End of Act 1 milestone');

  // =========================================================================
  // 📍 Act 2: The 30s Guided Showcase Tour (0:52 – 1:50)
  // Voice: Full recovery lifecycle in 30s tour: HDFC failure -> ML Radar -> WhatsApp UPI -> Visa Shield -> +₹18.4L
  // =========================================================================
  console.log('[52.1s] [ACT 2] Opening Tools -> Play Guided Tour (30s)...');
  // 0:52 - 0:58: Click Tools dropdown -> Play Guided Tour
  await driver.clickSafe('button:has-text("Tools")', 400);
  await sleep(300);
  await driver.clickSafe('button:has-text("Play Guided Tour")', 500);
  await driver.waitUntil(58.0, 'Guided Tour launched');

  // 0:58 - 1:08 (Step 1): Card Failure Intercepted
  await driver.moveTo(960, 520, 700);
  await driver.waitUntil(107.0, 'Inspecting Tour Step 1 (Card Failure Intercepted)');
  await driver.clickSafe('button:has-text("Next"), button:has(svg.lucide-chevron-right)', 400);
  await driver.waitUntil(108.0);

  // 1:08 - 1:18 (Step 2): 240h ML Radar in Queue
  await driver.moveTo(960, 520, 700);
  await driver.waitUntil(117.0, 'Tour Step 2 (ML Radar 240h Horizon)');
  await driver.clickSafe('button:has-text("Next"), button:has(svg.lucide-chevron-right)', 400);
  await driver.waitUntil(118.0);

  // 1:18 - 1:28 (Step 3): WhatsApp UPI 1-Tap Checkout popup
  await driver.moveTo(960, 520, 700);
  await driver.waitUntil(127.0, 'Tour Step 3 (WhatsApp UPI 1-Tap Link)');
  await driver.clickSafe('button:has-text("Next"), button:has(svg.lucide-chevron-right)', 400);
  await driver.waitUntil(128.0);

  // 1:28 - 1:38 (Step 4): Regulatory Policy Shield in Policy
  await driver.moveTo(960, 520, 700);
  await driver.waitUntil(137.0, 'Tour Step 4 (Regulatory Fine Shield)');
  await driver.clickSafe('button:has-text("Next"), button:has(svg.lucide-chevron-right)', 400);
  await driver.waitUntil(138.0);

  // 1:38 - 1:48 (Step 5): Scale ROI (+₹18.4L) in Economics
  await driver.moveTo(960, 520, 700);
  await driver.waitUntil(148.0, 'Tour Step 5 (Scale ROI Verified)');

  // 1:48 - 1:50: Close tour modal
  await driver.closeModal();
  await driver.waitUntil(150.86, 'End of Act 2 milestone');

  // =========================================================================
  // 📍 Act 3: 6-Stage Decision Pipeline & Explainability (1:50 – 2:31)
  // Voice: 100% mathematical explainability, 6-stage pipeline, ML curve
  // =========================================================================
  console.log('[150.8s] [ACT 3] Navigating to Queue (/queue)...');
  // 1:50 - 1:56: Click Queue in top navigation bar
  await page.goto(`${BASE_URL}/queue`, { waitUntil: 'domcontentloaded' });
  await driver.init();
  await driver.waitUntil(156.0, 'Queue loaded');

  // 1:56 - 2:02: Expand Autonomous Decision Chain accordion on first row
  await driver.clickSafe('button:has(svg.lucide-chevron-right)', 500);
  await driver.waitUntil(162.0, 'Decision Chain expanded with ML feature weights');

  // 2:02 - 2:06: Open Payment Detail Page
  await page.goto(`${BASE_URL}/payment/pay_seed_pend_01`, { waitUntil: 'domcontentloaded' });
  await driver.init();
  await driver.waitUntil(166.0, 'Payment Detail page loaded');

  // 2:06 - 2:25: Click through 6 stage pills in Autonomous Decision Trace
  await driver.clickSafe('div:has-text("1. Webhook Ingest")', 400);
  await driver.waitUntil(170.0, 'Stage 1: Webhook Ingestion');

  await driver.clickSafe('div:has-text("2. Policy Shield")', 400);
  await driver.waitUntil(174.0, 'Stage 2: Regulatory Policy Shield');

  await driver.clickSafe('div:has-text("3. ML Scanner")', 400);
  await driver.waitUntil(178.0, 'Stage 3: ML Horizon Scanner');

  await driver.clickSafe('div:has-text("4. Timing Snap")', 400);
  await driver.waitUntil(182.0, 'Stage 4: Dynamic Payday Snapping');

  await driver.clickSafe('div:has-text("5. EV Yield")', 400);
  await driver.waitUntil(186.0, 'Stage 5: Multi-Rail Routing');

  await driver.clickSafe('div:has-text("6. Action Dispatch")', 400);
  await driver.waitUntil(190.0, 'Stage 6: Smart Nudge Dispatch');

  // 2:25 - 2:31: Scroll down slightly and hover over ML Recovery Probability Curve
  await driver.smoothScroll(260, 600);
  await driver.moveTo(960, 620, 600);
  await driver.waitUntil(200.78, 'End of Act 3 milestone');

  // =========================================================================
  // 📍 Act 4: Regulatory Policy Shield & Enterprise Guardrails (2:31 – 3:21)
  // Voice: Visa $0.10, Mastercard $0.50, 18 cards blocked, TRAI quiet hours, Minimum EV
  // =========================================================================
  console.log('[200.8s] [ACT 4] Navigating to Policy (/policy)...');
  // 2:31 - 2:36: Click Policy in top bar
  await page.goto(`${BASE_URL}/policy`, { waitUntil: 'domcontentloaded' });
  await driver.init();
  await driver.waitUntil(206.0, 'Policy page loaded');

  // 2:36 - 2:48: Hover over Direct Fine Savings card & Strategy Benchmark table
  await driver.hoverSafe('div:has-text("Direct Fine Savings") >> nth=-1', 600);
  await driver.waitUntil(212.0, 'Direct Fine Savings highlighted');

  await driver.hoverSafe('table', 600);
  await driver.waitUntil(218.0, 'Strategy Benchmark table (Winning +6.0 pts!)');

  // 2:48 - 2:54: Click 3rd tab: Merchant Guardrails & Enterprise Levers
  await driver.clickSafe('button:has-text("Merchant Guardrails"), button:has-text("Enterprise Levers")', 500);
  await driver.waitUntil(224.0, 'Merchant Guardrails tab open');

  // 2:54 - 3:05: Toggle TRAI Quiet Hours switch and hover Auto-reroute switch
  await driver.clickSafe('button[role="switch"], input[type="checkbox"]', 400);
  await sleep(1500);
  await driver.clickSafe('button[role="switch"], input[type="checkbox"]', 400);
  await driver.waitUntil(231.0, 'TRAI Quiet Hours (9 PM - 9 AM) toggled');

  // 3:05 - 3:21: Move mouse over Minimum EV Threshold slider and adjust
  await driver.hoverSafe('input[type="range"]', 600);
  await driver.waitUntil(229.85, 'End of Act 4 milestone');

  // =========================================================================
  // 📍 Act 5: Developer Gateway Hub & Thought Terminal (3:21 – 3:50)
  // Voice: Live webhook URL, SDK snippets, 12ms ping test, Agent Terminal (T)
  // =========================================================================
  console.log('[229.8s] [ACT 5] Opening Tools -> Gateway Integration...');
  // 3:21 - 3:26: Click Tools -> Gateway Integration
  await driver.clickSafe('button:has-text("Tools")', 400);
  await sleep(250);
  await driver.clickSafe('button:has-text("Gateway Integration")', 450);
  await driver.waitUntil(236.0, 'Gateway Integration modal open');

  // 3:26 - 3:34: Hover over live Webhook URL and code tabs
  await driver.moveTo(960, 480, 600);
  await driver.waitUntil(242.0, 'Inspecting Webhook endpoint & SDKs');

  // 3:34 - 3:38: Click green [Ping Server] button -> 12ms latency badge
  await driver.clickSafe('button:has-text("Ping"), button:has-text("Test Ping")', 450);
  await driver.waitUntil(248.0, '12ms server ping verified');

  // 3:38 - 3:40: Close Gateway modal
  await driver.closeModal();
  await driver.waitUntil(250.0);

  // 3:40 - 3:48: Press T to open Agent Thought Terminal
  await page.keyboard.press('KeyT');
  await sleep(800);
  await driver.hoverSafe('div:has-text("Agent Thought Terminal")', 600);
  await driver.waitUntil(258.0, 'Agent Thought Terminal live SSE events');

  // 3:48 - 3:50: Close terminal
  await page.keyboard.press('Escape');
  await driver.waitUntil(260.0);

  // =========================================================================
  // 📍 Act 6: CFO Unit Economics, Executive Brief & Closing (3:50 – 4:33)
  // Voice: ₹0.35 WhatsApp / ₹0.15 SMS, ₹10.15 spent to recover ₹26,882 (2,648x ROI), Executive Brief, thank you
  // =========================================================================
  console.log('[260.0s] [ACT 6] Navigating to Economics (/economics)...');
  // 3:50 - 3:55: Click Economics in top navigation bar
  await page.goto(`${BASE_URL}/economics`, { waitUntil: 'domcontentloaded' });
  await driver.init();
  await driver.waitUntil(265.0, 'Economics page loaded');

  // 3:55 - 4:06: Hover across Spotlight cards (Spend, Revenue, 2,648x ROI)
  await driver.hoverSafe('div:has-text("Reminder Spend") >> nth=-1', 600);
  await sleep(2500);
  await driver.hoverSafe('div:has-text("Net Recovery Profit") >> nth=-1', 600);
  await driver.waitUntil(274.0, 'Spotlight cards: 2,648x ROI highlighted');

  // 4:06 - 4:10: Click Executive Board Brief button (or press E)
  await page.keyboard.press('KeyE');
  await sleep(600);
  await driver.moveTo(960, 520, 600);
  await driver.waitUntil(278.0, 'Executive Board Brief modal open');

  // 4:10 - 4:18: Clean executive summary modal open
  await driver.waitUntil(284.0, 'Inspecting Executive Board summary');

  // 4:18 - 4:22: Close brief
  await driver.closeModal();
  await driver.waitUntil(287.0);

  // 4:22 - 4:26: Return to Home (Overview)
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await driver.init();
  await driver.waitUntil(291.0, 'Returned to Home Overview');

  // 4:26 - 4:33: Click Demo Controller floating pill, hold final hero view
  await driver.clickSafe('button:has-text("Demo Controller")', 500);
  await driver.moveTo(960, 520, 700);

  // Final synchronization to end of master audio track
  const TARGET_TOTAL = 275.36;
  const elapsed = (Date.now() - startTime) / 1000;
  if (elapsed < TARGET_TOTAL) {
    console.log(`[${elapsed.toFixed(1)}s] Holding final hero frame until ${TARGET_TOTAL}s to match audio...`);
    await sleep((TARGET_TOTAL - elapsed) * 1000);
  }

  console.log(`✅ Recording complete! Total duration: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

  await context.close();
  await browser.close();
}

record().catch((err) => {
  console.error('❌ Recording failed:', err);
  process.exit(1);
});
