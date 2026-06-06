#!/usr/bin/env node
/**
 * Cloudflare Turnstile Pattern Analysis Tool
 * 
 * Systematically tests different browser configurations to identify
 * which combinations successfully bypass Cloudflare Turnstile.
 * 
 * Usage:
 *   node turnstile_pattern_test.js [options]
 * 
 * Options:
 *   --tests N        Number of test iterations (default: 20)
 *   --interval N     Seconds between tests (default: 30)
 *   --url URL        Test URL (default: DeepSeek signup)
 *   --sitekey KEY    Turnstile sitekey
 * 
 * Output:
 *   - Console: Real-time test results
 *   - JSONL log: /tmp/turnstile_pattern_log.jsonl
 *   - Summary: Success rate by variant
 */

const { chromium } = require('playwright');

// Test configurations
const VARIANTS = {
  baseline: {
    name: 'baseline',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    args: [
      '--use-angle=vulkan',
      '--use-vulkan=native',
      '--enable-features=Vulkan',
      '--ignore-gpu-blocklist',
    ],
  },
  linux_ua: {
    name: 'linux_ua',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    args: [
      '--use-angle=vulkan',
      '--use-vulkan=native',
      '--enable-features=Vulkan',
      '--ignore-gpu-blocklist',
    ],
  },
  smaller_viewport: {
    name: 'smaller_viewport',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    args: [
      '--use-angle=vulkan',
      '--use-vulkan=native',
      '--enable-features=Vulkan',
      '--ignore-gpu-blocklist',
    ],
  },
  no_vulkan: {
    name: 'no_vulkan',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    args: [], // No Vulkan flags
  },
};

const TEST_CONFIG = {
  url: process.argv.includes('--url') 
    ? process.argv[process.argv.indexOf('--url') + 1]
    : 'https://chat.deepseek.com/sign_up',
  sitekey: process.argv.includes('--sitekey')
    ? process.argv[process.argv.indexOf('--sitekey') + 1]
    : '0x4AAAAAAA1jQEh8YFk064tz',
  totalTests: process.argv.includes('--tests')
    ? parseInt(process.argv[process.argv.indexOf('--tests') + 1])
    : 20,
  intervalSeconds: process.argv.includes('--interval')
    ? parseInt(process.argv[process.argv.indexOf('--interval') + 1])
    : 30,
  logPath: '/tmp/turnstile_pattern_log.jsonl',
};

const fs = require('fs');

async function testTurnstile(variant, testNum) {
  const startTime = Date.now();
  
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      ...variant.args,
    ],
  });

  const context = await browser.newContext({
    locale: 'en-US',
    viewport: variant.viewport,
    userAgent: variant.userAgent,
  });

  const page = await context.newPage();

  // Anti-detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
    if (!navigator.getBattery) {
      navigator.getBattery = () => Promise.resolve({ charging: true, level: 1 });
    }
    if (!navigator.mediaDevices) {
      navigator.mediaDevices = {
        enumerateDevices: () => Promise.resolve([
          { kind: 'audioinput', label: 'Default' },
          { kind: 'videoinput', label: 'Default' }
        ])
      };
    }
  });

  // Region injection (DeepSeek specific)
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

  try {
    await page.goto(TEST_CONFIG.url, { waitUntil: 'networkidle', timeout: 30000 });

    // Get GPU info
    const gpuInfo = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return { renderer: 'no_webgl' };
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown'
      };
    });

    // Trigger Turnstile
    await page.evaluate((sitekey) => {
      window.__turnstileToken = null;
      window.__turnstileError = null;

      if (window.turnstile && window.turnstile.render) {
        window.turnstile.render('#cf-turnstile', {
          sitekey: sitekey,
          callback: (token) => { window.__turnstileToken = token; },
          'error-callback': (error) => { window.__turnstileError = error; }
        });
      }
    }, TEST_CONFIG.sitekey);

    // Poll for result (max 60s)
    let token = null;
    let error = null;
    
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(3000);
      
      const result = await page.evaluate(() => ({
        token: window.__turnstileToken,
        error: window.__turnstileError
      }));
      
      if (result.token) {
        token = result.token;
        break;
      }
      if (result.error) {
        error = result.error;
        break;
      }
    }

    const duration = Date.now() - startTime;

    const logEntry = {
      timestamp: new Date().toISOString(),
      testNum,
      variant: variant.name,
      success: !!token,
      token: token ? token.substring(0, 30) + '...' : null,
      errorCode: error,
      duration,
      gpuInfo,
      userAgent: variant.userAgent,
      viewport: variant.viewport,
    };

    // Append to JSONL log
    fs.appendFileSync(TEST_CONFIG.logPath, JSON.stringify(logEntry) + '\n');

    await browser.close();
    return logEntry;

  } catch (err) {
    const duration = Date.now() - startTime;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      testNum,
      variant: variant.name,
      success: false,
      token: null,
      errorCode: err.message.includes('timeout') ? 'timeout' : 'exception',
      duration,
      gpuInfo: null,
      userAgent: variant.userAgent,
      viewport: variant.viewport,
    };

    fs.appendFileSync(TEST_CONFIG.logPath, JSON.stringify(logEntry) + '\n');
    await browser.close();
    return logEntry;
  }
}

async function main() {
  console.log('========================================');
  console.log('Turnstile Pattern Analysis');
  console.log('========================================');
  console.log('Tests:', TEST_CONFIG.totalTests);
  console.log('Interval:', TEST_CONFIG.intervalSeconds + 's');
  console.log('Variants:', Object.keys(VARIANTS).join(', '));
  console.log('Log:', TEST_CONFIG.logPath);
  console.log('========================================\n\n');

  // Clear previous log
  if (fs.existsSync(TEST_CONFIG.logPath)) {
    fs.unlinkSync(TEST_CONFIG.logPath);
  }

  const variantKeys = Object.keys(VARIANTS);
  
  for (let i = 0; i < TEST_CONFIG.totalTests; i++) {
    const variantKey = variantKeys[i % variantKeys.length];
    const variant = VARIANTS[variantKey];
    
    console.log(`[${i + 1}/${TEST_CONFIG.totalTests}] Testing variant: ${variant.name}`);
    console.log('Time:', new Date().toLocaleTimeString());
    
    const result = await testTurnstile(variant, i + 1);
    
    console.log('Result:', result.success ? '✓ SUCCESS' : '✗ FAILED');
    if (result.success) {
      console.log('Token:', result.token);
    } else {
      console.log('Error:', result.errorCode);
    }
    console.log('Duration:', (result.duration / 1000).toFixed(1) + 's');
    if (result.gpuInfo) {
      console.log('GPU:', result.gpuInfo.renderer);
    }
    
    if (i < TEST_CONFIG.totalTests - 1) {
      console.log(`\nWaiting ${TEST_CONFIG.intervalSeconds}s before next test...\n`);
      await new Promise(r => setTimeout(r, TEST_CONFIG.intervalSeconds * 1000));
    }
  }

  // Generate summary
  console.log('\n========================================');
  console.log('Analysis Summary');
  console.log('========================================');
  
  const logs = fs.readFileSync(TEST_CONFIG.logPath, 'utf8')
    .trim()
    .split('\n')
    .map(line => JSON.parse(line));
  
  const successCount = logs.filter(l => l.success).length;
  console.log('Total tests:', logs.length);
  console.log('Success:', successCount, `(${(successCount / logs.length * 100).toFixed(1)}%)`);
  console.log('Failed:', logs.length - successCount);
  
  console.log('\nBy variant:');
  for (const variantKey of variantKeys) {
    const variantLogs = logs.filter(l => l.variant === variantKey);
    const variantSuccess = variantLogs.filter(l => l.success).length;
    console.log(`  ${variantKey}: ${variantSuccess}/${variantLogs.length} (${(variantSuccess / variantLogs.length * 100).toFixed(1)}%)`);
  }
  
  const errorCounts = {};
  logs.filter(l => !l.success).forEach(l => {
    errorCounts[l.errorCode] = (errorCounts[l.errorCode] || 0) + 1;
  });
  
  if (Object.keys(errorCounts).length > 0) {
    console.log('\nError codes:');
    for (const [code, count] of Object.entries(errorCounts)) {
      console.log(`  ${code}: ${count}`);
    }
  }
  
  console.log('\n========================================');
  console.log('Full log:', TEST_CONFIG.logPath);
  console.log('========================================\n');
  console.log('Pattern analysis complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
