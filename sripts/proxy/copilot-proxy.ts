// copilot-proxy.ts
// 中转GitHub Copilot，GITHUB_TOKEN为Personal access tokens (classic)，授权copilot
import http from 'http';

const PORT = parseInt(process.env.PORT || '9090');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const API_KEYS = new Set(
  (process.env.API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean)
);

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

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url || '';
  const method = req.method || '';

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
      const bodyStr = await readBody(req);
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

      if (stream) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        const reader = r.body!.getReader();
        const dec = new TextDecoder();
        req.on('close', () => reader.cancel());
        while (true) {
          const { done, value } = await reader.read();
          if (done) { res.end(); break; }
          res.write(dec.decode(value, { stream: true }));
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
      const bodyStr = await readBody(req);
      const r = await fetch(`${copilotEndpoint}/embeddings`, {
        method: 'POST', headers: upstreamHeaders(), body: bodyStr,
      });
      const text = await r.text();
      res.writeHead(r.status, { 'Content-Type': 'application/json' });
      res.end(text);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));

  } catch (e: any) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});

(async () => {
  if (!GITHUB_TOKEN) { console.error('[error] GITHUB_TOKEN is required'); process.exit(1); }
  await refreshCopilotToken();
  setInterval(() => refreshCopilotToken().catch(e => console.error('[token]', e.message)), 20 * 60 * 1000);
  server.listen(PORT, () => console.log(`[proxy] http://localhost:${PORT}/v1 → ${copilotEndpoint}`));
})();
