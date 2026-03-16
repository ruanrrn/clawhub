/**
 * OpenAI Completions Protocol Adapter
 * Used by: bigmodel, ark
 * Supports both regular models and reasoning models (GLM series)
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

function sendPing({ baseUrl, apiKey, model }) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/chat/completions`);

    const data = JSON.stringify({
      model: model,
      messages: [
        { role: 'user', content: 'ping' }
      ],
      max_tokens: 10,
      temperature: 0
    });

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 5000
    };

    const client = url.protocol === 'https:' ? https : http;

    const req = client.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);

          // Check for API errors
          if (parsed.error) {
            const errorCode = parsed.error.code || 'UNKNOWN';
            const errorMsg = parsed.error.message || JSON.stringify(parsed.error);
            reject(new Error(`API Error (${errorCode}): ${errorMsg}`));
            return;
          }

          // Extract text from OpenAI Completions response
          // Supports both regular models and reasoning models
          const message = parsed.choices?.[0]?.message;
          let text = '';

          if (message) {
            // For reasoning models (GLM series), check reasoning_content first
            text = message.reasoning_content || message.content || '';
          }

          resolve({
            text: text.trim(),
            raw: parsed
          });
        } catch (error) {
          reject(new Error(`Parse error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout after 5s'));
    });

    req.write(data);
    req.end();
  });
}

module.exports = { sendPing };
