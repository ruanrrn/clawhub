const { chromium } = require('playwright');
const https = require('https');
const crypto = require('crypto');
const { execSync } = require('child_process');

const EMAIL = process.argv[2];
if (!EMAIL) { console.error('Usage: node ds_hybrid.js <email>'); process.exit(1); }
const PASS_B64 = 'UmF5MjAyNjAxMDEu';
const PASS = Buffer.from(PASS_B64, 'base64').toString();

(async () => {
  const browser = await chromium.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors',
           '--window-size=1280,720', '--use-gl=desktop', '--disable-gpu-sandbox',
           '--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({ locale: 'en-US' });

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

  // Intercept Turnstile token
  let turnstileToken = null;
  const page = await context.newPage();

  // Hook window.turnstile.render to capture the callback
  await page.addInitScript(() => {
    const origRender = window.turnstile?.render;
    if (origRender) {
      window.turnstile.render = function(container, params) {
        const origCallback = params.callback;
        params.callback = function(token, preClearance) {
          console.log('[TURNSTILE_TOKEN]', token);
          window.__turnstileToken = token;
          if (origCallback) origCallback(token, preClearance);
        };
        return origRender.call(this, container, params);
      };
    }
    // Also intercept the turnstile script load
    const origCreateElement = document.createElement.bind(document);
    document.createElement = function(tag) {
      const el = origCreateElement(tag);
      if (tag === 'script') {
        const origSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
        let srcVal = '';
        Object.defineProperty(el, 'src', {
          get() { return srcVal; },
          set(v) {
            srcVal = v;
            if (v && v.includes('turnstile')) {
              console.log('[TURNSTILE_SCRIPT]', v);
            }
          }
        });
      }
      return el;
    };
  });

  // Listen for console messages to capture token
  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[TURNSTILE_TOKEN]')) {
      turnstileToken = text.replace('[TURNSTILE_TOKEN] ', '');
      console.log('[CAPTURED] Turnstile token: ' + turnstileToken.substring(0, 50) + '...');
    }
    if (text.startsWith('[TURNSTILE_SCRIPT]')) {
      console.log('[INFO] Turnstile script loaded: ' + text.replace('[TURNSTILE_SCRIPT] ', ''));
    }
  });

  // Track API calls
  page.on('response', async resp => {
    if (resp.url().includes('create_email_verification_code')) {
      try {
        const body = await resp.text();
        console.log(`[API] ${body.substring(0, 300)}`);
      } catch(e) {}
    }
  });

  try {
    console.log('[1] Loading sign_up...');
    await page.goto('https://chat.deepseek.com/sign_up', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

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

    // Click Send code
    console.log('[3] Clicking Send code...');
    await page.locator('text=Send code').first().click({ force: true });

    // Wait for Turnstile token
    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log('Waiting for Turnstile token (manual VNC if needed)...');
    console.log('VNC: 2.12:5900');
    console.log('══════════════════════════════════════════════');

    const startTime = Date.now();
    while (Date.now() - startTime < 120000) {
      if (turnstileToken) break;
      // Check if token was set on window
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

    console.log('[4] Got Turnstile token! Length: ' + turnstileToken.length);
    await browser.close();

    // Now send verification code via curl with the captured token
    console.log('[5] Sending verification code via API...');
    
    // Step A: Get PoW challenge
    const challengeResult = execSync(
      `curl -s -X POST 'https://chat.deepseek.com/api/v0/users/create_guest_challenge' ` +
      `-H 'Content-Type: application/json' ` +
      `-d '{"target_path":"/v0/users/create_email_verification_code"}'`,
      { encoding: 'utf-8' }
    );
    const challengeData = JSON.parse(challengeResult);
    const cd = challengeData.data.biz_data.guest_challenge;
    console.log(`[5a] Challenge OK, difficulty=${cd.difficulty}`);

    // Step B: Solve PoW
    let nonce = 0;
    const target = '0'.repeat(cd.difficulty / 4);
    const input_base = cd.challenge + cd.salt;
    while (nonce < 10000000) {
      const hash = crypto.createHash('sha256').update(input_base + nonce).digest('hex');
      if (hash.slice(0, target.length) === target) break;
      nonce++;
    }
    console.log(`[5b] PoW solved: nonce=${nonce}`);

    const guestPow = Buffer.from(JSON.stringify({salt: cd.salt, answer: String(nonce)})).toString('base64');
    const deviceId = crypto.randomBytes(16).toString('hex');

    // Step C: Send code with real turnstile token
    const sendResult = execSync(
      `curl -s -X POST 'https://chat.deepseek.com/api/v0/users/create_email_verification_code' ` +
      `-H 'Content-Type: application/json' ` +
      `-H 'X-DS-Guest-PoW-Response: ${guestPow}' ` +
      `-d '${JSON.stringify({
        email: EMAIL,
        turnstile_token: turnstileToken,
        locale: "en-US",
        shumei_verification: {rid: deviceId, region: "overseas"},
        hcaptcha_token: "",
        device_id: deviceId,
        scenario: "register"
      })}'`,
      { encoding: 'utf-8' }
    );
    console.log(`[5c] Result: ${sendResult.substring(0, 500)}`);

    const result = JSON.parse(sendResult);
    if (result.data?.biz_code === 0) {
      console.log('[SUCCESS] Verification code sent to ' + EMAIL);
      console.log('[NEXT] Poll IMAP for code and submit');
    } else {
      console.log(`[FAIL] biz_code=${result.data?.biz_code} msg=${result.data?.biz_msg}`);
    }

  } catch(e) {
    console.error(`[ERROR] ${e.message}`);
    try { await page.screenshot({ path: '/tmp/ds_hybrid_error.png', fullPage: true }); } catch(x) {}
  }
})();
