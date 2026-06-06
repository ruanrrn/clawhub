#!/usr/bin/env node
/**
 * Cloudflare Turnstile 绕过辅助函数
 * 
 * 用法：
 *   const { bypassTurnstile } = require('./turnstile_helper.js');
 *   const token = await bypassTurnstile('https://example.com', '0x4AAAAAAA...');
 */

const { createAntiDetectionBrowser, applyAntiDetection } = require('./bypass_template.js');

/**
 * 绕过 Cloudflare Turnstile 验证
 * 
 * @param {string} url - 包含 Turnstile 的页面 URL
 * @param {string} sitekey - Turnstile sitekey
 * @param {object} options - 可选配置
 * @param {number} options.timeout - 超时时间（秒），默认 60
 * @param {boolean} options.autoRender - 是否自动调用 render()，默认 true
 * @returns {Promise<string>} Turnstile token
 */
async function bypassTurnstile(url, sitekey, options = {}) {
  const {
    timeout = 60,
    autoRender = true
  } = options;
  
  console.log('[Turnstile] Launching browser...');
  const { browser, context } = await createAntiDetectionBrowser();
  
  const page = await context.newPage();
  await applyAntiDetection(page);
  
  console.log('[Turnstile] Navigating to:', url);
  await page.goto(url, { waitUntil: 'networkidle' });
  
  // 等待 Turnstile SDK 加载
  await page.waitForTimeout(2000);
  
  if (autoRender) {
    console.log('[Turnstile] Triggering render...');
    
    const renderResult = await page.evaluate((sitekey) => {
      // 强制显示 overlay
      const overlay = document.querySelector('#cf-overlay');
      if (overlay) {
        overlay.style.display = 'flex';
        overlay.style.visibility = 'visible';
      }
      
      if (!window.turnstile || !window.turnstile.render) {
        return { error: 'Turnstile API not loaded' };
      }
      
      window.__turnstileToken = null;
      window.__turnstileError = null;
      
      try {
        const widgetId = window.turnstile.render('#cf-turnstile', {
          sitekey: sitekey,
          callback: (token) => {
            window.__turnstileToken = token;
            console.log('[Turnstile] Token received');
          },
          'error-callback': (errorCode) => {
            window.__turnstileError = errorCode;
            console.log('[Turnstile] Error:', errorCode);
          }
        });
        
        return { success: true, widgetId };
      } catch (e) {
        return { error: e.message };
      }
    }, sitekey);
    
    if (renderResult.error) {
      await browser.close();
      throw new Error('Turnstile render failed: ' + renderResult.error);
    }
    
    console.log('[Turnstile] Widget ID:', renderResult.widgetId);
  }
  
  // 轮询等待 token
  console.log('[Turnstile] Waiting for token (max', timeout, 's)...');
  
  const checkInterval = 3000; // 每 3 秒检查一次
  const maxAttempts = Math.ceil(timeout / (checkInterval / 1000));
  
  for (let i = 0; i < maxAttempts; i++) {
    await page.waitForTimeout(checkInterval);
    
    const status = await page.evaluate(() => ({
      token: window.__turnstileToken,
      error: window.__turnstileError,
      iframes: document.querySelectorAll('iframe').length
    }));
    
    const elapsed = (i + 1) * (checkInterval / 1000);
    console.log(`  [${elapsed}s] Iframes: ${status.iframes}, Token: ${status.token ? 'YES' : 'NO'}`);
    
    if (status.token) {
      console.log('[Turnstile] ✓ Token obtained after', elapsed, 's');
      await browser.close();
      return status.token;
    }
    
    if (status.error) {
      await browser.close();
      throw new Error('Turnstile error: ' + status.error);
    }
  }
  
  await browser.close();
  throw new Error('Turnstile timeout after ' + timeout + 's');
}

/**
 * 从页面中提取 Turnstile sitekey
 * 
 * @param {string} url - 页面 URL
 * @returns {Promise<string|null>} Sitekey 或 null
 */
async function extractSitekey(url) {
  const { browser, context } = await createAntiDetectionBrowser();
  const page = await context.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle' });
  
  const sitekey = await page.evaluate(() => {
    // 方法 1：从脚本标签中提取
    const scripts = document.querySelectorAll('script[src*="turnstile"]');
    for (const script of scripts) {
      const match = script.src.match(/sitekey=([^&]+)/);
      if (match) return match[1];
    }
    
    // 方法 2：从 HTML 属性中提取
    const element = document.querySelector('[data-sitekey]');
    if (element) return element.getAttribute('data-sitekey');
    
    // 方法 3：从 JS 变量中提取
    const bodyText = document.body.innerHTML;
    const match = bodyText.match(/sitekey['":\s]+['"]([0-9a-zA-Z_-]+)['"]/);
    if (match) return match[1];
    
    return null;
  });
  
  await browser.close();
  return sitekey;
}

/**
 * 验证 Turnstile token 是否有效
 * 
 * @param {string} token - Turnstile token
 * @param {string} secret - Turnstile secret key（服务端）
 * @returns {Promise<boolean>} 是否有效
 */
async function verifyToken(token, secret) {
  const fetch = require('node-fetch');
  
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: secret,
      response: token
    })
  });
  
  const result = await response.json();
  return result.success === true;
}

// CLI 测试
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node turnstile_helper.js <url> <sitekey>');
    console.log('Example: node turnstile_helper.js https://example.com 0x4AAAAAAA1jQEh8YFk064tz');
    process.exit(1);
  }
  
  const [url, sitekey] = args;
  
  bypassTurnstile(url, sitekey)
    .then(token => {
      console.log('\n✓✓✓ SUCCESS ✓✓✓');
      console.log('Token:', token);
      process.exit(0);
    })
    .catch(err => {
      console.error('\n✗ FAILED:', err.message);
      process.exit(1);
    });
}

module.exports = { bypassTurnstile, extractSitekey, verifyToken };
