# DeepSeek Region Determination — Reverse-Engineered (2026-06-06)

## Summary

Region is determined **server-side** by Huawei Cloud WAF via GeoIP. No client-side GeoIP API calls exist. The frontend only reads meta tags injected during SSR.

## Infrastructure Chain

```
Client → DNS: chat.deepseek.com
       → CNAME: *.vip1.huaweicloudwaf.com
       → A: 116.205.40.113 / 116.205.40.114 (China Mobile IPs)
       → HTTPS: Huawei Cloud WAF (server: CW)
       → WAF GeoIP lookup on client real IP
       → SSR: injects <meta> tags into HTML
       → Client receives HTML with region info baked in
```

## SSR Meta Tag Injection

WAF injects into `<head>`:
```html
<meta name="google" content="notranslate">
<meta name="ip" content="117.154.102.190">
<meta name="region" content="CN">
```

- `ip`: the client's real IP as seen by WAF
- `region`: 2-letter country code from GeoIP (`CN`, `US`, `HK`, etc.)

## Frontend JS Logic

### Config (default values, from `main.*.js`)
```javascript
ip: { syncIpFromHtml: true, ipApiUrl: null }
```
- `syncIpFromHtml: true` — reads region from meta tags
- `ipApiUrl: null` — API-based IP check is **disabled** (no client-side GeoIP fallback)

### Redux Store
Meta tag values → `ip` and `region` fields in Redux store. `isIpLoading` tracks loading state.

### `useIsMainlandChina()` hook (variable `eR`)
```javascript
let eR = I && M
  ? "CN"===M ? ()=>true : ()=>false
  : ()=>{
      let e = ef(e=>e.region);
      return !!(ef(e=>e.isIpLoading) || null===e) || "CN"===e
    };
```

Logic:
- If debug mock (`M`) set: use mock directly
- If `region === null` or `isIpLoading === true`: treat as mainland (show phone form as safe default)
- If `region === "CN"`: mainland → phone form
- Otherwise: oversea → email form

### Component Rendering (variable `t$`)
```javascript
function t$(e) {
  let { isMainlandChina: l } = eO();
  return (
    <div className="ds-auth-form-wrapper ds-sign-up-form-wrapper">
      {t, n ? <LoadingSpinner/> : l
        ? <PhoneSignUpForm regionCode={r} .../>   // tY component
        : <EmailSignUpForm regionCode={r} .../>   // tZ component
      }
    </div>
  );
}
```

The key ternary: `l ? <tY/> : <tZ/>` — mainland China gets phone form, everything else gets email form.

### i18n Keys
- `mainlandSignUpWaysTip`: "Only phone number registration is supported in your region."
- `overseaSignUpWaysTip`: (overseas version, shown in email form variant)

## Domains Involved

| Domain | Purpose | IP / CDN |
|--------|---------|----------|
| `chat.deepseek.com` | Main site + WAF (SSR) | `116.205.40.113/114` via CNAME `*.vip1.huaweicloudwaf.com` |
| `fe-static.deepseek.com` | Frontend JS/CSS bundle | CDN (static assets) |
| `cdn.deepseek.com` | Images, policy files, icons | CDN |
| `apm.volccdn.com` | ByteDance APM monitoring | Volcengine CDN |
| `lf3-data.volccdn.com` | ByteDance data collection SDK | Volcengine CDN |

No third-party GeoIP services (no ipinfo.io, no maxmind, no cloudflare geo calls from frontend).

## How to Verify Region

### Via curl (check SSR HTML)
```bash
curl -s "https://chat.deepseek.com/sign_up" | grep 'meta name="region"'
# Output: <meta name="region" content="CN">
```

### Via Playwright
```javascript
await page.goto('https://chat.deepseek.com/sign_up');
const metaRegion = await page.locator('meta[name="region"]').getAttribute('content');
if (metaRegion === 'CN') throw new Error('Phone-only form');
```

### WAF Response Headers
- `server: CW` (Huawei Cloud WAF)
- `set-cookie: HWWAFSESID=...; HWWAFSESTIME=...` (WAF session cookies)
- Rate limit: HTTP 429 with `block-event-id` header
- IP block: HTTP 403 (CloudFront error page)

## Discovery Method

1. Navigated to sign_up page via Hermes browser → observed phone-only form
2. Fetched HTML via curl → found `<meta name="region" content="CN">` in `<head>`
3. Downloaded `main.b2ad3fed3c.js` (1.3MB minified) from `fe-static.deepseek.com`
4. Searched for `region`, `isMainlandChina`, `meta`, `querySelector` patterns
5. Traced: meta tag → Redux store → `useIsMainlandChina()` hook → component ternary
6. Found `ipApiUrl: null` confirming no client-side GeoIP calls

## Region Injection — Bypass Without Proxy

Since region is purely SSR meta injection, and the React app reads it only at init time, we can **intercept the HTML response and swap the meta tag** before the browser renders it. This eliminates the need for a non-CN proxy entirely.

### Playwright Implementation

```javascript
const context = await browser.newContext({ locale: 'en-US' });

// Intercept sign_up HTML, swap region CN -> US
await context.route('**/sign_up**', async route => {
  const response = await route.fetch();
  const ct = response.headers()['content-type'] || '';
  if (ct.includes('text/html')) {
    let html = await response.text();
    html = html.replace(/content="CN"/g, 'content="US"');
    await route.fulfill({ response, body: html });
  } else {
    await route.fulfill({ response });
  }
});
```

### Verification

```javascript
await page.goto('https://chat.deepseek.com/sign_up', { waitUntil: 'networkidle' });
const metaRegion = await page.evaluate(() => {
  const el = document.querySelector('meta[name="region"]');
  return el ? el.getAttribute('content') : 'NOT_FOUND';
});
// metaRegion should be "US" — email form will render
```

### Why This Works

The entire region→form decision chain is:
```
WAF GeoIP → <meta region> → Redux store → useIsMainlandChina() → phone/email form
```

By intercepting at the HTML level (step 2), we control every downstream step. The API calls (`create_email_verification_code`, etc.) use the same locale/region context from the Redux store, so the backend treats the request as overseas.

### Current Blocker (Updated 2026-06-06)

Region injection successfully shows the email form and allows form filling. However, the registration flow has **3 independent verification layers**:

1. **WAF GeoIP** — ✅ bypassed via region injection
2. **PoW Challenge** — ✅ solvable via SHA-256 (DeepSeekHashV1), ~1-3s
3. **Cloudflare Turnstile** — ❌ widget refuses to render in any virtual display (Xvfb, headless, headful+GPU). The "Resend after 58s" countdown is a frontend-only timer; the API returns `RECAPTCHA_VERIFY_FAILED` immediately. Stealth plugins don't help.

Full API details and Turnstile internals: see `references/api-internals.md`.
