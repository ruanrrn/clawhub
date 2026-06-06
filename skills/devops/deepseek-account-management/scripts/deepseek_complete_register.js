#!/usr/bin/env node
/**
 * DeepSeek 完整自动注册脚本
 * 
 * 功能：
 * - PoW 解算
 * - Turnstile 绕过（GPU + Vulkan，优先使用 browser-anti-detection skill）
 * - 发送验证码
 * - 163 IMAP 收验证码
 * - 完成注册
 * 
 * 使用：
 *   node complete_register.js <gmail_alias> <password>
 *   例如：node complete_register.js rayruan1230+ds001@gmail.com MyPass123!
 * 
 * 环境：
 *   - GPU + Vulkan（bash ~/.hermes/skills/devops/browser-anti-detection/scripts/diagnose_gpu.sh）
 *   - 163 邮箱转发（Gmail → 163）
 */

const { chromium } = require('playwright');
const crypto = require('crypto');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// 163 IMAP 配置
const IMAP_HOST = 'imap.163.com';
const IMAP_PORT = 993;
const IMAP_USER = 'rayruanrn@163.com';
const IMAP_PASS = 'BDvFEeeimuFpAdiQ';

// 尝试加载 browser-anti-detection skill
let bypassTurnstile;
try {
  const skillPath = path.join(process.env.HOME, '.hermes/skills/devops/browser-anti-detection/scripts');
  ({ bypassTurnstile } = require(path.join(skillPath, 'turnstile_helper.js')));
  console.log('[INFO] Using browser-anti-detection skill for Turnstile');
} catch (e) {
  console.warn('[WARN] browser-anti-detection skill not found');
  bypassTurnstile = null;
}

// PoW 解算
function solvePoW(challenge, salt, difficulty) {
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

// 内联 Turnstile 实现（回退）
async function getTurnstileTokenFallback() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--use-angle=vulkan',
      '--use-vulkan=native',
      '--enable-features=Vulkan',
      '--ignore-gpu-blocklist',
    ],
  });

  const context = await browser.newContext({ 
    locale: 'en-US',
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  });
  
  const page = await context.newPage();

  // 反检测脚本
  await page.addInitScript(() => {
    delete Object.getPrototypeOf(navigator).webdriver;
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
    if (!navigator.getBattery) {
      navigator.getBattery = () => Promise.resolve({charging: true, level: 1});
    }
    if (!navigator.mediaDevices) {
      navigator.mediaDevices = {
        enumerateDevices: () => Promise.resolve([{kind: 'audioinput'}, {kind: 'videoinput'}])
      };
    }
  });

  // Region 注入
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

  await page.goto('https://chat.deepseek.com/sign_up', { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', 'dummy@example.com');
  await page.fill('input[type="password"]', 'DummyPass123!');
  
  try {
    await page.locator('text=Accept all').first().click({ timeout: 2000 });
  } catch(e) {}
  
  await page.locator('text=Send code').click();
  await page.waitForTimeout(2000);
  
  const renderRes = await page.evaluate(() => {
    const overlay = document.querySelector('#cf-overlay');
    if (overlay) overlay.style.display = 'flex';
    
    if (!window.turnstile || !window.turnstile.render) return {error: 'no API'};
    
    window.__turnstileToken = null;
    
    try {
      const widgetId = window.turnstile.render('#cf-turnstile', {
        sitekey: '0x4AAAAAAA1jQEh8YFk064tz',
        callback: (token) => { window.__turnstileToken = token; }
      });
      return {success: true, widgetId};
    } catch (e) {
      return {error: e.message};
    }
  });
  
  if (renderRes.error) {
    await browser.close();
    throw new Error('Turnstile render failed: ' + renderRes.error);
  }
  
  // 等待 token
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(3000);
    const token = await page.evaluate(() => window.__turnstileToken);
    if (token) {
      await browser.close();
      return token;
    }
  }
  
  await browser.close();
  throw new Error('Turnstile timeout');
}

// 163 IMAP 收验证码
async function getVerificationCode(targetEmail, timeoutSec = 120) {
  console.log(`[IMAP] Polling for verification code sent to ${targetEmail}...`);
  
  const script = `
import imaplib
import email
import time
import sys
import re

mail = imaplib.IMAP4_SSL('${IMAP_HOST}', ${IMAP_PORT})
mail.xatom('ID ("name" "Hermes" "version" "1.0")')
mail.login('${IMAP_USER}', '${IMAP_PASS}')
mail.select('INBOX')

start_time = time.time()
timeout = ${timeoutSec}

while time.time() - start_time < timeout:
    status, messages = mail.search(None, 'UNSEEN')
    if status != 'OK':
        time.sleep(3)
        continue
    
    msg_nums = messages[0].split()
    
    for num in msg_nums:
        status, msg_data = mail.fetch(num, '(RFC822)')
        if status != 'OK':
            continue
        
        raw_email = msg_data[0][1]
        msg = email.message_from_bytes(raw_email)
        
        # 检查收件人
        to = msg.get('To', '')
        if '${targetEmail}' not in to:
            continue
        
        # 检查主题
        subject = msg.get('Subject', '')
        if 'DeepSeek' not in subject and 'deepseek' not in subject.lower():
            continue
        
        # 提取验证码
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == 'text/plain' or part.get_content_type() == 'text/html':
                    body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    match = re.search(r'\\b(\\d{6})\\b', body)
                    if match:
                        print(match.group(1))
                        mail.close()
                        mail.logout()
                        sys.exit(0)
        else:
            body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')
            match = re.search(r'\\b(\\d{6})\\b', body)
            if match:
                print(match.group(1))
                mail.close()
                mail.logout()
                sys.exit(0)
    
    time.sleep(3)

mail.close()
mail.logout()
print('TIMEOUT', file=sys.stderr)
sys.exit(1)
`;

  try {
    const { stdout, stderr } = await execPromise(`python3 -c "${script.replace(/"/g, '\\"')}"`);
    const code = stdout.trim();
    
    if (/^\d{6}$/.test(code)) {
      console.log('✓ Verification code received:', code);
      return code;
    } else {
      throw new Error('Invalid code format: ' + code);
    }
  } catch (e) {
    if (e.stderr && e.stderr.includes('TIMEOUT')) {
      throw new Error('IMAP timeout - no verification code received');
    }
    throw new Error('IMAP error: ' + e.message);
  }
}

// 完成注册
async function completeRegistration(email, password, verificationCode) {
  console.log('[5] Completing registration...');
  
  const fetch = (await import('node-fetch')).default;
  
  const resp = await fetch('https://chat.deepseek.com/api/v0/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email,
      password: password,
      verification_code: verificationCode,
      scenario: 'register'
    })
  });
  
  const result = await resp.json();
  
  console.log('Registration response:', JSON.stringify(result, null, 2));
  
  if (resp.status === 200 && result.code === 0) {
    console.log('✓ Registration completed!');
    return { success: true, data: result.data };
  } else {
    throw new Error('Registration failed: ' + (result.msg || result.data?.biz_msg));
  }
}

// 主流程
async function main(email, password) {
  console.log('='.repeat(50));
  console.log('DeepSeek Auto Registration');
  console.log('Email:', email);
  console.log('='.repeat(50));
  console.log('');
  
  try {
    // 1. PoW 解算
    console.log('[1] Solving PoW challenge...');
    const fetch = (await import('node-fetch')).default;
    
    const powResp = await fetch('https://chat.deepseek.com/api/v0/users/create_guest_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_path: '/v0/users/create_email_verification_code' })
    });
    
    const challengeData = (await powResp.json()).data.biz_data.guest_challenge;
    const nonce = solvePoW(challengeData.challenge, challengeData.salt, challengeData.difficulty);
    console.log('✓ PoW solved (nonce:', nonce, ')');
    
    const powHeader = Buffer.from(JSON.stringify({
      salt: challengeData.salt,
      answer: String(nonce)
    })).toString('base64');
    
    // 2. Turnstile token
    console.log('[2] Getting Turnstile token...');
    let turnstileToken;
    
    if (bypassTurnstile) {
      try {
        turnstileToken = await bypassTurnstile(
          'https://chat.deepseek.com/sign_up',
          '0x4AAAAAAA1jQEh8YFk064tz',
          { timeout: 60 }
        );
        console.log('✓ Token obtained via browser-anti-detection skill');
      } catch (e) {
        console.warn('⚠️  browser-anti-detection failed, trying fallback...');
        turnstileToken = await getTurnstileTokenFallback();
      }
    } else {
      turnstileToken = await getTurnstileTokenFallback();
    }
    
    // 3. 发送验证码
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
    
    const verifyResult = await verifyResp.json();
    
    if (verifyResp.status !== 200 || verifyResult.data.biz_code !== 0) {
      throw new Error('Send code failed: ' + verifyResult.data.biz_msg);
    }
    
    console.log('✓ Verification code sent');
    
    // 4. IMAP 收验证码
    console.log('[4] Waiting for verification code via IMAP...');
    const code = await getVerificationCode(email, 120);
    
    // 5. 完成注册
    const registrationResult = await completeRegistration(email, password, code);
    
    console.log('');
    console.log('='.repeat(50));
    console.log('✓✓✓ REGISTRATION SUCCESSFUL ✓✓✓');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('='.repeat(50));
    
    return { success: true };
    
  } catch (error) {
    console.error('');
    console.error('='.repeat(50));
    console.error('✗ REGISTRATION FAILED');
    console.error('Error:', error.message);
    console.error('='.repeat(50));
    
    return { success: false, error: error.message };
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node complete_register.js <email> <password>');
    console.log('Example: node complete_register.js rayruan1230+ds001@gmail.com MyPass123!');
    process.exit(1);
  }
  
  main(args[0], args[1])
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { main };
