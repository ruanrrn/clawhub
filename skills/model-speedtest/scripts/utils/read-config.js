/**
 * Read and parse openclaw.json configuration
 */

const fs = require('fs');
const path = require('path');

/**
 * Read openclaw.json from the specified path or default location
 * @param {string} configPath - Path to openclaw.json
 * @returns {Object} Parsed configuration
 */
function readOpenClawConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  
  const content = fs.readFileSync(configPath, 'utf8');
  
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse configuration: ${error.message}`);
  }
}

/**
 * Get all models from all providers
 * @param {Object} config - Parsed openclaw.json
 * @returns {Array} Array of model objects with provider info
 */
function getAllModels(config) {
  const models = [];
  const providers = config.models?.providers || {};
  
  for (const [providerName, providerConfig] of Object.entries(providers)) {
    const providerModels = providerConfig.models || [];
    
    for (const modelConfig of providerModels) {
      models.push({
        provider: providerName,
        providerConfig: providerConfig,
        modelId: modelConfig.id,
        modelConfig: modelConfig
      });
    }
  }
  
  return models;
}

module.exports = {
  readOpenClawConfig,
  getAllModels
};
