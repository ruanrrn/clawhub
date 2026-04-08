// copilot-proxy.ts
// 中转GitHub Copilot，GITHUB_TOKEN为Personal access tokens (classic)，授权copilot
import express from 'express';

const PORT = parseInt(process.env.PORT || '9090');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// 合法 API Key 列表：默认 key + 环境变量传入的（逗号分隔）
const API_KEYS = new Set(
  (process.env.API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean)
);

let copilotToken = '';
let copilotEndpoint = '';
let tokenExpiresAt = 0;

async function refreshCopilotToken(): Promise<void> {
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

async function ensureToken(): Promise<void> {
  if (!copilotToken || Date.now() > tokenExpiresAt - 120_000) await refreshCopilotToken();
}

function upstreamHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${copilotToken}`,
    'Content-Type': 'application/json',
    'Editor-Version': 'vscode/1.100.0',
    'Copilot-Integration-Id': 'vscode-chat',
  };
}

const app = express();
app.use(express.json({ limit: '10mb' }));

// 鉴权：请求的 Bearer key 必须在 API_KEYS 中
app.use('/v1', (req, res, next) => {
  const key = req.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
  if (!API_KEYS.has(key)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Invalid API key' });
  }
  next();
});

app.get('/v1/models', async (_req, res) => {
  try {
    await ensureToken();
    const r = await fetch(`${copilotEndpoint}/models`, { headers: upstreamHeaders() });
    res.status(r.status).json(await r.json());
  } catch (e: any) { res.status(502).json({ error: e.message }); }
});

app.post('/v1/chat/completions', async (req, res) => {
  const stream = req.body.stream === true;
  try {
    await ensureToken();
    console.log(`[req] ${req.body.model || 'gpt-4o'} stream=${stream}`);
    const r = await fetch(`${copilotEndpoint}/chat/completions`, {
      method: 'POST', headers: upstreamHeaders(), body: JSON.stringify(req.body),
    });
    if (!r.ok) return res.status(r.status).send(await r.text());
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const reader = r.body!.getReader();
      const dec = new TextDecoder();
      req.on('close', () => reader.cancel());
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        res.write(dec.decode(value, { stream: true }));
      }
    } else {
      res.json(await r.json());
    }
  } catch (e: any) { res.status(502).json({ error: e.message }); }
});

app.post('/v1/embeddings', async (req, res) => {
  try {
    await ensureToken();
    const r = await fetch(`${copilotEndpoint}/embeddings`, {
      method: 'POST', headers: upstreamHeaders(), body: JSON.stringify(req.body),
    });
    res.status(r.status).json(await r.json());
  } catch (e: any) { res.status(502).json({ error: e.message }); }
});

(async () => {
  console.log(`[proxy] Allowed API keys: ${API_KEYS.size}`);
  await refreshCopilotToken();
  setInterval(() => refreshCopilotToken().catch(e => console.error('[token]', e.message)), 20 * 60 * 1000);
  app.listen(PORT, () => console.log(`[proxy] http://localhost:${PORT}/v1 → ${copilotEndpoint}`));
})();
