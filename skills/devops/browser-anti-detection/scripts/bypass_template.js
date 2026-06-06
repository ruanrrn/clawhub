#!/usr/bin/env node
/**
 * 通用反检测浏览器模板
 * 
 * 用法：
 *   node bypass_template.js <url>
 * 
 * 功能：
 *   - 使用 Intel GPU + Vulkan 渲染
 *   - 完整反检测脚本
 *   - 自动截图和内容提取
 */

const { chromium } = require('playwright');

async function createAntiDetectionBrowser() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      // 核心：Vulkan + 硬件 GPU
      '--use-angle=vulkan',
      '--use-vulkan=native',
      '--enable-features=Vulkan',
      '--disable-vulkan-fallback-to-gl-for-testing',
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
      '--enable-oop-rasterization',
    ],
  });

  const context = await browser.newContext({ 
    locale: 'en-US',
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  });
  
  return { browser, context };
}

async function applyAntiDetection(page) {
  await page.addInitScript(() => {
    // 1. 移除 webdriver 标记
    delete Object.getPrototypeOf(navigator).webdriver;
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });
    
    // 2. Chrome runtime
    window.chrome = {
      runtime: {},
      loadTimes: () => ,
      csi: () => {},
      app: {}
    };
    
    // 3. Battery API
    if (!navigator.getBattery) {
      navigator.getBattery = () => Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 1
      });
    }
    
    // 4. Media Devices
    if (!navigator.mediaDevices) {
      navigator.mediaDevices = {
        enumerateDevices: () => Promise.resolve([
          { deviceId: 'default', kind: 'audioinput', label: '', groupId: '' },
          { deviceId: 'default', kind: 'videoinput', label: '', groupId: '' }
        ]),
        getUserMedia: () => Promise.reject(new Error('Permission denied'))
      };
    }
    
    // 5. Plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Chromium PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' }
      ]
    });
    
    // 6. Languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    });
    
    // 7. Hardware
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 16 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    
    // 8. Connection
    if (!navigator.connection) {
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          rtt: 50,
          downlink: 10,
          saveData: false
        })
      });
    }
    
    // 9. Permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });
}

async function verifyGPU(page) {
  const gpuInfo = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) return { error: 'WebGL not available' };
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    
    return {
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'N/A',
      unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'N/A',
    };
  });
  
  console.log('=== GPU Info ===');
  console.log('Unmasked Renderer:', gpuInfo.unmaskedRenderer);
  
  if (gpuInfo.unmaskedRenderer.includes('SwiftShader')) {
    console.warn('⚠️  WARNING: Using SwiftShader (software rendering), detection may fail!');
    return false;
  }
  
  if (gpuInfo.unmaskedRenderer.includes('Intel') || 
      gpuInfo.unmaskedRenderer.includes('NVIDIA') || 
      gpuInfo.unmaskedRenderer.includes('AMD')) {
    console.log('✓ Hardware GPU detected');
    return true;
  }
  
  return false;
}

async function main(url) {
  console.log('[1] Creating anti-detection browser...');
  const { browser, context } = await createAntiDetectionBrowser();
  
  const page = await context.newPage();
  
  console.log('[2] Applying anti-detection scripts...');
  await applyAntiDetection(page);
  
  console.log('[3] Navigating to:', url);
  await page.goto(url, { waitUntil: 'networkidle' });
  
  console.log('[4] Verifying GPU...');
  const gpuOk = await verifyGPU(page);
  
  if (!gpuOk) {
    console.error('✗ GPU verification failed, consider fixing Vulkan setup');
  }
  
  console.log('[5] Checking if blocked...');
  const pageContent = await page.evaluate(() => ({
    title: document.title,
    bodyText: document.body.innerText.substring(0, 500),
    hasCaptcha: document.body.innerHTML.includes('captcha') || 
                document.body.innerHTML.includes('turnstile') ||
                document.body.innerHTML.includes('hcaptcha')
  }));
  
  console.log('\n=== Page Info ===');
  console.log('Title:', pageContent.title);
  console.log('Has CAPTCHA:', pageContent.hasCaptcha);
  console.log('Body preview:', pageContent.bodyText);
  
  // 截图
  const screenshotPath = '/tmp/anti_detection_screenshot.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('\n✓ Screenshot saved to:', screenshotPath);
  
  await browser.close();
  
  return {
    success: !pageContent.hasCaptcha,
    gpuOk,
    pageContent
  };
}

// CLI
if (require.main === module) {
  const url = process.argv[2];
  
  if (!url) {
    console.log('Usage: node bypass_template.js <url>');
    console.log('Example: node bypass_template.js https://example.com');
    process.exit(1);
  }
  
  main(url)
    .then(result => {
      console.log('\n=== Result ===');
      console.log('Success:', result.success);
      console.log('GPU OK:', result.gpuOk);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = { createAntiDetectionBrowser, applyAntiDetection, verifyGPU };
