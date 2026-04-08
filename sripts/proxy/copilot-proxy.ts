// copilot-proxy.ts
// 中转 GitHub Copilot。
// GITHUB_TOKEN 需要是可交换 Copilot 会话令牌的 GitHub App user token（通常为 ghu_ 前缀）。
// 也可以直接提供 COPILOT_TOKEN=tid=... 形式的短期会话令牌。

declare function require(moduleName: string): unknown;

declare const process: {
  env: Record<string, string | undefined>;
  exit(code?: number): never;
};

interface CopilotTokenResponse {
  token?: string;
  expires_at?: number;
  endpoints?: {
    api?: string;
  };
}

interface SessionInfo {
  api: string;
  token: string;
  expiresAt: number;
  tokenSource: "COPILOT_TOKEN" | "GITHUB_TOKEN" | "GITHUB_TOKEN_PAT";
}

interface ChatRequestBody {
  stream?: boolean;
}

interface RequestLike {
  url?: string;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  on(event: "data", listener: (chunk: Uint8Array) => void): void;
  on(event: "end", listener: () => void): void;
  on(event: "close", listener: () => void): void;
  on(event: "error", listener: (error: Error) => void): void;
  setTimeout(timeoutMs: number, listener: () => void): void;
}

interface ResponseLike {
  setHeader(name: string, value: string): void;
  writeHead(statusCode: number, headers?: Record<string, string>): void;
  write(chunk: string): void;
  end(body?: string): void;
}

interface ServerLike {
  listen(port: number, listener: () => void): void;
}

interface HttpModule {
  createServer(
    handler: (req: RequestLike, res: ResponseLike) => void | Promise<void>,
  ): ServerLike;
}

const http = require("node:http") as HttpModule;

const PORT = Number.parseInt(process.env.PORT || "9090", 10);
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const COPILOT_TOKEN = process.env.COPILOT_TOKEN;
const COPILOT_BASE_URL =
  process.env.COPILOT_BASE_URL || "https://api.business.githubcopilot.com";
const API_KEYS = new Set(
  (process.env.API_KEYS || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean),
);
const DEBUG_TOKEN_FLOW = process.env.DEBUG_TOKEN_FLOW === "1";

let tokenRefreshPromise: Promise<void> | null = null;
let copilotToken = "";
let copilotEndpoint = "";
let tokenExpiresAt = 0;

function isUnsupportedGitHubToken(token: string | undefined): boolean {
  return (
    typeof token === "string" &&
    (token.startsWith("ghp_") || token.startsWith("github_pat_"))
  );
}

function isDirectCopilotToken(token: string | undefined): boolean {
  return typeof token === "string" && token.startsWith("tid=");
}

function getAuthorizationHeader(headers: RequestLike["headers"]): string {
  const value = headers.authorization;
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

async function refreshCopilotToken(): Promise<void> {
  if (!GITHUB_TOKEN) {
    throw new Error(
      "GITHUB_TOKEN is required unless COPILOT_TOKEN is provided",
    );
  }

  const res = await fetch("https://api.github.com/copilot_internal/v2/token", {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Editor-Version": "vscode/1.100.0",
      "Editor-Plugin-Version": "copilot-chat/0.24.0",
    },
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as CopilotTokenResponse;
  if (!data.token || !data.expires_at) {
    throw new Error("Token refresh failed: invalid response payload");
  }

  copilotToken = data.token;
  copilotEndpoint =
    data.endpoints?.api || "https://api.business.githubcopilot.com";
  tokenExpiresAt = data.expires_at * 1000;
  console.log(
    `[token] OK expires=${new Date(tokenExpiresAt).toLocaleTimeString()}`,
  );
}

async function ensureToken(): Promise<void> {
  if (copilotToken && Date.now() < tokenExpiresAt - 120_000) {
    return;
  }

  if (COPILOT_TOKEN) {
    copilotToken = COPILOT_TOKEN;
    copilotEndpoint = COPILOT_BASE_URL;
    tokenExpiresAt = Date.now() + 30 * 60 * 1000;
    return;
  }

  if (tokenRefreshPromise) {
    await tokenRefreshPromise;
    return;
  }

  tokenRefreshPromise = refreshCopilotToken().finally(() => {
    tokenRefreshPromise = null;
  });
  await tokenRefreshPromise;
}

async function getCopilotSessionInfo(): Promise<SessionInfo> {
  await ensureToken();

  return {
    api: copilotEndpoint,
    token: copilotToken,
    expiresAt: tokenExpiresAt,
    tokenSource: COPILOT_TOKEN
      ? "COPILOT_TOKEN"
      : isUnsupportedGitHubToken(GITHUB_TOKEN)
        ? "GITHUB_TOKEN_PAT"
        : "GITHUB_TOKEN",
  };
}

function upstreamHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${copilotToken}`,
    "Content-Type": "application/json",
    "Editor-Version": "vscode/1.100.0",
    "Copilot-Integration-Id": "vscode-chat",
  };
}

function readBody(req: RequestLike): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () =>
      resolve(new TextDecoder().decode(concatChunks(chunks))),
    );
    req.on("error", reject);
    req.setTimeout(30_000, () => {
      reject(new Error("Request timeout"));
    });
  });
}

function setCORSHeaders(res: ResponseLike): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const server = http.createServer(async (req, res) => {
  const url = req.url || "";
  const method = req.method || "";

  if (method === "OPTIONS") {
    setCORSHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  setCORSHeaders(res);

  if (API_KEYS.size > 0) {
    const key = getAuthorizationHeader(req.headers).replace(/^Bearer\s+/i, "");
    if (!API_KEYS.has(key)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "Forbidden", message: "Invalid API key" }),
      );
      return;
    }
  }

  try {
    await ensureToken();

    if (DEBUG_TOKEN_FLOW && method === "GET" && url === "/debug/token") {
      const info = await getCopilotSessionInfo();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(info));
      return;
    }

    if (method === "GET" && url === "/v1/models") {
      const upstreamResponse = await fetch(`${copilotEndpoint}/models`, {
        headers: upstreamHeaders(),
      });
      const responseText = await upstreamResponse.text();
      res.writeHead(upstreamResponse.status, {
        "Content-Type": "application/json",
      });
      res.end(responseText);
      return;
    }

    if (method === "POST" && url === "/v1/chat/completions") {
      let bodyStr: string;
      try {
        bodyStr = await readBody(req);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Bad Request",
            message: "Invalid JSON body",
          }),
        );
        return;
      }

      let body: ChatRequestBody;
      try {
        body = JSON.parse(bodyStr) as ChatRequestBody;
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Bad Request",
            message: "Invalid JSON body",
          }),
        );
        return;
      }

      const upstreamResponse = await fetch(
        `${copilotEndpoint}/chat/completions`,
        {
          method: "POST",
          headers: upstreamHeaders(),
          body: bodyStr,
        },
      );

      if (!upstreamResponse.ok) {
        const responseText = await upstreamResponse.text();
        res.writeHead(upstreamResponse.status, {
          "Content-Type": "application/json",
        });
        res.end(responseText);
        return;
      }

      if (body.stream && upstreamResponse.body) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });

        const reader = upstreamResponse.body.getReader();
        const decoder = new TextDecoder();
        let isCancelled = false;

        req.on("close", () => {
          isCancelled = true;
          void reader.cancel().catch(() => undefined);
        });

        try {
          while (!isCancelled) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            if (value) {
              res.write(decoder.decode(value, { stream: true }));
            }
          }
        } catch (error) {
          if (!isCancelled) {
            throw error;
          }
        } finally {
          res.end();
        }
      } else {
        const responseText = await upstreamResponse.text();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(responseText);
      }
      return;
    }

    if (method === "POST" && url === "/v1/embeddings") {
      let bodyStr: string;
      try {
        bodyStr = await readBody(req);
        JSON.parse(bodyStr);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Bad Request",
            message: "Invalid JSON body",
          }),
        );
        return;
      }

      const upstreamResponse = await fetch(`${copilotEndpoint}/embeddings`, {
        method: "POST",
        headers: upstreamHeaders(),
        body: bodyStr,
      });
      const responseText = await upstreamResponse.text();
      res.writeHead(upstreamResponse.status, {
        "Content-Type": "application/json",
      });
      res.end(responseText);
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Not Found",
        message: `No route for ${method} ${url}`,
      }),
    );
  } catch (error) {
    console.error("[error]", error);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Bad Gateway", message: getErrorMessage(error) }),
    );
  }
});

if (!GITHUB_TOKEN && !COPILOT_TOKEN) {
  console.error("[error] GITHUB_TOKEN or COPILOT_TOKEN is required");
  process.exit(1);
}

if (COPILOT_TOKEN && !isDirectCopilotToken(COPILOT_TOKEN)) {
  console.error(
    "[error] COPILOT_TOKEN must be a Copilot session token starting with tid=",
  );
  process.exit(1);
}

if (!COPILOT_TOKEN) {
  void refreshCopilotToken().catch((error: unknown) => {
    console.error("[token warmup error]", getErrorMessage(error));
  });

  setInterval(
    () => {
      void refreshCopilotToken().catch((error: unknown) => {
        console.error("[token refresh error]", getErrorMessage(error));
      });
    },
    20 * 60 * 1000,
  );
}

server.listen(PORT, () => {
  console.log(`[proxy] http://localhost:${PORT}/v1 -> ${copilotEndpoint}`);
});
