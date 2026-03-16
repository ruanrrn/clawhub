/**
 * Output formatting utilities
 */

/**
 * Format latency in milliseconds
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted string
 */
function formatLatency(ms) {
  if (ms >= 5000) {
    return `>5000ms ⚠️ Timeout`;
  }
  return `${Math.round(ms)}ms`;
}

/**
 * Format a single result row
 * @param {Object} result - Test result
 * @returns {string} Formatted row
 */
function formatResultRow(result) {
  const provider = result.provider;
  const model = result.modelId;
  const latency = formatLatency(result.latency);
  const status = getStatusIcon(result.status);
  
  return `| ${provider} | ${model} | ${latency} | ${status} |`;
}

/**
 * Get status icon
 * @param {string} status - Status code
 * @returns {string} Icon
 */
function getStatusIcon(status) {
  switch (status) {
    case 'OK':
      return '✅ OK';
    case 'ERROR':
      return '❌ Error';
    case 'TIMEOUT':
      return '⚠️ Timeout';
    case 'UNEXPECTED':
      return '⚠️ Unexpected';
    default:
      return `❓ ${status}`;
  }
}

/**
 * Format error for display
 * @param {Error} error - Error object
 * @returns {string} Formatted error
 */
function formatError(error) {
  if (error.message.includes('timeout') || error.message.includes('Timeout')) {
    return 'TIMEOUT';
  }
  if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    return 'AUTH_FAILED';
  }
  if (error.message.includes('429') || error.message.includes('Rate limit')) {
    return 'RATE_LIMITED';
  }
  return 'ERROR';
}

/**
 * Format all results as a markdown table
 * @param {Array} results - Array of result objects
 * @returns {string} Markdown table
 */
function formatResults(results) {
  const header = '| Provider | Model | Latency | Status |\n|----------|-------|---------|--------|';
  
  const rows = results.map(formatResultRow);
  
  const summary = generateSummary(results);
  
  return [header, ...rows, '', summary].join('\n');
}

/**
 * Generate summary statistics
 * @param {Array} results - Array of result objects
 * @returns {string} Summary
 */
function generateSummary(results) {
  const total = results.length;
  const successful = results.filter(r => r.status === 'OK').length;
  const failed = total - successful;
  
  const latencies = results
    .filter(r => r.status === 'OK')
    .map(r => r.latency);
  
  const avgLatency = latencies.length > 0 
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;
  
  const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
  
  return `**Summary**: ${successful}/${total} successful | ` +
         `Avg: ${avgLatency}ms | Min: ${minLatency}ms | Max: ${maxLatency}ms`;
}

module.exports = {
  formatLatency,
  formatResultRow,
  formatResults,
  formatError,
  getStatusIcon,
  generateSummary
};
