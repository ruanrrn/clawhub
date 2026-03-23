/**
 * OpenAI Responses Protocol Adapter
 * Used by: rightcode
 * Format: POST /responses with input array and output array
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

function parseJsonBody(body, context = 'response body') {
  const trimmed = body.trim();

  if (!trimmed) {
    throw new Error(`Empty ${context}`);
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const preview = trimmed.slice(0, 120).replace(/\s+/g, ' ');
    throw new Error(`${error.message} | Preview: ${preview}`);
  }
}

function formatApiError(error) {
  if (!error) {
    return 'Unknown API error';
  }

  if (typeof error === 'string') {
    return error;
  }

  return error.message || JSON.stringify(error);
}

function extractOutputText(parsed) {
  if (!parsed?.output || !Array.isArray(parsed.output)) {
    return '';
  }

  return parsed.output
    .flatMap((item) => Array.isArray(item?.content) ? item.content : [])
    .map((part) => part?.text || '')
    .join('')
    .trim();
}

function parseEventStream(body) {
  let latestResponse = null;
  let streamedText = '';
  let streamError = null;

  const blocks = body.split(/\r?\n\r?\n/);

  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    const data = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.replace(/^data:\s?/, ''))
      .join('\n')
      .trim();

    if (!data || data === '[DONE]') {
      continue;
    }

    const event = parseJsonBody(data, 'SSE event payload');

    if (event.error) {
      streamError = event.error;
    }

    if (event.type === 'response.output_text.delta') {
      streamedText += event.delta || '';
    }

    if (event.response) {
      latestResponse = event.response;
    }
  }

  if (streamError) {
    throw new Error(`API Error: ${formatApiError(streamError)}`);
  }

  return latestResponse
    ? { parsed: latestResponse, text: extractOutputText(latestResponse) || streamedText.trim() }
    : { parsed: { type: 'event-stream', output_text: streamedText }, text: streamedText.trim() };
}

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
          const contentType = String(res.headers['content-type'] || '');
          const isEventStream = contentType.includes('text/event-stream') || responseData.includes('\nevent:') || responseData.startsWith('event:');

          const { parsed, text } = isEventStream
            ? parseEventStream(responseData)
            : { parsed: parseJsonBody(responseData), text: '' };

          // Check for API errors
          if (parsed.error) {
            reject(new Error(`API Error: ${formatApiError(parsed.error)}`));
            return;
          }

          const outputText = text || extractOutputText(parsed);

          resolve({
            text: outputText,
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
