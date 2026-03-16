#!/usr/bin/env node

/**
 * Model Speedtest - Test API latency for different models
 * Supports dynamic protocol selection based on provider configuration
 */

const fs = require('fs');
const path = require('path');

// Import protocol adapters
const openaiCompletions = require('./protocols/openai-completions');
const openaiResponses = require('./protocols/openai-responses');
const anthropicMessages = require('./protocols/anthropic-messages');

// Import utilities
const { readOpenClawConfig } = require('./utils/read-config');
const { formatResults, formatError } = require('./utils/format-output');

const CONFIG_PATH = path.join(process.env.HOME, '.openclaw', 'openclaw.json');

// Protocol mapping
const PROTOCOL_ADAPTERS = {
  'openai-completions': openaiCompletions,
  'openai-responses': openaiResponses,
  'anthropic-messages': anthropicMessages
};

async function testModel(providerName, providerConfig, modelId, modelConfig) {
  const startTime = Date.now();

  try {
    // Get API type from provider config
    const apiType = providerConfig.api || 'openai-completions';

    // Select protocol adapter dynamically
    const adapter = PROTOCOL_ADAPTERS[apiType];
    if (!adapter) {
      throw new Error(`Unsupported API type: ${apiType}`);
    }

    // Send ping request
    const result = await adapter.sendPing({
      baseUrl: providerConfig.baseUrl,
      apiKey: providerConfig.apiKey,
      model: modelId
    });

    const latency = Date.now() - startTime;

    // Verify response
    const responseText = result.text?.trim().toLowerCase();

    // Status logic:
    // - OK: Contains 'pong' (case-insensitive)
    // - Non-pong: Has response but doesn't contain 'pong' (e.g., reasoning models)
    // - Empty: Empty response
    let status;
    if (responseText.includes('pong')) {
      status = 'OK';
    } else if (result.text && result.text.trim().length > 0) {
      status = 'NON-PONG';
    } else {
      status = 'EMPTY';
    }

    return {
      provider: providerName,
      model: modelId,
      apiType: apiType,
      latency,
      status: status,
      response: result.text?.trim() || '',
      error: null
    };

  } catch (error) {
    const latency = Date.now() - startTime;

    // Parse error messages
    let errorType = 'ERROR';
    let errorMessage = formatError(error);

    // Try to extract more details from error
    if (error.message.includes('API Error') || error.message.includes('Parse error')) {
      errorMessage = error.message;
    }

    // Detect specific error types
    if (errorMessage.includes('Timeout')) {
      errorType = 'TIMEOUT';
      errorMessage = '>5000ms Timeout';
    } else if (errorMessage.includes('1302') || errorMessage.includes('速率限制')) {
      errorType = 'RATE_LIMIT';
      errorMessage = 'Rate limited';
    } else if (errorMessage.includes('无效的API Key') || errorMessage.includes('Invalid API key')) {
      errorType = 'AUTH_FAILED';
      errorMessage = 'Invalid API key';
    } else if (errorMessage.includes('API Error')) {
      errorType = 'API_ERROR';
    }

    return {
      provider: providerName,
      model: modelId,
      apiType: providerConfig.api || 'openai-completions',
      latency,
      status: errorType,
      response: '',
      error: errorMessage
    };
  }
}

async function main() {
  console.log('🔍 Model Speedtest\n');
  console.log('Reading configuration...');

  // Read openclaw.json
  let config;
  try {
    config = readOpenClawConfig(CONFIG_PATH);
  } catch (error) {
    console.error(`❌ Failed to read config: ${error.message}`);
    console.error(`   Path: ${CONFIG_PATH}`);
    process.exit(1);
  }

  const providers = config.models?.providers || {};
  const providerNames = Object.keys(providers);

  console.log(`Found ${providerNames.length} providers: ${providerNames.join(', ')}\n`);

  // Show protocol information
  console.log('📋 Protocols detected:\n');
  for (const [providerName, providerConfig] of Object.entries(providers)) {
    const apiType = providerConfig.api || 'openai-completions';
    const models = providerConfig.models?.length || 0;
    console.log(`  ${providerName}: ${apiType} (${models} models)`);
  }
  console.log('');

  // Collect all model tests
  const tests = [];
  const testsByProvider = {};

  for (const [providerName, providerConfig] of Object.entries(providers)) {
    const models = providerConfig.models || [];
    testsByProvider[providerName] = [];

    for (const modelConfig of models) {
      const modelId = modelConfig.id;
      const test = testModel(providerName, providerConfig, modelId, modelConfig);
      tests.push(test);
      testsByProvider[providerName].push(test);
    }
  }

  console.log(`\nTesting ${tests.length} models...\n`);

  // Run all tests
  const results = await Promise.all(tests);

  // Display results grouped by provider
  console.log('\n' + '='.repeat(80));
  console.log('RESULTS BY PROVIDER');
  console.log('='.repeat(80) + '\n');

  for (const [providerName, providerTests] of Object.entries(testsByProvider)) {
    const providerResults = await Promise.all(providerTests);

    const apiType = providerResults[0]?.apiType || 'unknown';

    console.log(`\n## ${providerName.toUpperCase()} (${apiType})\n`);

    console.log('| Model | Latency | Status | Details |');
    console.log('|-------|---------|--------|---------|');

    for (const result of providerResults) {
      // Format status with emoji
      let statusDisplay;
      switch (result.status) {
        case 'OK':
          statusDisplay = '✅ OK';
          break;
        case 'NON-PONG':
          statusDisplay = '⚠️ Non-pong';
          break;
        case 'EMPTY':
          statusDisplay = '⚪ Empty';
          break;
        case 'TIMEOUT':
          statusDisplay = '⏱️ Timeout';
          break;
        case 'RATE_LIMIT':
          statusDisplay = '🚫 Rate limit';
          break;
        case 'AUTH_FAILED':
          statusDisplay = '🔑 Auth failed';
          break;
        case 'API_ERROR':
          statusDisplay = '❌ API error';
          break;
        default:
          statusDisplay = '❌ Error';
      }

      // Format details (truncate if too long)
      let details = result.response || result.error || '';
      if (details.length > 50) {
        details = details.substring(0, 47) + '...';
      }

      console.log(`| ${result.model} | ${result.latency}ms | ${statusDisplay} | ${details} |`);
    }
  }

  // Overall summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');

  const total = results.length;
  const ok = results.filter(r => r.status === 'OK').length;
  const responsive = results.filter(r => ['OK', 'NON-PONG', 'EMPTY'].includes(r.status)).length;
  const errors = results.filter(r => !['OK', 'NON-PONG', 'EMPTY'].includes(r.status)).length;

  const successfulResults = results.filter(r => r.status === 'OK');
  const avgLatency = successfulResults.length > 0
    ? Math.round(successfulResults.reduce((sum, r) => sum + r.latency, 0) / successfulResults.length)
    : 0;

  const minLatency = successfulResults.length > 0
    ? Math.min(...successfulResults.map(r => r.latency))
    : 0;

  const maxLatency = successfulResults.length > 0
    ? Math.max(...successfulResults.map(r => r.latency))
    : 0;

  console.log(`Total models tested: ${total}`);
  console.log(`Perfect pong (✅ OK): ${ok}/${total}`);
  console.log(`Responsive (including non-pong): ${responsive}/${total}`);
  console.log(`Failed: ${errors}/${total}`);
  console.log(`\nLatency (for successful pongs):`);
  console.log(`  Average: ${avgLatency}ms`);
  console.log(`  Min: ${minLatency}ms`);
  console.log(`  Max: ${maxLatency}ms`);

  // Provider breakdown
  console.log('\n--- Provider Breakdown ---\n');
  for (const [providerName, providerTests] of Object.entries(testsByProvider)) {
    const providerResults = await Promise.all(providerTests);
    const providerOk = providerResults.filter(r => r.status === 'OK').length;
    const providerResponsive = providerResults.filter(r => ['OK', 'NON-PONG', 'EMPTY'].includes(r.status)).length;
    const apiType = providerResults[0]?.apiType || 'unknown';

    console.log(`${providerName} (${apiType}): ${providerOk}/${providerResults.length} pong | ${providerResponsive}/${providerResults.length} responsive`);
  }

  // All models sorted by latency (including failed models)
  console.log('\n' + '='.repeat(80));
  console.log('ALL MODELS SORTED BY LATENCY');
  console.log('='.repeat(80) + '\n');

  // Sort all models by latency (including failed ones)
  const sortedByLatency = results.sort((a, b) => a.latency - b.latency);

  console.log('| Rank | Model | Provider | Latency | Status | Reason |');
  console.log('|------|-------|----------|---------|--------|---------|');

  sortedByLatency.forEach((result, index) => {
    // Format status with emoji
    let statusDisplay;
    let reasonDisplay = '';

    switch (result.status) {
      case 'OK':
        statusDisplay = '✅ OK';
        reasonDisplay = 'Perfect pong';
        break;
      case 'NON-PONG':
        statusDisplay = '⚠️ Non-pong';
        reasonDisplay = 'Responsive but not pong';
        break;
      case 'EMPTY':
        statusDisplay = '⚪ Empty';
        reasonDisplay = 'Empty response';
        break;
      case 'TIMEOUT':
        statusDisplay = '⏱️ Timeout';
        reasonDisplay = result.error || '>5000ms timeout';
        break;
      case 'RATE_LIMIT':
        statusDisplay = '🚫 Rate limit';
        reasonDisplay = result.error || 'Rate limited';
        break;
      case 'AUTH_FAILED':
        statusDisplay = '🔑 Auth failed';
        reasonDisplay = result.error || 'Invalid API key';
        break;
      case 'API_ERROR':
        statusDisplay = '❌ API error';
        reasonDisplay = result.error || 'API returned error';
        break;
      default:
        statusDisplay = '❌ Error';
        reasonDisplay = result.error || 'Unknown error';
    }

    // Truncate reason if too long
    if (reasonDisplay.length > 30) {
      reasonDisplay = reasonDisplay.substring(0, 27) + '...';
    }

    console.log(`| ${index + 1} | ${result.model} | ${result.provider} | ${result.latency}ms | ${statusDisplay} | ${reasonDisplay} |`);
  });

  // Separate successful from failed for stats
  const successful = sortedByLatency.filter(r => ['OK', 'NON-PONG', 'EMPTY'].includes(r.status));
  const failed = sortedByLatency.filter(r => !['OK', 'NON-PONG', 'EMPTY'].includes(r.status));

  // Fastest and slowest (among successful)
  if (successful.length > 0) {
    const fastest = successful[0];
    const slowest = successful[successful.length - 1];

    console.log(`\n🏆 Fastest (responsive): ${fastest.model} (${fastest.provider}) - ${fastest.latency}ms`);
    console.log(`🐌 Slowest (responsive): ${slowest.model} (${slowest.provider}) - ${slowest.latency}ms`);
  }

  // Failed models summary
  if (failed.length > 0) {
    console.log(`\n❌ Failed models: ${failed.length}`);
    failed.forEach(model => {
      console.log(`  - ${model.model} (${model.provider}): ${model.error || model.status}`);
    });
  }
}

// Run main
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
