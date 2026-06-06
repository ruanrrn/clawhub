# Node.js fetch 兼容性注意事项

## 问题

在编写 DeepSeek 自动注册脚本时遇到 Node.js fetch API 的兼容性问题。

## 环境

- **Node.js 版本**：v18.19.0
- **问题代码**：
  ```javascript
  const fetch = (await import('node-fetch')).default;
  ```
- **错误信息**：
  ```
  Cannot find package 'node-fetch' imported from /tmp/script.js
  Did you mean to import node-fetch/index.cjs?
  ```

## 原因

Node.js 18+ 内置了原生的 `fetch` API（`globalThis.fetch`），但在某些环境下可能不可用或行为不一致。使用 `node-fetch` 包的 dynamic import 语法在 CommonJS 模块中可能失败。

## 解决方案

### 方案 1：使用原生 fetch（推荐）

```javascript
// Node.js 18+ 原生支持
const fetch = globalThis.fetch;

if (!fetch) {
  throw new Error('fetch is not available in this Node.js version');
}
```

### 方案 2：回退到 https 模块

```javascript
const fetch = globalThis.fetch || (async (url, options) => {
  const https = require('https');
  const urlParsed = new URL(url);
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: urlParsed.hostname,
      path: urlParsed.pathname + urlParsed.search,
      method: options?.method || 'GET',
      headers: options?.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          json: async () => JSON.parse(data),
          text: async () => data
        });
      });
    });
    
    req.on('error', reject);
    if (options?.body) req.write(options.body);
    req.end();
  });
});
```

### 方案 3：使用 node-fetch（需要正确导入）

```javascript
// ESM 环境
import fetch from 'node-fetch';

// CommonJS 环境（需要安装 node-fetch@2.x）
const fetch = require('node-fetch');
```

## 最佳实践

**在编写通用脚本时，优先使用原生 fetch + https 回退**：

```javascript
const https = require('https');

async function makeFetch(url, options = {}) {
  // 优先使用原生 fetch
  if (globalThis.fetch) {
    return globalThis.fetch(url, options);
  }
  
  // 回退到 https
  const urlParsed = new URL(url);
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: urlParsed.hostname,
      path: urlParsed.pathname + urlParsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          json: async () => JSON.parse(data),
          text: async () => data
        });
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}
```

## 实际应用

在 `deepseek_complete_register.js` 中的实现：

```javascript
// 使用原生 fetch (Node 18+) 或 https 回退
const fetch = globalThis.fetch || (async (url, options) => {
  const https = require('https');
  const urlParsed = new URL(url);
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: urlParsed.hostname,
      path: urlParsed.pathname + urlParsed.search,
      method: options?.method || 'GET',
      headers: options?.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          json: async () => JSON.parse(data),
          text: async () => data
        });
      });
    });
    
    req.on('error', reject);
    if (options?.body) req.write(options.body);
    req.end();
  });
});
```

## 相关问题

- 避免使用 `await import('node-fetch')` 在 CommonJS 模块中
- 避免依赖外部包（node-fetch）当原生 API 可用时
- 确保 https 回退实现与 fetch API 兼容（返回结构一致）

## 参考

- [Node.js fetch API 文档](https://nodejs.org/dist/latest-v18.x/docs/api/globals.html#fetch)
- [node-fetch GitHub](https://github.com/node-fetch/node-fetch)
