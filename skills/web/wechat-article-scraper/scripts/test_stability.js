#!/usr/bin/env node
/**
 * 微信公众号抓取稳定性测试
 * 连续测试多次，验证成功率
 * 
 * 使用方法:
 *   node test_stability.js <URL> [attempts]
 */

const { chromium } = require('playwright');

const WECHAT_USER_AGENT = 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.40.2420(0x2800282B) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64';

async function testOnce(url, attemptNumber) {
  const startTime = Date.now();
  
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
    locale: 'zh-CN',
    viewport: { width: 375, height: 812 },
    userAgent: WECHAT_USER_AGENT,
  });
  
  const page = await context.newPage();
  
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    delete navigator.__proto__.webdriver;
    window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
    
    if (!navigator.getBattery) {
      navigator.getBattery = () => Promise.resolve({charging: false, level: 0.75});
    }
    
    if (!navigator.mediaDevices) {
      navigator.mediaDevices = {
        enumerateDevices: () => Promise.resolve([
          { deviceId: 'default', kind: 'audioinput', label: 'Front microphone' },
          { deviceId: 'camera1', kind: 'videoinput', label: 'Front camera' }
        ])
      };
    }
  });
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    const result = await page.evaluate(() => {
      const contentLength = document.querySelector('#js_content')?.innerText.length || 0;
      const title = document.querySelector('#activity-name')?.innerText || '';
      return { contentLength, title };
    });
    
    const elapsed = Date.now() - startTime;
    const success = result.contentLength >= 500;
    
    await browser.close();
    
    return {
      success,
      contentLength: result.contentLength,
      title: result.title,
      elapsed,
      attemptNumber,
    };
  } catch (error) {
    await browser.close();
    return {
      success: false,
      error: error.message,
      elapsed: Date.now() - startTime,
      attemptNumber,
    };
  }
}

async function testStability(url, attempts = 10) {
  console.log('🧪 微信公众号抓取稳定性测试\n');
  console.log(`📄 URL: ${url}`);
  console.log(`🔢 测试次数: ${attempts}\n`);
  
  const results = [];
  let successCount = 0;
  let failedCount = 0;
  let totalTime = 0;
  
  for (let i = 1; i <= attempts; i++) {
    process.stdout.write(`测试 ${i}/${attempts}... `);
    
    const result = await testOnce(url, i);
    results.push(result);
    totalTime += result.elapsed;
    
    if (result.success) {
      successCount++;
      console.log(`✓ 成功 (${result.contentLength} 字符, ${(result.elapsed / 1000).toFixed(1)}s)`);
    } else {
      failedCount++;
      if (result.error) {
        console.log(`✗ 错误: ${result.error}`);
      } else {
        console.log(`✗ 失败 (${result.contentLength} 字符)`);
      }
    }
    
    // 间隔 1 秒
    if (i < attempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果');
  console.log('='.repeat(50));
  console.log(`总计: ${attempts}`);
  console.log(`成功: ${successCount} ${successCount === attempts ? '✓✓✓' : ''}`);
  console.log(`失败: ${failedCount}`);
  console.log(`成功率: ${(successCount / attempts * 100).toFixed(1)}%`);
  console.log(`平均耗时: ${(totalTime / attempts / 1000).toFixed(1)}s`);
  
  if (successCount > 0) {
    const successResults = results.filter(r => r.success);
    const avgContentLength = successResults.reduce((sum, r) => sum + r.contentLength, 0) / successResults.length;
    console.log(`平均内容长度: ${Math.round(avgContentLength)} 字符`);
  }
  
  console.log('='.repeat(50));
  
  // 返回详细结果
  return {
    total: attempts,
    success: successCount,
    failed: failedCount,
    successRate: (successCount / attempts * 100).toFixed(1),
    avgTime: (totalTime / attempts / 1000).toFixed(1),
    results,
  };
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
微信公众号抓取稳定性测试

使用方法:
  node test_stability.js <URL> [attempts]

参数:
  URL        微信公众号文章 URL
  attempts   测试次数（默认 10）

示例:
  node test_stability.js "https://mp.weixin.qq.com/s/xxxxx" 10
  node test_stability.js "https://mp.weixin.qq.com/s/xxxxx" 20

环境要求: GPU + Vulkan + Chrome
    `);
    process.exit(0);
  }
  
  const url = args[0];
  const attempts = parseInt(args[1]) || 10;
  
  try {
    await testStability(url, attempts);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ 测试失败: ${error.message}`);
    process.exit(1);
  }
}

main();
