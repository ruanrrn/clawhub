const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--ignore-certificate-errors'],
  });

  const context = await browser.newContext({ locale: 'en-US' });

  // Intercept sign_up HTML response, swap region CN -> US
  await context.route('**/sign_up**', async route => {
    const response = await route.fetch();
    const contentType = response.headers()['content-type'] || '';
    if (contentType.includes('text/html')) {
      let html = await response.text();
      html = html.replace(/content="CN"/g, 'content="US"');
      await route.fulfill({ response, body: html });
    } else {
      await route.fulfill({ response });
    }
  });

  const page = await context.newPage();

  console.log('[1] Navigating to sign_up (with region injection)...');
  await page.goto('https://chat.deepseek.com/sign_up', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Verify meta tag
  const metaRegion = await page.evaluate(() => {
    const el = document.querySelector('meta[name="region"]');
    return el ? el.getAttribute('content') : 'NOT_FOUND';
  });
  console.log(`[1] Meta region after injection: ${metaRegion}`);

  // Check if email input exists
  const emailExists = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    const text = document.body.innerText;
    return {
      hasEmailInput: [...inputs].some(i => i.placeholder?.toLowerCase().includes('email')),
      hasPhoneInput: [...inputs].some(i => i.placeholder?.toLowerCase().includes('phone')),
      bodySnippet: text.substring(0, 500)
    };
  });
  console.log(`[2] Email input: ${emailExists.hasEmailInput}, Phone input: ${emailExists.hasPhoneInput}`);
  console.log(`[2] Body: ${emailExists.bodySnippet.substring(0, 300)}`);

  await page.screenshot({ path: '/tmp/ds_screenshots/injected_signup.png', fullPage: true });
  console.log('[SCREENSHOT] /tmp/ds_screenshots/injected_signup.png');

  await browser.close();
  console.log('[END]');
})();