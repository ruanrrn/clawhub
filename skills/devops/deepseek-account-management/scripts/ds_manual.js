const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');

const EMAIL = process.argv[2];
if (!EMAIL) { console.error('Usage: node ds_manual.js <email>'); process.exit(1); }

const PASS_B64 = 'UmF5MjAyNjAxMDEu';  // Ray20260101.
const PASS = Buffer.from(PASS_B64, 'base64').toString();

console.log(`[START] ${EMAIL} on 2.12 GPU + VNC`);
console.log('[INFO] VNC: 2.12:5900 (no password)');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome-stable',
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--ignore-certificate-errors',
      '--window-size=1280,720',
      '--use-gl=desktop', '--disable-gpu-sandbox',
    ],
  });
  const context = await browser.newContext({ locale: 'en-US' });

  // Region injection: CN -> US
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

  // Track email verification API response
  let emailCodeResult = null;
  page.on('response', async resp => {
    if (resp.url().includes('create_email_verification_code')) {
      try {
        const body = await resp.text();
        console.log(`[API] create_email_verification_code: ${body.substring(0, 300)}`);
        emailCodeResult = { status: resp.status(), body };
      } catch(e) {}
    }
  });

  try {
    console.log('[1] Loading sign_up...');
    await page.goto('https://chat.deepseek.com/sign_up', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const metaRegion = await page.evaluate(() => {
      const el = document.querySelector('meta[name="region"]');
      return el ? el.getAttribute('content') : 'NOT_FOUND';
    });
    console.log(`[1] Meta region: ${metaRegion}`);

    // Dismiss cookie banner
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

    await page.screenshot({ path: '/tmp/ds_manual_01_filled.png', fullPage: true });

    // Click Send code
    console.log('[3] Clicking Send code...');
    await page.locator('text=Send code').first().click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/ds_manual_02_turnstile.png', fullPage: true });

    // Check if Turnstile iframe appeared
    let hasTurnstile = false;
    for (const f of page.frames()) {
      if (f.url().includes('challenges.cloudflare.com') || f.url().includes('turnstile')) {
        hasTurnstile = true;
        console.log(`[3] Turnstile frame found: ${f.url()}`);
      }
    }
    if (hasTurnstile) {
      console.log('[3] Turnstile widget detected!');
    }

    // MANUAL INTERVENTION: Wait for Turnstile to be solved
    // Detection: wait for successful create_email_verification_code response
    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log('🔴 PLEASE SOLVE TURNSTILE VIA VNC: 2.12:5900');
    console.log('   Waiting up to 120s for you to click the checkbox...');
    console.log('══════════════════════════════════════════════');
    console.log('');

    // Poll for success: either the API returns biz_code=0, or button shows countdown
    const startTime = Date.now();
    let solved = false;
    while (Date.now() - startTime < 120000) {
      await page.waitForTimeout(1000);

      // Check API response
      if (emailCodeResult) {
        try {
          const json = JSON.parse(emailCodeResult.body);
          if (json.data?.biz_code === 0) {
            console.log('[✓] Turnstile solved! Verification code sent.');
            solved = true;
            break;
          } else if (json.data?.biz_code !== 2) {
            console.log(`[API] Unexpected biz_code: ${json.data?.biz_code}`);
          }
        } catch(e) {}
        emailCodeResult = null;
      }

      // Check button text for countdown (e.g., "Resend in 60s")
      try {
        const btnText = await page.locator('text=/\\d+s/').first().innerText({ timeout: 500 }).catch(() => null);
        if (btnText && /\d+s/.test(btnText)) {
          console.log(`[✓] Countdown detected: "${btnText}" — code sent!`);
          solved = true;
          break;
        }
      } catch(e) {}

      // Check for error toasts
      try {
        const toastText = await page.evaluate(() => {
          const toasts = document.querySelectorAll('[class*="toast"], [role="alert"]');
          return [...toasts].map(e => e.innerText).join('|');
        });
        if (toastText && !/^\s*$/.test(toastText)) {
          console.log(`[INFO] Toast: ${toastText}`);
        }
      } catch(e) {}
    }

    if (!solved) {
      console.error('[ERROR] Turnstile not solved within 120s');
      await page.screenshot({ path: '/tmp/ds_manual_03_timeout.png', fullPage: true });
      await browser.close();
      process.exit(1);
    }

    await page.screenshot({ path: '/tmp/ds_manual_04_solved.png', fullPage: true });

    // Start IMAP poll
    console.log('[4] Starting IMAP poll for verification code...');
    const imapProc = spawn('python3', ['/tmp/ds_imap.py', EMAIL], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let code = null;
    const codePromise = new Promise((resolve, reject) => {
      imapProc.stdout.on('data', (data) => {
        const line = data.toString().trim();
        console.log(`  [IMAP] ${line}`);
        if (line.startsWith('CODE:')) {
          code = line.split(':')[1];
          resolve(code);
        }
      });
      imapProc.stderr.on('data', (data) => {
        process.stderr.write(`  [IMAP] ${data}`);
      });
      imapProc.on('close', (exitCode) => {
        if (!code) reject(new Error(`IMAP exited with code ${exitCode}`));
      });
      setTimeout(() => reject(new Error('IMAP timeout (120s)')), 130000);
    });

    try {
      code = await codePromise;
    } catch (e) {
      console.error(`[ERROR] ${e.message}`);
      await page.screenshot({ path: '/tmp/ds_manual_05_imap_timeout.png', fullPage: true });
      throw e;
    }
    console.log(`[4] Got code: ${code}`);

    // Fill verification code
    console.log('[5] Filling verification code...');
    const codeInput = page.locator('input[maxlength="6"], input[maxlength="4"], input[placeholder*="code" i], input[placeholder*="Code"]').first();
    await codeInput.fill(code);
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/ds_manual_06_code_filled.png', fullPage: true });

    // Submit
    console.log('[6] Submitting...');
    const submitBtn = page.locator('text=Sign up').last();
    await submitBtn.click({ force: true });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/ds_manual_07_result.png', fullPage: true });

    // Check result
    const finalUrl = page.url();
    const finalText = await page.evaluate(() => document.body.innerText);
    console.log(`[RESULT] URL: ${finalUrl}`);
    console.log(`[RESULT] Page: ${finalText.substring(0, 400)}`);

    if (finalUrl.includes('chat') && !finalUrl.includes('sign')) {
      console.log(`[SUCCESS] Registered: ${EMAIL} / ${PASS}`);
    } else if (/already|exists|registered/i.test(finalText)) {
      console.log('[WARN] Email already registered');
    } else if (/success|welcome/i.test(finalText)) {
      console.log('[SUCCESS] Registration appears successful');
    } else {
      console.log('[UNKNOWN] Check screenshot');
    }

    // Save
    const result = { email: EMAIL, password: PASS, url: finalUrl, timestamp: new Date().toISOString() };
    fs.appendFileSync('/tmp/ds_accounts.json', JSON.stringify(result) + '\n');
    console.log('[SAVED] /tmp/ds_accounts.json');

  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    try { await page.screenshot({ path: '/tmp/ds_manual_99_error.png', fullPage: true }); } catch(e) {}
  } finally {
    await browser.close();
    console.log('[END]');
  }
})();
