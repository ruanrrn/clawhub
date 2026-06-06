# Playwright DeepSeek Registration Script

Location: `/tmp/ds_register.js` (386 lines, **LOST — /tmp cleared on reboot**)

## ⚠️ REBUILD NEEDED

Script was lost when `/tmp` was cleared. Full architecture and design decisions are documented below; reconstruct from this reference.

## Architecture (v2 — simplified, no SRC-IP isolation)

> **Note**: User accepted 2.12 also being proxied (2026-06-05). SRC-IP isolation via AND rules is optional — use `🐟 漏网之鱼` directly instead of a dedicated group. Simpler and avoids the AND rule injection complexity (which was not fully verified to route traffic correctly).

```
Clash API (9090) → random alive proxy → 🐟 漏网之鱼 group
                                      ↓
                              verify exit IP (ipify + GeoIP)
                                      ↓ pass (CN exit → retry next node)
Gmail alias → chat.deepseek.com/sign_up (explicit proxy, Playwright context)
              ↑ proxy: { server: 'http://192.168.2.11:7893',
              ↑          username: 'Clash', password: '***' }
             (2.12 ds2api traffic: also goes through 🐟 漏网之鱼 — acceptable)
                                      ↓
send verification code → Gmail forwards → 163 IMAP → imaplib poll
                                      ↓
extract code → fill form → submit → screenshot
```

### If SRC-IP Isolation Is Needed Later

See `references/openclash-rule-injection.md` for AND rule injection technique. Status: injected and API-confirmed, but actual traffic routing unverified. Use `🐟 漏网之鱼-2.13` group instead of `🐟 漏网之鱼` in the flow above if re-enabled.

### Clash API Interactions (Python urllib, NOT shell curl)

Hermes terminal mangles `Bearer` auth. All Clash API calls must use Python `urllib`:

```python
import urllib.request, json, urllib.parse

AUTH = 'Bearer ruanrn'
BASE = 'http://192.168.2.11:9090'

def clash_api(path, method='GET', data=None):
    url = f'{BASE}{path}'
    req = urllib.request.Request(url, method=method)
    req.add_header('Authorization', AUTH)
    if data:
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps(data).encode()
    return json.loads(urllib.request.urlopen(req, timeout=10).read())

# Fetch alive nodes from the main catch-all group (simplified — no SRC-IP isolation)
group_name = '🐟 漏网之鱼'
proxies = clash_api('/proxies')
group = proxies['proxies'][group_name]
alive = [n for n in group['all'] if proxies['proxies'].get(n, {}).get('alive')]

# Switch to random alive node
chosen = random.choice(alive)
clash_api(f'/proxies/{urllib.parse.quote(group_name)}', method='PUT', data={'name': chosen})

# IMPORTANT: after any config change, check group isn't set to DIRECT
if group.get('now') in ('🎯 全球直连', 'DIRECT'):
    clash_api(f'/proxies/{urllib.parse.quote(group_name)}', method='PUT', data={'name': '♻️ 自动选择'})
```

**⚠️ 🇺🇸 洛杉矶美国-st8374n6 is NOT in Provider_822BE9** — it's an independent proxy, not in the subscription pool. If using SRC-IP isolation ( dédiated group), only Provider nodes are available. In the simplified flow (no isolation), it's directly accessible from `🐟 漏网之鱼`.

## Key Design Decisions

1. **Random proxy per registration** — fetch alive nodes from Clash API, pick random one, switch `🐟 漏网之鱼-2.13` group before launching browser. Wait 2s for tproxy to take effect.
2. **Exit IP verification** — after switching node, verify via `api.ipify.org` + GeoIP that exit IP is foreign. CN/HK direct exit → skip node, try next (max N retries). **Do NOT skip this step.**
3. **SRC-IP isolation via AND rules** — `AND,((DOMAIN-SUFFIX,deepseek.com),(SRC-IP-CIDR,192.168.2.13/32)),🐟 漏网之鱼-2.13`. Only 2.13's deepseek traffic is affected. ds2api on 2.12 is completely unaffected (AND rule's SRC-IP check doesn't match 2.12).
4. **Gmail plus-addressing** — `rayruan1230+dsXXXXXX@gmail.com` generates unique aliases per registration. Gmail auto-forwards to `rayruanrn@163.com`.
5. **163 IMAP polling** — embedded Python script using `imaplib` with mandatory `xatom('ID ...')` before `SELECT`. Searches `UNSEEN` messages, matches recipient, extracts 6-digit verification codes.
6. **Playwright headless Chrome** — `channel: 'chrome'` (system Chrome 146), explicit proxy via Playwright context (NOT `--proxy-server` flag), `--disable-blink-features=AutomationControlled`.
7. **Proxy auth**: `Clash:ruanrn` for HTTP/SOCKS proxy (7893/7891). REST API (9090) uses `Bearer ruanrn`. Do NOT confuse.
8. **Unified exit IP**: All subscription nodes share exit `23.148.24.117` — blocked by DeepSeek WAF. Node switching does NOT help.
7. **Clash group restore** — always switches `🐟 漫网之鱼-2.13` back to `♻️ 自动选择` on completion/failure.

## Code Review Pitfalls (Fixed)

| Bug | Symptom | Fix |
|-----|---------|-----|
| Double `encodeURIComponent` | URL encoded twice (`%25F0%25...`) | `CLASH_GROUP` already encoded at declaration; use directly |
| Double `JSON.stringify` | Clash API receives string instead of object | Pipe payload via `echo '${payload}' \| curl -d @-` |
| No proxy warm-up delay | Connection reset on first request | `await sleep(2000)` after `switchClashGroup` |
| Verification code priority | 4-digit codes returned before 6-digit | Filter 6-digit first, fallback to 4-digit |
| Vague code input selector | `input[type="text"].last()` could match wrong field | Use `input[maxlength="6"], input[maxlength="4"]` |

## Verification Code Extraction Logic

```python
codes = re.findall(r'\b\d{4,8}\b', body)
six = [c for c in codes if 100000 <= int(c) <= 999999]
four = [c for c in codes if 1000 <= int(c) <= 9999]
chosen = six[0] if six else (four[0] if four else None)
```

## Output

- Screenshots: `/tmp/ds_screenshots/` (7 checkpoints)
- Results: `/tmp/ds_accounts.json` (appended per registration)
- IMAP script: `/tmp/ds_imap.py` (generated at runtime)

**Note**: All `/tmp` files are lost on reboot. Persistent storage recommended for accounts/results.

## Lost Files

- `/tmp/ds_register.js` (386 lines) — lost, needs rebuild
- `/tmp/ds_imap.py` (46 lines) — lost, needs rebuild
- `/tmp/ds_screenshots/` — lost
- `/tmp/ds_accounts.json` — lost

## Environment Pitfalls

### Proxy Configuration on .13 (NO tproxy — must use explicit proxy)

**⚠️ CRITICAL**: .11 has **NO tproxy/redirect iptables or nftables rules**. All traffic routed through .11's gateway goes straight to the internet via NAT — Clash never sees it. **Explicit proxy is required.**

**⚠️ Chrome `--proxy-server` flag does NOT support `user:pass@host`** → use Playwright context-level proxy instead.

| `--proxy-server` value | Error | Root cause |
|------------------------|-------|------------|
| `http://Clash:Clash@...:7893` | `ERR_NO_SUPPORTED_PROXIES` | Chrome flag doesn't support `user:pass@host` format |
| `http://Clash@...:7890` | `ERR_TUNNEL_CONNECTION_FAILED` | Wrong port (use 7893 mixed) + wrong auth |
| `socks5://Clash@...:7891` | `ERR_SOCKS_CONNECTION_FAILED` | Requires `Clash:ruanrn` auth |
| (none — transparent) | ❌ No interception | No tproxy rules on .11 |
| **Playwright context proxy** | **✅ Works** | `proxy: { server: 'http://...:7893', username: 'Clash', password: '***' }` |

**Correct proxy auth**: `Clash:ruanrn` (from config `authentication: ['Clash:ruanrn']`). NOT `Clash:Clash`.

### Playwright chromium_headless_shell missing

Playwright's bundled `chromium_headless_shell-1217` may be absent even when `chromium-1217` is installed. The error is:

```
browserType.launch: Executable doesn't exist at .../chrome-headless-shell-linux64/chrome-headless-shell
```

**Fix**: Use system Chrome via `channel: 'chrome'`:

```javascript
const browser = await chromium.launch({
  headless: true,
  channel: 'chrome',  // /usr/bin/google-chrome — system Chrome 146
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', `--proxy-server=${CLASH_PROXY}`, '--ignore-certificate-errors'],
});
```

This avoids the `npx playwright install` dependency entirely. Tested with Google Chrome 146.