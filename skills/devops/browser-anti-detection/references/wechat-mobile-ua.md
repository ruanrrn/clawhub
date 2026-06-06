# 微信公众号移动端 UA 绕过方案

## 测试结果（2026-06-07）

**稳定性测试**: 10/10 成功 (100%)  
**测试环境**: 2.12 (Intel UHD Graphics + Vulkan)  
**平均耗时**: 8-10 秒

## 成功配置

### User Agent（关键）

**Android 微信**（推荐）:
```
Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.40.2420(0x2800282B) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64
```

**iOS 微信**（备选）:
```
Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.40(0x18002829) NetType/WIFI Language/zh_CN
```

### 视口尺寸

```javascript
viewport: { width: 375, height: 812 }  // iPhone 尺寸
```

### Playwright 配置

```javascript
const { chromium } = require('playwright');

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
  userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) ... MicroMessenger/8.0.40...',
});
```

### 反检测脚本

```javascript
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
```

## 判定逻辑（重要）

**错误做法**（导致误判）:
```javascript
// ❌ 不要搜索错误提示文字
isBlocked: bodyText.includes('环境异常') || bodyText.includes('验证')
```

**正确做法**:
```javascript
// ✅ 基于内容长度判断
const contentLength = document.querySelector('#js_content')?.innerText?.length || 0;
const isBlocked = contentLength < 500;
```

**原因**: 移动端 UA 会显示"微信网络连接问题"提示，但主体内容已成功加载（1100+ 字符）。

## 提取内容

```javascript
const result = await page.evaluate(() => {
  const title = document.querySelector('#activity-name')?.innerText || '';
  const author = document.querySelector('#js_name')?.innerText || '';
  const publishTime = document.querySelector('#publish_time')?.innerText || '';
  const articleText = document.querySelector('#js_content')?.innerText || '';
  
  return {
    success: articleText.length >= 500,
    title: title.trim(),
    author: author.trim(),
    publishTime: publishTime.trim(),
    content: articleText,
    contentLength: articleText.length
  };
});
```

## 对比测试结果

| User Agent | 成功率 | Body Length | 备注 |
|-----------|--------|-------------|------|
| **Android 微信** | **100%** (10/10) | 1132 chars | 完整文章内容 ✓ |
| **iOS 微信** | **100%** (测试 1 次) | 1211 chars | 完整文章内容 ✓ |
| Linux 桌面 | 0% | 30 chars | "环境异常" ✗ |

## 关键洞察

### 1. 微信检测机制

```
桌面 UA (Linux/Windows) → 严格检测 → 拦截 ❌
移动 UA (微信 Android/iOS) → 宽松检测 → 正常加载 ✅
```

### 2. 与 Cloudflare 的相似性

| 特征 | Cloudflare Turnstile | 微信公众号 |
|------|---------------------|-----------|
| **关键因素** | User Agent | User Agent |
| **成功 UA** | Linux x86_64 (66.7%) | 微信移动端 (100%) |
| **失败 UA** | Windows 10 (0%) | Linux 桌面 (0%) |
| **GPU 要求** | 必要 | 必要 |
| **检测模型** | 信任度评分 | 信任度评分 |

**结论**: 两者使用相同的检测机制，只是信任不同的 UA。

### 3. 为什么之前认为"微信更严格"？

**错误判断的原因**:
1. 使用了 Linux 桌面 UA（不被信任）
2. 判定逻辑错误（误判网络提示为拦截）

**实际情况**:
- 微信对移动端 UA 非常友好（100% 成功）
- 微信对桌面 UA 非常严格（0% 成功）

## 完整示例代码

```javascript
const { chromium } = require('playwright');

async function fetchWeChatArticle(url) {
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
    userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.40.2420(0x2800282B) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64',
  });
  
  const page = await context.newPage();
  
  // 反检测
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
  
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(Math.random() * 1000 + 2000);
  
  // 提取内容（基于长度判断）
  const result = await page.evaluate(() => {
    const title = document.querySelector('#activity-name')?.innerText || '';
    const author = document.querySelector('#js_name')?.innerText || '';
    const publishTime = document.querySelector('#publish_time')?.innerText || '';
    const articleText = document.querySelector('#js_content')?.innerText || '';
    
    return {
      success: articleText.length >= 500,
      title: title.trim(),
      author: author.trim(),
      publishTime: publishTime.trim(),
      content: articleText,
      contentLength: articleText.length
    };
  });
  
  await browser.close();
  return result;
}

// 使用
fetchWeChatArticle('https://mp.weixin.qq.com/s/xxxxx')
  .then(result => {
    if (result.success) {
      console.log('✓ Success!');
      console.log('Title:', result.title);
      console.log('Content:', result.contentLength, 'chars');
    } else {
      console.log('✗ Failed');
    }
  });
```

## 环境要求

同 Cloudflare Turnstile 方案：
- Intel/NVIDIA/AMD GPU + Vulkan 驱动
- Chrome/Chromium
- Playwright
- 用户需在 video/render 组

## 注意事项

### 1. 合规性
- ⚠️ 应遵守微信公众平台使用协议
- ⚠️ 建议添加延迟，避免高频抓取
- ⚠️ 抓取内容应注明来源

### 2. 稳定性
- ✅ 当前 100% 成功（10/10）
- ⚠️ 微信可能更新检测规则
- ⚠️ 建议监控成功率，低于 80% 时调整

### 3. 法律风险
- ⚠️ 遵守版权法
- ⚠️ 不用于商业盈利（除非获得授权）

---

**测试日期**: 2026-06-07  
**测试环境**: 2.12 (Intel UHD Graphics ADL-N, Vulkan 1.3.230)  
**成功率**: 100% (10/10)  
**测试 URL**: https://mp.weixin.qq.com/s/E3PGL6CD-nRG3AHN4U8WNw
