const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { spawn } = require('child_process');
const fs = require('fs');

chromium.use(StealthPlugin());

const EMAIL = process.argv[2];
if (!EMAIL) { console.error('Usage: node ds_stealth.js <email>'); process.exit(1); }
const PASS_B64 = 'UmF5MjAyNjAxMDEu';
const PASS = Buffer.from(PASS_B64, 'base64').toString();

(async () => {
  console.log(`[START] ${EMAIL} stealth mode`);
  const browser = await chromium.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome-stable',
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--ignore-certificate-errors',
      '--window-size=1280,720',
      '--use-gl=desktop', '--disable-gpu-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const context = await browser.newContext({
    locale: 'en-US',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  });

  // Region injection
  await context.route('**/sign_up**', async route => {
    const response = await route.fetch();
    const ct = response.headers()['content-type'] || '';
    if (ct.includes('text/html')) {
      let html = await response.text();
      html = html.replace(/content="CN"/g, 'content="US"');
      await route.fulfill({ response, body: html });
    } else {
      await route.fulfill({ response });
    }
  });

  const page = await context.newPage();

  let emailCodeResult = null;
  page.on('response', async resp => {
    if (resp.url().includes('create_email_verification_code')) {
      try {
        const body = await resp.text();
        console.log(`[API] ${body.substring(0, 300)}`);
        emailCodeResult = { status: resp.status(), body };
      } catch(e) {}
    }
    if (resp.url().includes('create_guest_challenge')) {
      try {
        const body = await resp.text();
        console.log(`[CHALLENGE] ${body.substring(0, 200)}`);
      } catch(e) {}
    }
    if (resp.url().includes('turnstile') && !resp.url().includes('.js')) {
      try {
        console.log(`[TURNSTILE] ${resp.status()} ${resp.url().substring(0, 150)}`);
      } catch(e) {}
    }
  });

  try {
    console.log('[1] Loading sign_up...');
    await page.goto('https://chat.deepseek.com/sign_up', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check for environment error
    const errorMsg = await page.evaluate(() => {
      const banners = document.querySelectorAll('[class*="error"], [class*="notice"], [class*="warn"], [class*="toast"]');
      return [...banners].map(e => e.innerText).filter(t => t.length > 0).join(' | ');
    });
    if (errorMsg) console.log(`[WARN] Page errors: ${errorMsg}`);

    // Check Turnstile frames
    let turnstileFrames = 0;
    for (const f of page.frames()) {
      if (f.url().includes('challenges.cloudflare') || f.url().includes('turnstile')) {
        turnstileFrames++;
        console.log(`[TURNSTILE FRAME] ${f.url().substring(0, 150)}`);
      }
    }
    console.log(`[INFO] Turnstile frames: ${turnstileFrames}, Total frames: ${page.frames().length}`);

    // Dismiss cookie
    try {
      const btn = page.locator('text=Accept all').first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(500);
      }
    } catch(e) {}

    // Fill form
    console.log('[2] Filling form...');
    await page.locator('input[placeholder*="email" i], input[placeholder*="Email"]').first().fill(EMAIL);
    const pws = page.locator('input[type="password"]');
    if ((await pws.count()) >= 1) await pws.nth(0).fill(PASS);
    if ((await pws.count()) >= 2) await pws.nth(1).fill(PASS);
    await page.waitForTimeout(500);

    await page.screenshot({ path: '/tmp/ds_stealth_01.png', fullPage: true });

    // Click Send code
    console.log('[3] Clicking Send code...');
    await page.locator('text=Send code').first().click({ force: true });
    await page.waitForTimeout(8000);

    await page.screenshot({ path: '/tmp/ds_stealth_02.png', fullPage: true });

    // Check Turnstile after click
    for (const f of page.frames()) {
      if (f.url().includes('challenges.cloudflare') || f.url().includes('turnstile')) {
        console.log(`[TURNSTILE FRAME] ${f.url().substring(0, 150)}`);
      }
    }

    // Check API result
    if (emailCodeResult) {
      const json = JSON.parse(emailCodeResult.body);
      if (json.data?.biz_code === 0) {
        console.log('[OK] Code sent! biz_code=0');
      } else {
        console.log(`[FAIL] biz_code=${json.data?.biz_code} msg=${json.data?.biz_msg}`);
      }
    }

    // Wait for manual intervention if needed
    console.log('\n[WAIT] 120s for manual Turnstile via VNC...');
    const start = Date.now();
    let solved = false;
    while (Date.now() - start < 120000) {
      await page.waitForTimeout(2000);
      if (emailCodeResult) {
        const json = JSON.parse(emailCodeResult.body);
        if (json.data?.biz_code === 0) { solved = true; break; }
        emailCodeResult = null;
      }
      // Re-check for new API calls
    }

    if (solved) {
      console.log('[4] Starting IMAP...');
      // IMAP poll
      const imapProc = spawn('python3', ['/tmp/ds_imap.py', EMAIL], { stdio: ['pipe', 'pipe', 'pipe'] });
      let code = null;
      imapProc.stdout.on('data', d => {
        const line = d.toString().trim();
        console.log(`  [IMAP] ${line}`);
        if (line.startsWith('CODE:')) code = line.split(':')[1];
      });
      imapProc.stderr.on('data', d => process.stderr.write(d));
      await new Promise((res, rej) => {
        imapProc.on('close', () => code ? res() : rej());
        setTimeout(() => rej(new Error('IMAP timeout')), 130000);
      }).catch(() => {});

      if (code) {
        console.log(`[5] Code: ${code}`);
        await page.locator('input[maxlength="6"]').first().fill(code);
        await page.waitForTimeout(500);
        await page.locator('text=Sign up').last().click({ force: true });
        await page.waitForTimeout(5000);
        console.log(`[RESULT] ${page.url()}`);
        await page.screenshot({ path: '/tmp/ds_stealth_03_result.png', fullPage: true });
      }
    }

    await page.screenshot({ path: '/tmp/ds_stealth_99_final.png', fullPage: true });
  } catch(e) {
    console.error(`[ERROR] ${e.message}`);
  } finally {
    await browser.close();
    console.log('[END]');
  }
})();
