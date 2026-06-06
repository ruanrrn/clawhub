# 微信公众号文章抓取 - 快速开始

## 验证成果

- **成功率**: 100% (10/10 测试)
- **验证日期**: 2026-06-07
- **环境**: Intel UHD Graphics + Vulkan
- **平均耗时**: 8-10 秒/篇

---

## 一键开始

### 1. 环境检查

```bash
bash scripts/check_environment.sh
```

如果检查失败，按照提示修复。

### 2. 抓取文章

**Node.js 版本**:
```bash
node scripts/fetch_article.js "https://mp.weixin.qq.com/s/xxxxx"
```

**Python 版本**:
```bash
python3 scripts/fetch_article.py "https://mp.weixin.qq.com/s/xxxxx"
```

### 3. 稳定性测试

```bash
node scripts/test_stability.js "https://mp.weixin.qq.com/s/xxxxx" 10
```

---

## 常用选项

### 保存截图
```bash
node scripts/fetch_article.js "URL" --screenshot
```

### 保存 JSON
```bash
node scripts/fetch_article.js "URL" --output article.json
```

### 包含 HTML
```bash
node scripts/fetch_article.js "URL" --html --output article.json
```

### 重试 5 次
```bash
node scripts/fetch_article.js "URL" --retry 5
```

---

## 环境要求（必须）

### 硬件
- ✅ GPU 支持 Vulkan（Intel/NVIDIA/AMD）
- ❌ 纯 CPU 模式**不可行**

### 软件
```bash
# 1. Vulkan 驱动
sudo apt-get install mesa-vulkan-drivers vulkan-tools

# 2. Google Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install ./google-chrome-stable_current_amd64.deb

# 3. Node.js + Playwright
npm install playwright
npx playwright install chrome

# 4. 中文字体（可选，用于截图）
sudo apt-get install fonts-noto-cjk
```

---

## 核心原理

### 为什么能 100% 成功？

1. **微信移动端 User Agent**
   - 微信对移动端 UA 采用轻度检测
   - 桌面 UA 会触发严格检测

2. **真实 GPU + Vulkan**
   - WebGL/Canvas 指纹必须真实
   - SwiftShader 等软件渲染会被检测

3. **基础反检测**
   - 隐藏 `navigator.webdriver`
   - 添加移动端特性（Battery API, MediaDevices）

### 与 Cloudflare 的对比

| 平台 | 成功 UA | 成功率 |
|------|---------|--------|
| Cloudflare | Linux x86_64 | 66.7% |
| 微信 | 微信移动端 | **100%** |

**核心洞察**: 两者使用相同的检测机制（UA 信任度评分），只是信任的 UA 不同。

---

## 故障排查

### Q: 成功率低于 80%

**可能原因**:
1. GPU/Vulkan 未正确配置
2. 使用了错误的 UA
3. Chrome 版本过旧

**解决方案**:
```bash
# 1. 验证 Vulkan
vulkaninfo | grep "deviceName"

# 2. 验证 Chrome
google-chrome --version

# 3. 重新运行环境检查
bash scripts/check_environment.sh
```

### Q: 内容长度为 0

**可能原因**: 文章已删除或链接无效

**解决方案**: 检查 URL 是否正确，尝试在浏览器中打开。

### Q: 截图显示方框

**原因**: 缺少中文字体

**解决方案**:
```bash
sudo apt-get install fonts-noto-cjk fonts-wqy-zenhei
```

---

## 代码集成

### Node.js

```javascript
const { fetchWeChatArticle } = require('./fetch_article');

const result = await fetchWeChatArticle('https://mp.weixin.qq.com/s/xxxxx');

if (result.success) {
  console.log(result.title);      // 标题
  console.log(result.author);     // 作者
  console.log(result.text);       // 正文
  console.log(result.html);       // HTML
}
```

### Python

```python
from fetch_article import fetch_wechat_article

result = fetch_wechat_article('https://mp.weixin.qq.com/s/xxxxx')

if result['success']:
    print(result['title'])    # 标题
    print(result['author'])   # 作者
    print(result['text'])     # 正文
    print(result['html'])     # HTML
```

---

## 批量处理示例

### Node.js

```javascript
const urls = [
  'https://mp.weixin.qq.com/s/xxxxx',
  'https://mp.weixin.qq.com/s/yyyyy',
  'https://mp.weixin.qq.com/s/zzzzz',
];

// 串行处理（推荐）
for (const url of urls) {
  const result = await fetchWeChatArticle(url);
  console.log(result.title);
  
  // 间隔 3 秒
  await new Promise(resolve => setTimeout(resolve, 3000));
}
```

### Python

```python
import time

urls = [
    'https://mp.weixin.qq.com/s/xxxxx',
    'https://mp.weixin.qq.com/s/yyyyy',
    'https://mp.weixin.qq.com/s/zzzzz',
]

# 串行处理（推荐）
for url in urls:
    result = fetch_wechat_article(url)
    print(result['title'])
    
    # 间隔 3 秒
    time.sleep(3)
```

---

## 注意事项

### 合规性
- ✅ 模拟真实微信浏览器
- ⚠️ 遵守微信公众平台服务协议
- ⚠️ 添加延迟，避免高频抓取

### 法律风险
- ⚠️ 抓取内容应注明来源
- ⚠️ 遵守著作权法
- ⚠️ 不用于商业盈利（除非获得授权）

### 稳定性
- ✅ 短期稳定（100% 验证）
- ⚠️ 长期稳定性待观察
- ⚠️ 建议监控成功率

---

## 更新日志

### v1.0.0 (2026-06-07)
- ✅ 初始版本
- ✅ 100% 成功率验证
- ✅ 完整的脚本和文档

---

## 支持

如有问题，请查看：
1. `SKILL.md` - 完整技术文档
2. `scripts/check_environment.sh` - 环境检查
3. `scripts/test_stability.js` - 稳定性测试

---

**测试环境**: 2.12 (Intel UHD Graphics + Vulkan 1.3.230)  
**验证结果**: 10/10 成功 ✓✓✓
