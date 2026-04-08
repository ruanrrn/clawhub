// copilot-proxy.ts
// 中转 GitHub Copilot，GITHUB_TOKEN 为 Personal access tokens (classic)，授权 copilot
import http from 'http';

const PORT = parseInt(process.env.PORT || '9090');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const API_KEYS = new Set(
  (process.env.API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean)
);

// 防止并发刷新 token 的锁
let tokenRefreshPromise: Promise<void> | null = null;
let copilotToken = '';
let copilotEndpoint = '';
let tokenExpiresAt = 0;

async function refreshCopilotToken() {
  const res = await fetch('https://api.github.com/copilot_internal/v2/token', {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Editor-Version': 'vscode/1.100.0',
      'Editor-Plugin-Version': 'copilot-chat/0.24.0',
    },
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  const data = await res.json() as any;
  copilotToken = data.token;
  copilotEndpoint = data.endpoints?.api || 'https://api.business.githubcopilot.com';
  tokenExpiresAt = data.expires_at * 1000;
  console.log(`[token] OK expires=${new Date(tokenExpiresAt).toLocaleTimeString()}`);
}

async function ensureToken() {
  if (copilotToken && Date.now() < tokenExpiresAt - 120_000) return;
  
  // 防止多个请求同时刷新 token
  if (tokenRefreshPromise) {
    await tokenRefreshPromise;
    return;
  }
  
  tokenRefreshPromise = refreshCopilotToken().finally(() => {
    tokenRefreshPromise = null;
  });
  await tokenRefreshPromise;
}

function upstreamHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${copilotToken}`,
    'Content-Type': 'application/json',
    'Editor-Version': 'vscode/1.100.0',
    'Copilot-Integration-Id': 'vscode-chat',
  };
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
    
    // 添加超时处理，防止挂起
    req.setTimeout(30000, () => {
      reject(new Error('Request timeout'));
    });
  });
}

// CORS 头
function setCORSHeaders(res: http.ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

const server = http.createServer(async (req, res) => {
  const url = req.url || '';
  const method = req.method || '';

  // 处理 CORS 预检请求
  if (method === 'OPTIONS') {
    setCORSHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // 设置 CORS 头（对所有响应）
  setCORSHeaders(res);

  // 鉴权
  if (API_KEYS.size > 0) {
    const key = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!API_KEYS.has(key)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden', message: 'Invalid API key' }));
      return;
    }
  }

  try {
    await ensureToken();

    // GET /v1/models
    if (method === 'GET' && url === '/v1/models') {
      const r = await fetch(`${copilotEndpoint}/models`, { headers: upstreamHeaders() });
      const body = await r.text();
      res.writeHead(r.status, { 'Content-Type': 'application/json' });
      res.end(body);
      return;
    }

    // POST /v1/chat/completions
    if (method === 'POST' && url === '/v1/chat/completions') {
      let bodyStr: string;
      try {
        bodyStr = await readBody(req);
        // 验证 JSON 格式
        JSON.parse(bodyStr);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad Request', message: 'Invalid JSON body' }));
        return;
      }

      const body = JSON.parse(bodyStr);
      const stream = body.stream === true;

      const r = await fetch(`${copilotEndpoint}/chat/completions`, {
        method: 'POST', headers: upstreamHeaders(), body: bodyStr,
      });

      if (!r.ok) {
        const text = await r.text();
        res.writeHead(r.status, { 'Content-Type': 'application/json' });
        res.end(text);
        return;
      }

      if (stream && r.body) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let isCancelled = false;
        
        req.on('close', () => {
          isCancelled = true;
          reader.cancel().catch(() => {});
        });
        
        try {
          while (!isCancelled) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(dec.decode(value, { stream: true }));
          }
        } catch (err) {
          if (!isCancelled) throw err;
        } finally {
          res.end();
        }
      } else {
        const text = await r.text();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(text);
      }
      return;
    }

    // POST /v1/embeddings
    if (method === 'POST' && url === '/v1/embeddings') {
      let bodyStr: string;
      try {
        bodyStr = await readBody(req);
        JSON.parse(bodyStr);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad Request', message: 'Invalid JSON body' }));
        return;
      }

      const r = await fetch(`${copilotEndpoint}/embeddings`, {
        method: 'POST', headers: upstreamHeaders(), body: bodyStr,
      });
      const text = await r.text();
      res.writeHead(r.status, { 'Content-Type': 'application/json' });
      res.end(text);
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found', message: `No route for ${method} ${url}` }));

  } catch (e: any) {
    console.error('[error]', e);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad Gateway', message: e.message }));
  }
});

(async () => {
  if (!GITHUB_TOKEN) { 
    console.error('[error] GITHUB_TOKEN is required'); 
    process.exit(1); 
  }
  
  try {
    await refreshCopilotToken();
    // 每 20 分钟刷新一次 token
    setInterval(() => {
      refreshCopilotToken().catch(e => console.error('[token refresh error]', e.message));
    }, 20 * 60 * 1000);
    
    server.listen(PORT, () => {
      console.log(`[proxy] http://localhost:${PORT}/v1 -> ${copilotEndpoint}`);
    });
  } catch (e) {
    console.error('[startup error]', e);
    process.exit(1);
  }
})();
