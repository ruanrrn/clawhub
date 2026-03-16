/**
 * OpenAI Responses Protocol Adapter
 * Used by: rightcode
 * Format: POST /responses with input array and output array
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

function sendPing({ baseUrl, apiKey, model }) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/responses`);

    const data = JSON.stringify({
      model: model,
      input: [
        { role: 'user', content: 'ping' }
      ],
      max_output_tokens: 10,
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
            reject(new Error(`API Error: ${parsed.error.message || parsed.error}`));
            return;
          }

          // Extract text from OpenAI Responses response
          // Format: { output: [{ content: [{ text: 'pong' }] }] }
          let text = '';

          if (parsed.output && parsed.output.length > 0) {
            const content = parsed.output[0].content;
            if (content && content.length > 0) {
              text = content[0].text || '';
            }
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
