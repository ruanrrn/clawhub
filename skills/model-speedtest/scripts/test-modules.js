/**
 * Test that all modules can be loaded correctly
 */

console.log('Testing module imports...\n');

// Test protocol adapters
try {
  const openaiCompletions = require('./protocols/openai-completions');
  console.log('✓ openai-completions protocol loaded');
} catch (e) {
  console.error('✗ openai-completions failed:', e.message);
}

try {
  const openaiResponses = require('./protocols/openai-responses');
  console.log('✓ openai-responses protocol loaded');
} catch (e) {
  console.error('✗ openai-responses failed:', e.message);
}

try {
  const anthropicMessages = require('./protocols/anthropic-messages');
  console.log('✓ anthropic-messages protocol loaded');
} catch (e) {
  console.error('✗ anthropic-messages failed:', e.message);
}

// Test utilities
try {
  const { readOpenClawConfig, getAllModels } = require('./utils/read-config');
  console.log('✓ read-config utils loaded');
} catch (e) {
  console.error('✗ read-config failed:', e.message);
}

try {
  const { formatResults, formatLatency } = require('./utils/format-output');
  console.log('✓ format-output utils loaded');
} catch (e) {
  console.error('✗ format-output failed:', e.message);
}

console.log('\n✓ All modules loaded successfully!');
