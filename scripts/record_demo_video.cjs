const { chromium } = require('../frontend/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:8000';
const RAW_VIDEO_DIR = path.join(__dirname, '..', 'build', 'raw_video');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Injects the custom cursor into the page
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
        width: 24px;
        height: 24px;
        pointer-events: none;
        z-index: 9999999;
        transition: transform 0.05s ease-out;
      }
      #custom-cursor svg {
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 3px 10px rgba(0, 0, 0, 0.8));
      }
      .custom-click-ripple {
        position: fixed;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 2px solid #cc9166;
        background: rgba(204, 145, 102, 0.25);
        pointer-events: none;
        z-index: 9999998;
        transform: translate(-50%, -50%) scale(0.2);
        animation: cursor-ripple-anim 0.55s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
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
      setTimeout(() => ripple.remove(), 600);
    };
  });
}

class CursorDriver {
  constructor(page) {
    this.page = page;
    this.x = 200;
    this.y = 150;
  }

  async init() {
    await setupCursor(this.page);
    await this.page.evaluate(({ x, y }) => window.__moveCursor(x, y), { x: this.x, y: this.y });
  }

  async moveTo(targetX, targetY, durationMs = 600, steps = 25) {
    const startX = this.x;
    const startY = this.y;
    const dt = durationMs / steps;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      // Smooth easeInOutCubic
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

  async hover(selector, durationMs = 600) {
    try {
      const loc = this.page.locator(selector).first();
      await loc.waitFor({ state: 'visible', timeout: 5000 });
      const box = await loc.boundingBox();
      if (box) {
        const targetX = Math.round(box.x + box.width / 2);
        const targetY = Math.round(box.y + box.height / 2);
        await this.moveTo(targetX, targetY, durationMs);
        await sleep(200);
      }
    } catch (e) {
      console.warn(`Could not hover on ${selector}:`, e.message);
    }
  }

  async click(selector, durationMs = 500) {
    try {
      const loc = this.page.locator(selector).first();
      await loc.waitFor({ state: 'visible', timeout: 5000 });
      const box = await loc.boundingBox();
      if (box) {
        const targetX = Math.round(box.x + box.width / 2);
        const targetY = Math.round(box.y + box.height / 2);
        await this.moveTo(targetX, targetY, durationMs);
        await this.page.evaluate(({ x, y }) => {
          if (window.__clickRipple) window.__clickRipple(x, y);
        }, { x: targetX, y: targetY });
        await loc.click({ force: true });
        await sleep(300);
      }
    } catch (e) {
      console.warn(`Could not click on ${selector}:`, e.message);
    }
  }

  async smoothScroll(deltaY, durationMs = 700, steps = 20) {
    const dt = durationMs / steps;
    const dy = deltaY / steps;
    for (let i = 0; i < steps; i++) {
      await this.page.evaluate((d) => window.scrollBy(0, d), dy);
      await sleep(dt);
    }
  }

  async closeModal() {
    await this.page.keyboard.press('Escape');
    await sleep(200);
    const closeBtn = this.page.locator('button:has(svg.lucide-x)').first();
    try {
      if (await closeBtn.isVisible({ timeout: 500 })) {
        await closeBtn.click({ force: true });
      }
    } catch {}
    await sleep(300);
  }

  async navigateTo(urlPath, linkSelector) {
    try {
      if (linkSelector) {
        await this.click(linkSelector, 500);
        await this.page.waitForURL(`**${urlPath}`, { timeout: 3500 });
        await this.init();
        return;
      }
    } catch (e) {
      console.warn(`Click navigation to ${urlPath} timed out, falling back to direct navigation...`);
    }
    await this.page.goto(BASE_URL + urlPath, { waitUntil: 'networkidle' });
    await this.init();
  }
}

async function record() {
  if (!fs.existsSync(RAW_VIDEO_DIR)) {
    fs.mkdirSync(RAW_VIDEO_DIR, { recursive: true });
  }

  // Clear older raw recordings
  const oldFiles = fs.readdirSync(RAW_VIDEO_DIR);
  for (const f of oldFiles) {
    if (f.endsWith('.webm') || f.endsWith('.mp4')) {
      try { fs.unlinkSync(path.join(RAW_VIDEO_DIR, f)); } catch {}
    }
  }

  console.log('🚀 Launching Chromium (1920x1080, 60fps recording)...');
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
  const driver = new CursorDriver(page);

  const startTime = Date.now();
  const logStep = (scene, desc) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[${elapsed}s] [${scene}] ${desc}`);
  };

  // Re-inject cursor on navigations
  page.on('load', async () => {
    try {
      await driver.init();
    } catch {}
  });

  // ==========================================
  // SCENE 1: Introduction & Overview (28.9s)
  // Target cumulative: 0.0s -> 28.9s
  // ==========================================
  logStep('SCENE 1', 'Navigating to Executive Overview (Home)...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await driver.init();
  await sleep(1200);

  logStep('SCENE 1', 'Highlighting live header and active engine beacon...');
  await driver.moveTo(280, 110, 800);
  await sleep(1500);

  logStep('SCENE 1', 'Gliding over spotlight metric cards...');
  // Card 1: Revenue Recovered
  await driver.hover('div:has-text("Revenue Recovered") >> nth=-1', 900);
  await sleep(1800);

  // Card 2: Recovery Rate (+15.6 pts lift)
  await driver.hover('div:has-text("Recovery Rate") >> nth=-1', 900);
  await sleep(2800);

  // Card 3: Orders Evaluated
  await driver.hover('div:has-text("Orders Evaluated") >> nth=-1', 800);
  await sleep(1800);

  // Card 4: Fines Prevented
  await driver.hover('div:has-text("Fines Prevented") >> nth=-1', 800);
  await sleep(2000);

  logStep('SCENE 1', 'Selecting 7D baseline filter...');
  await driver.click('button:has-text("7D")', 700);
  await sleep(2000);

  logStep('SCENE 1', 'Scrolling down to Live Decision Stream...');
  await driver.smoothScroll(340, 900);
  await sleep(1200);

  logStep('SCENE 1', 'Clicking payment in live stream to inspect AI decision breakdown...');
  const feedRow = page.locator('.cursor-pointer:has-text("pay_")').first();
  if (await feedRow.isVisible()) {
    const box = await feedRow.boundingBox();
    if (box) {
      await driver.moveTo(box.x + 200, box.y + 20, 600);
      await driver.click('.cursor-pointer:has-text("pay_")', 400);
      await sleep(3500); // Let modal be seen
      await driver.closeModal();
    }
  } else {
    await sleep(4000);
  }

  // Ensure Scene 1 completes around 28.9s
  const s1Elapsed = (Date.now() - startTime) / 1000;
  if (s1Elapsed < 28.5) {
    await sleep((28.5 - s1Elapsed) * 1000);
  }

  // ==========================================
  // SCENE 2: ML Retries & Safety Guards (30.8s)
  // Target cumulative: 28.9s -> 59.7s
  // ==========================================
  logStep('SCENE 2', 'Navigating to Simulator Page...');
  await driver.navigateTo('/simulator', 'a[href="/simulator"]');
  await sleep(1500);

  logStep('SCENE 2', 'Selecting Scenario: Temporary Failure (Low Balance)...');
  await driver.click('div:has-text("Temporary Failure (Low Balance)")', 800);
  await sleep(1200);

  logStep('SCENE 2', 'Triggering simulation for soft decline...');
  await driver.click('button:has-text("Simulate")', 700);
  await sleep(3500);

  logStep('SCENE 2', 'Hovering over live SSE event stream and ML curve signals...');
  await driver.hover('div:has-text("Live Decision Event Stream")', 900);
  await sleep(3500);

  logStep('SCENE 2', 'Selecting Scenario: Permanent Failure (Expired Card)...');
  await driver.click('div:has-text("Permanent Failure (Expired Card)")', 800);
  await sleep(1200);

  logStep('SCENE 2', 'Triggering simulation for hard decline...');
  await driver.click('button:has-text("Simulate")', 700);
  await sleep(4000);

  logStep('SCENE 2', 'Showcasing Visa Category 1 compliance rule guard...');
  await driver.hover('span:has-text("Visa safety compliance rule")', 800);
  await sleep(3500);

  const s2Elapsed = (Date.now() - startTime) / 1000;
  if (s2Elapsed < 59.2) {
    await sleep((59.2 - s2Elapsed) * 1000);
  }

  // ==========================================
  // SCENE 3: TRAI-Compliant AI Nudges (19.4s)
  // Target cumulative: 59.7s -> 79.1s
  // ==========================================
  logStep('SCENE 3', 'Navigating to Recovery Queue...');
  await driver.navigateTo('/queue', 'a[href="/queue"]');
  await sleep(1500);

  logStep('SCENE 3', 'Expanding Autonomous Decision Chain accordion...');
  const chevron = page.locator('button:has(svg.lucide-chevron-right)').first();
  if (await chevron.isVisible()) {
    const box = await chevron.boundingBox();
    if (box) {
      await driver.moveTo(box.x + 8, box.y + 8, 700);
      await chevron.click();
      await sleep(2000);
    }
  } else {
    await sleep(2000);
  }

  logStep('SCENE 3', 'Opening Preview Customer Nudge modal (WhatsApp UI)...');
  const previewBtn = page.locator('button:has-text("Preview Nudge")').first();
  if (await previewBtn.isVisible()) {
    await driver.click('button:has-text("Preview Nudge")', 700);
  } else {
    await page.keyboard.press('KeyP');
  }
  await sleep(2000);

  logStep('SCENE 3', 'Displaying WhatsApp preview with 1-click Razorpay payment link...');
  await driver.moveTo(960, 500, 800);
  await sleep(2000);

  // Click "Pay with Google Pay / PhonePe" to showcase 1-click UPI recovery!
  const payBtn = page.locator('button:has-text("Pay with")').first();
  if (await payBtn.isVisible()) {
    logStep('SCENE 3', 'Clicking 1-tap UPI payment checkout...');
    await driver.click('button:has-text("Pay with")', 600);
    await sleep(2500); // Let success message and green checkmark show
  } else {
    await sleep(2500);
  }

  logStep('SCENE 3', 'Closing mobile phone modal...');
  await driver.closeModal();
  await sleep(600);

  const s3Elapsed = (Date.now() - startTime) / 1000;
  if (s3Elapsed < 78.5) {
    await sleep((78.5 - s3Elapsed) * 1000);
  }

  // ==========================================
  // SCENE 4: Unit Economics & Audit Trail (21.5s)
  // Target cumulative: 79.1s -> 100.6s
  // ==========================================
  logStep('SCENE 4', 'Navigating to Unit Economics...');
  await driver.navigateTo('/economics', 'a[href="/economics"]');
  await sleep(1500);

  logStep('SCENE 4', 'Inspecting Reminder Spend (₹0.35) vs Net Recovery Profit...');
  await driver.hover('div:has-text("Reminder Spend") >> nth=-1', 800);
  await sleep(2200);
  await driver.hover('div:has-text("Net Recovery Profit") >> nth=-1', 800);
  await sleep(2500);

  logStep('SCENE 4', 'Navigating to Decision Log & Audit Trail...');
  await driver.navigateTo('/audit', 'a[href="/audit"]');
  await sleep(1500);

  logStep('SCENE 4', 'Highlighting AI Autonomous Business Insights...');
  await driver.hover('#insights', 900);
  await sleep(3500);

  logStep('SCENE 4', 'Hovering immutable audit log rows and decision explainability...');
  await driver.smoothScroll(280, 800);
  await sleep(1000);
  await driver.hover('table tbody tr >> nth=0', 700);
  await sleep(2500);

  const s4Elapsed = (Date.now() - startTime) / 1000;
  if (s4Elapsed < 100.0) {
    await sleep((100.0 - s4Elapsed) * 1000);
  }

  // ==========================================
  // SCENE 5: Conclusion & Architecture (13.6s)
  // Target cumulative: 100.6s -> 114.2s
  // ==========================================
  logStep('SCENE 5', 'Returning to Home Dashboard for final architectural overview...');
  await driver.navigateTo('/', 'a[href="/"]');
  await sleep(1500);

  logStep('SCENE 5', 'Gliding cursor to Live Engine status and Demo Controller...');
  await driver.moveTo(320, 30, 800);
  await sleep(1500);

  logStep('SCENE 5', 'Opening floating Demo Controller bar (PresenterBar)...');
  await driver.click('button:has-text("Demo Controller")', 700);
  await sleep(2500);

  logStep('SCENE 5', 'Showcasing full system architecture and resilient recovery flow...');
  await driver.moveTo(960, 520, 900);
  await sleep(2500);

  // Hold cleanly until 114.2s
  const totalElapsed = (Date.now() - startTime) / 1000;
  const TARGET_TOTAL = 114.3;
  if (totalElapsed < TARGET_TOTAL) {
    const remaining = Math.max(0, (TARGET_TOTAL - totalElapsed) * 1000);
    console.log(`[${totalElapsed.toFixed(1)}s] Holding final frame for ${(remaining / 1000).toFixed(1)}s to match audio...`);
    await sleep(remaining);
  }

  logStep('COMPLETE', `Total recording duration: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

  await context.close();
  await browser.close();
  console.log('✅ Browser session recording finished successfully!');
}

record().catch((err) => {
  console.error('❌ Recording failed:', err);
  process.exit(1);
});
