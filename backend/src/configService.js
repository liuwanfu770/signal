const fs = require('fs');
const path = require('path');

let config = null;

function loadConfig() {
  const configPath = path.join(__dirname, '../../config/config.json');
  const fileData = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(fileData);
  return config;
}

function getConfig(key, defaultValue) {
  if (!config) {
    loadConfig();
  }
  return config[key] || defaultValue;
}

// 定时刷新（可选）
setInterval(() => {
  loadConfig();
  console.log('Config reloaded');
}, 30000);

module.exports = {
  loadConfig,
  getConfig
};
