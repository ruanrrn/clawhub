/**
 * DeepSeek Registration — Hybrid Script
 * 
 * Strategy: Use Playwright to get a real Turnstile token (manual VNC click),
 * then use curl/API to send the verification code with PoW + token.
 * 
 * Prerequisites on 2.12:
 *   apt install xvfb x11vnc google-chrome-stable
 *   cd /tmp && npm install playwright
 * 
 * Usage:
 *   Xvfb :99 -screen 0 1280x720x24 -ac +extension GLX -noreset &
 *   x11vnc -display :99 -forever -nopw -rfbport 5900 &
 *   DISPLAY=:99 node ds_hybrid.js "rayruan1230+dsXXXXXX@gmail.com"
 */

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const crypto = require('crypto');

const EMAIL = process.argv[2];
if (!EMAIL) { console.error('Usage: node ds_hybrid.js <email>'); process.exit(1); }

// Password stored as base64 to avoid plaintext in process args
const PASS = Buffer.from('UmF5MjAyNjAxMDEu', 'base64').toString();

(async () => {
  // Launch headful Chrome on Xvfb display
  const browser = await chromium.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome-stable',
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--ignore-certificate-errors', '--window-size=1280,720',
      '--use-gl=desktop', '--disable-gpu-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const context = await browser.newContext({ locale: 'en-US' });

  // === Region Injection: intercept HTML, swap CN → US ===
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

  // === Intercept Turnstile callback to capture token ===
  let turnstileToken = null;
  const page = await context.newPage();

  // Hook window.turnstile.render to intercept the callback
  await page.addInitScript(() => {
    // Wait for turnstile to be loaded, then patch render
    const checkTurnstile = setInterval(() => {
      if (window.turnstile && window.turnstile.render) {
        const origRender = window.turnstile.render.bind(window.turnstile);
        window.turnstile.render = function(container, params) {
          const origCallback = params.callback;
          params.callback = function(token, preClearance) {
            console.log('[TURNSTILE_TOKEN]', token);
            window.__turnstileToken = token;
            if (origCallback) origCallback(token, preClearance);
          };
          return origRender(container, params);
        };
        clearInterval(checkTurnstile);
      }
    }, 100);
  });

  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[TURNSTILE_TOKEN]')) {
      turnstileToken = text.replace('[TURNSTILE_TOKEN] ', '');
      console.log('[CAPTURED] Token length: ' + turnstileToken.length);
    }
  });

  // Track API responses
  page.on('response', async resp => {
    if (resp.url().includes('create_email_verification_code')) {
      try { console.log('[API] ' + (await resp.text()).substring(0, 200)); } catch(e) {}
    }
  });

  try {
    console.log('[1] Loading sign_up with region injection...');
    await page.goto('https://chat.deepseek.com/sign_up', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

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

    // Click Send code to trigger Turnstile
    console.log('[3] Clicking Send code...');
    await page.locator('text=Send code').first().click({ force: true });

    console.log('═══════════════════════════════════════');
    console.log('VNC to 2.12:5900 and click Turnstile');
    console.log('═══════════════════════════════════════');

    // Wait for Turnstile token (manual click needed)
    const startTime = Date.now();
    while (Date.now() - startTime < 120000) {
      if (turnstileToken) break;
      const wToken = await page.evaluate(() => window.__turnstileToken).catch(() => null);
      if (wToken) { turnstileToken = wToken; break; }
      await page.waitForTimeout(1000);
    }

    if (!turnstileToken) {
      console.log('[ERROR] No Turnstile token captured after 120s');
      await page.screenshot({ path: '/tmp/ds_hybrid_timeout.png', fullPage: true });
      await browser.close();
      process.exit(1);
    }

    console.log('[4] Got Turnstile token!');
    await browser.close();

    // === Send verification code via API ===
    console.log('[5] Sending verification code...');

    // Step A: Get PoW challenge
    const challengeRaw = execSync(
      `curl -s -X POST 'https://chat.deepseek.com/api/v0/users/create_guest_challenge' ` +
      `-H 'Content-Type: application/json' ` +
      `-d '{"target_path":"/v0/users/create_email_verification_code"}'`,
      { encoding: 'utf-8' }
    );
    const cd = JSON.parse(challengeRaw).data.biz_data.guest_challenge;
    console.log(`[5a] Challenge difficulty=${cd.difficulty}`);

    // Step B: Solve PoW
    let nonce = 0;
    const target = '0'.repeat(cd.difficulty / 4);
    const input = cd.challenge + cd.salt;
    while (nonce < 10000000) {
      const h = crypto.createHash('sha256').update(input + nonce).digest('hex');
      if (h.slice(0, target.length) === target) break;
      nonce++;
    }
    console.log(`[5b] PoW solved: nonce=${nonce}`);

    const guestPow = Buffer.from(JSON.stringify({ salt: cd.salt, answer: String(nonce) })).toString('base64');
    const deviceId = crypto.randomBytes(16).toString('hex');

    // Step C: Send code with real Turnstile token + PoW
    const payload = JSON.stringify({
      email: EMAIL,
      turnstile_token: turnstileToken,
      locale: "en-US",
      shumei_verification: { rid: deviceId, region: "overseas" },
      hcaptcha_token: "",
      device_id: deviceId,
      scenario: "register"
    });

    const result = execSync(
      `curl -s -X POST 'https://chat.deepseek.com/api/v0/users/create_email_verification_code' ` +
      `-H 'Content-Type: application/json' ` +
      `-H 'X-DS-Guest-PoW-Response: ${guestPow}' ` +
      `-d '${payload.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf-8' }
    );

    const resp = JSON.parse(result);
    if (resp.data?.biz_code === 0) {
      console.log('[SUCCESS] Verification code sent to ' + EMAIL);
    } else {
      console.log(`[FAIL] biz_code=${resp.data?.biz_code} msg=${resp.data?.biz_msg}`);
    }

  } catch(e) {
    console.error(`[ERROR] ${e.message}`);
    await page.screenshot({ path: '/tmp/ds_hybrid_error.png', fullPage: true }).catch(() => {});
  }
})();
