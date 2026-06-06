# DeepSeek Registration API Internals — Reverse-Engineered from main.js

## Source

`main.b2ad3fed3c.js` from `fe-static.deepseek.com` (~1.3MB minified). Hash may change on deploy.

## API Endpoints

### `POST /api/v0/users/create_guest_challenge`

Get PoW challenge for guest (unauthenticated) operations.

**Request**:
```json
{"target_path": "/v0/users/create_email_verification_code"}
```

**Response**:
```json
{
  "code": 0,
  "data": {
    "biz_code": 0,
    "biz_data": {
      "guest_challenge": {
        "algorithm": "DeepSeekHashV1",
        "challenge": "<64-char hex>",
        "salt": "<20-char hex>",
        "difficulty": 20,
        "signature": "<64-char hex>",
        "target_path": "/v0/users/create_email_verification_code",
        "expire_at": 1780759667247,
        "expire_after": 300000
      }
    }
  }
}
```

### `POST /api/v0/users/create_email_verification_code`

Send verification code to email. **Requires both PoW header and valid Turnstile token.**

**Request body**:
```json
{
  "email": "user@example.com",
  "turnstile_token": "<from Cloudflare Turnstile widget>",
  "locale": "en-US",
  "shumei_verification": {"rid": "<device_id>", "region": "overseas"},
  "hcaptcha_token": "",
  "device_id": "<uuid>",
  "scenario": "register"
}
```

**Request headers**:
- `X-DS-Guest-PoW-Response`: `base64(JSON.stringify({salt: "<salt>", answer: "<nonce>"}))`
- `Content-Type: application/json`

**Responses**:
- `biz_code: 0` — verification code sent successfully
- `biz_code: 2, biz_msg: "RECAPTCHA_VERIFY_FAILED"` — Turnstile token invalid/missing
- `422 {detail: [{loc: "body.scenario"}]}` — scenario must be `"register"`
- `422 {detail: [{loc: "body.shumei_verification.rid"}, ...]}` — shumei structure wrong
- `429` — WAF rate limit (HTML error page)
- `403` — IP blocked by WAF

## PoW Algorithm: DeepSeekHashV1

```python
import hashlib

def solve(challenge, salt, difficulty):
    """Find nonce where SHA256(challenge + salt + nonce) has `difficulty` leading zero bits."""
    target_hex = '0' * (difficulty // 4)
    nonce = 0
    while nonce < 10000000:  # usually solves within 1-3s
        h = hashlib.sha256(f"{challenge}{salt}{nonce}".encode()).hexdigest()
        if h[:len(target_hex)] == target_hex:
            # Verify exact bit count (hex boundary alignment)
            bits = bin(int(h, 16))[2:].zfill(256)
            if bits[:difficulty] == '0' * difficulty:
                return nonce
        nonce += 1
    return None  # failed
```

Difficulty 20 = 5 leading zero hex chars = ~2^20 attempts (~1M hashes, <3s on modern CPU).

## PoW Header Formats

Two formats from module 84212 (JS source):

```javascript
// Guest PoW (for unauthenticated endpoints like registration)
const guestHeader = (e, t) => [
  "X-DS-Guest-PoW-Response",
  t(JSON.stringify({salt: e.salt, answer: e.answer}))  // t = base64 encode
];

// Full PoW (for authenticated endpoints)
const fullHeader = (e, t, n) => [
  "X-DS-PoW-Response",
  n(JSON.stringify({
    algorithm: e.algorithm,
    challenge: e.challenge,
    salt: e.salt,
    answer: e.answer,
    signature: e.signature,
    target_path: t
  }))
];
```

Use **Guest** header for registration.

## Frontend↔Backend scenario Mismatch

| Context | Value | Status |
|---------|-------|--------|
| JS frontend variable | `"signUp"` | Internal use only |
| Backend API Pydantic model | `"register"` | **Required** |
| Other valid values | `"reset_password"`, `"bind_email"`, `"mobileLogin"`, `"bindForRebind"`, `"unbindForRebind"`, `"unbind_for_rebind"` | Different flows |

## Turnstile Configuration (from JS source)

```javascript
// Sitekey for registration flow
(0, eN.OB)({
  sitekey: "0x4AAAAAAA1jQEh8YFk064tz",
  tracker: T.y.tracker,
  logger: T.y.logger,
  ignoreFailed: true  // Frontend continues even if Turnstile fails
});
```

### Turnstile Flow (JS module ~offset 1038100)

1. `m()` — init with sitekey, tracker, logger, ignoreFailed
2. `g()` — create overlay (`#cf-overlay`) and widget container (`#cf-turnstile`)
3. Load `challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback`
4. `window.turnstile.render("#cf-turnstile", {sitekey, error-callback, callback})` — render widget
5. On success: `callback(token, preClearanceObtained)` — token is passed to API
6. On error: `error-callback(code)` — if `ignoreFailed`, frontend still continues (but API will reject)

### Why "Resend after 58s" is misleading

The "Send code" button triggers a **unconditional UX countdown timer** (58s) regardless of API result. The actual API call (`create_email_verification_code`) returns `RECAPTCHA_VERIFY_FAILED` almost immediately. The countdown is purely cosmetic — it does NOT mean the code was sent.

## Shumei Verification Structure

```javascript
// From offset ~165436 in main.js
shumeiVerification: {
  region: P,  // "overseas" or domestic region string
  rid: t      // device fingerprint ID from Shumei SDK
}
```

For API-only calls (no Shumei SDK), use a random UUID for `rid` and `"overseas"` for `region`. Pydantic validates the structure but doesn't verify the rid against Shumei's service.

## Client Headers

```javascript
// From offset ~1070516
{
  "x-client-platform": platform,      // e.g., "web"
  "x-client-version": version,         // app version
  "x-client-locale": locale,           // e.g., "en-US"
  "x-client-timezone-offset": offset   // timezone offset in seconds
}
```

## Domains

| Domain | Purpose |
|--------|---------|
| `chat.deepseek.com` | Main site + WAF (SSR, all APIs) |
| `fe-static.deepseek.com` | Frontend JS/CSS bundles |
| `cdn.deepseek.com` | Images, policy files, icons |
| `challenges.cloudflare.com` | Cloudflare Turnstile JS + verification |
| `apm.volccdn.com` | ByteDance APM monitoring |
| `lf3-data.volccdn.com` | ByteDance data collection |
