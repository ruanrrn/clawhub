#!/usr/bin/env node
/**
 * DeepSeek 自动注册脚本 - 使用 browser-anti-detection skill
 * 
 * 环境要求：
 * - 参见 browser-anti-detection skill 完整配置指南
 * - 快速验证：bash ~/.hermes/skills/devops/browser-anti-detection/scripts/diagnose_gpu.sh
 * 
 * 使用方法：
 *   node deepseek_auto_register.js <email> <password>
 */

const { chromium } = require('playwright');
const crypto = require('crypto');
const path = require('path');

// 尝试加载 browser-anti-detection 辅助函数
let bypassTurnstile, createAntiDetectionBrowser, applyAntiDetection;
try {
  const skillPath = path.join(process.env.HOME, '.hermes/skills/devops/browser-anti-detection/scripts');
  ({ bypassTurnstile } = require(path.join(skillPath, 'turnstile_helper.js')));
  ({ createAntiDetectionBrowser, applyAntiDetection } = require(path.join(skillPath, 'bypass_template.js')));
  console.log('[INFO] Using browser-anti-detection skill');
} catch (e) {
  console.warn('[WARN] browser-anti-detection skill not found, using inline implementation');
  bypassTurnstile = null;
}
const { chromium } = require('playwright');
const crypto = require('crypto');

async function solvePoW(challenge, salt, difficulty) {
  const targetHex = '0'.repeat(difficulty / 4);
  let nonce = 0;
  
  while (nonce < 10000000) {
    const hash = crypto.createHash('sha256')
      .update(`${challenge}${salt}${nonce}`)
      .digest('hex');
    
    if (hash.startsWith(targetHex)) {
      return nonce;
    }
    nonce++;
  }
  
  throw new Error('PoW solving failed');
}

async function register(email, password) {
  console.log('[1] Solving PoW challenge...');
  
  // 获取 PoW 挑战
  const fetch = (await import('node-fetch')).default;
  const powResp = await fetch('https://chat.deepseek.com/api/v0/users/create_guest_challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_path: '/v0/users/create_email_verification_code' })
  });
  
  const challengeData = (await powResp.json()).data.biz_data.guest_challenge;
  
  // 解算 PoW
  const nonce = await solvePoW(challengeData.challenge, challengeData.salt, challengeData.difficulty);
  console.log('✓ PoW solved, nonce:', nonce);
  
  const powHeader = Buffer.from(JSON.stringify({
    salt: challengeData.salt,
    answer: String(nonce)
  })).toString('base64');
  
  console.log('[2] Getting Turnstile token...');
  
  let turnstileToken;
  
  // 优先使用 browser-anti-detection skill 的辅助函数
  if (bypassTurnstile) {
    try {
      turnstileToken = await bypassTurnstile(
        'https://chat.deepseek.com/sign_up',
        '0x4AAAAAAA1jQEh8YFk064tz',
        { timeout: 60 }
      );
      console.log('✓ Turnstile token obtained via browser-anti-detection skill');
    } catch (e) {
      console.error('✗ browser-anti-detection method failed:', e.message);
      console.log('Falling back to inline implementation...');
      turnstileToken = await getTurnstileTokenInline(email, password);
    }
  } else {
    // 回退到内联实现
    turnstileToken = await getTurnstileTokenInline(email, password);
  }
  
  if (!turnstileToken) {
    return { success: false, error: 'Failed to get Turnstile token' };
  }
  
  console.log('[3] Sending verification code...');
  const deviceId = crypto.randomBytes(16).toString('hex');
  
  const verifyResp = await fetch('https://chat.deepseek.com/api/v0/users/create_email_verification_code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DS-Guest-PoW-Response': powHeader
    },
    body: JSON.stringify({
      email: email,
      turnstile_token: turnstileToken,
      locale: 'en-US',
      shumei_verification: { rid: deviceId, region: 'overseas' },
      hcaptcha_token: '',
      device_id: deviceId,
      scenario: 'register'
    })
  });
  
  const result = await verifyResp.json();
  
  console.log('\n=== Result ===');
  console.log('Status:', verifyResp.status);
  console.log('Response:', JSON.stringify(result, null, 2));
  
  if (verifyResp.status === 200 && result.data.biz_code === 0) {
    console.log('\n✓✓✓ SUCCESS! Verification code sent to', email);
    return { success: true };
  } else {
    console.log('\n✗ Failed:', result.data.biz_msg);
    return { success: false, error: result.data.biz_msg };
  }
}

// 内联实现（回退方案）
async function getTurnstileTokenInline(email, password) {
  console.log('[1] Launching browser with Intel GPU + Vulkan...');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      // 关键：强制 Vulkan + Intel GPU
      '--use-angle=vulkan',
      '--use-vulkan=native',
      '--enable-features=Vulkan',
      '--disable-vulkan-fallback-to-gl-for-testing',
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
    ],
  });

  const context = await browser.newContext({ 
    locale: 'en-US',
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  });
  
  const page = await context.newPage();
  
  // 捕获 API 响应
  let apiResponses = {};
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('deepseek.com/api')) {
      const endpoint = url.split('/api/')[1];
      try {
        const body = await resp.text();
        apiResponses[endpoint] = { status: resp.status(), body: JSON.parse(body) };
      } catch(e) {}
    }
  });

  // 完整反检测脚本
  await page.addInitScript(() => {
    delete Object.getPrototypeOf(navigator).webdriver;
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    
    window.chrome = {
      runtime: {},
      loadTimes: () => {},
      csi: () => {},
      app: {}
    };
    
    if (!navigator.getBattery) {
      navigator.getBattery = () => Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 1
      });
    }
    
    if (!navigator.mediaDevices) {
      navigator.mediaDevices = {
        enumerateDevices: () => Promise.resolve([
          { deviceId: 'default', kind: 'audioinput', label: '', groupId: '' },
          { deviceId: 'default', kind: 'videoinput', label: '', groupId: '' }
        ])
      };
    }
    
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'PDF Viewer', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Chromium PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' }
      ]
    });
    
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 16 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
  });

  // Region 注入 (CN → US)
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

  console.log('[2] Loading sign_up page...');
  await page.goto('https://chat.deepseek.com/sign_up', { waitUntil: 'networkidle' });
  
  // 验证 GPU
  const gpu = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return 'WebGL not available';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'N/A';
  });
  console.log('[GPU]', gpu);
  
  if (!gpu.includes('Intel') && !gpu.includes('NVIDIA') && !gpu.includes('AMD')) {
    console.warn('⚠️  Warning: Not using hardware GPU, may fail. Current:', gpu);
  }
  
  console.log('[3] Filling form...');
  await page.fill('input[type="text"]', email);
  await page.fill('input[type="password"]', password);
  
  // 关闭 cookie 弹窗
  try {
    await page.locator('text=Accept all').first().click({ timeout: 2000 });
    await page.waitForTimeout(500);
  } catch(e) {}
  
  console.log('[4] Clicking "Send code"...');
  await page.locator('text=Send code').click();
  await page.waitForTimeout(2000);
  
  console.log('[5] Triggering Turnstile...');
  const renderResult = await page.evaluate(() => {
    const overlay = document.querySelector('#cf-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
    
    if (!window.turnstile || !window.turnstile.render) {
      return { error: 'Turnstile API not loaded' };
    }
    
    window.__turnstileToken = null;
    window.__turnstileError = null;
    
    try {
      const widgetId = window.turnstile.render('#cf-turnstile', {
        sitekey: '0x4AAAAAAA1jQEh8YFk064tz',
        callback: (token) => {
          window.__turnstileToken = token;
        },
        'error-callback': (errorCode) => {
          window.__turnstileError = errorCode;
        }
      });
      
      return { success: true, widgetId };
    } catch (e) {
      return { error: e.message };
    }
  });
  
  if (renderResult.error) {
    console.error('✗ Turnstile render failed:', renderResult.error);
    await browser.close();
    return { success: false, error: renderResult.error };
  }
  
  console.log('[6] Waiting for Turnstile token (max 60s)...');
  let turnstileToken = null;
  
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(3000);
    
    const status = await page.evaluate(() => ({
      token: window.__turnstileToken,
      error: window.__turnstileError
    }));
    
    if (status.token) {
      turnstileToken = status.token;
      console.log('✓ Turnstile token obtained after', (i + 1) * 3, 'seconds');
      break;
    }
    
    if (status.error) {
      console.error('✗ Turnstile error:', status.error);
      await browser.close();
      return { success: false, error: status.error };
    }
    
    if ((i + 1) % 5 === 0) {
      console.log('  Waiting...', (i + 1) * 3, 's');
    }
  }
  
  if (!turnstileToken) {
    console.error('✗ Turnstile timeout after 60s');
    await browser.close();
    return { success: false, error: 'Turnstile timeout' };
  }
  
  console.log('[7] Solving PoW challenge...');
  const powResp = apiResponses['v0/users/create_guest_challenge'];
  if (!powResp || powResp.status !== 200) {
    console.error('✗ PoW challenge not found in captured API responses');
    await browser.close();
    return { success: false, error: 'PoW challenge not found' };
  }
  
  const challengeData = powResp.body.data.biz_data.guest_challenge;
  const nonce = await solvePoW(challengeData.challenge, challengeData.salt, challengeData.difficulty);
  console.log('✓ PoW solved, nonce:', nonce);
  
  const powHeader = Buffer.from(JSON.stringify({
    salt: challengeData.salt,
    answer: String(nonce)
  })).toString('base64');
  
  console.log('[8] Sending verification code...');
  const deviceId = crypto.randomBytes(16).toString('hex');
  
  const verifyResp = await page.evaluate(async (params) => {
    const resp = await fetch('https://chat.deepseek.com/api/v0/users/create_email_verification_code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DS-Guest-PoW-Response': params.powHeader
      },
      body: JSON.stringify({
        email: params.email,
        turnstile_token: params.turnstileToken,
        locale: 'en-US',
        shumei_verification: {
          rid: params.deviceId,
          region: 'overseas'
        },
        hcaptcha_token: '',
        device_id: params.deviceId,
        scenario: 'register'
      })
    });
    
    return {
      status: resp.status,
      body: await resp.json()
    };
  }, { email, turnstileToken, powHeader, deviceId });
  
  console.log('\n=== Result ===');
  console.log('Status:', verifyResp.status);
  console.log('Response:', JSON.stringify(verifyResp.body, null, 2));
  
  await browser.close();
  
  if (verifyResp.status === 200 && verifyResp.body.data.biz_code === 0) {
    console.log('\n✓✓✓ SUCCESS! Verification code sent to', email, '✓✓✓');
    return { success: true };
  } else {
    console.log('\n✗ Failed:', verifyResp.body.data.biz_msg || 'Unknown error');
    return { success: false, error: verifyResp.body.data.biz_msg };
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node deepseek_auto_register.js <email> <password>');
    process.exit(1);
  }
  
  register(args[0], args[1])
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { register };
