/**
 * Anthropic Messages Protocol Adapter
 * Used by: anthropic
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

function sendPing({ baseUrl, apiKey, model }) {
  return new Promise((resolve, reject) => {
    // Anthropic API base URL is typically https://api.anthropic.com
    // and the endpoint is /v1/messages
    const url = new URL(`${baseUrl}/v1/messages`);
    
    const data = JSON.stringify({
      model: model,
      max_tokens: 10,
      messages: [
        { role: 'user', content: 'ping' }
      ]
    });
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(data)
      }
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
          
          if (parsed.error) {
            reject(new Error(`API Error: ${parsed.error.message}`));
            return;
          }
          
          // Extract text from Anthropic Messages response
          // Response format: { content: [{ type: 'text', text: 'pong' }] }
          let text = '';
          if (parsed.content && parsed.content.length > 0) {
            const textBlock = parsed.content.find(c => c.type === 'text');
            if (textBlock) {
              text = textBlock.text || '';
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
    
    req.write(data);
    req.end();
  });
}

module.exports = { sendPing };
