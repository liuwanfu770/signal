module.exports = {
  apps: [
    {
      name: 'signal-backend',
      script: 'src/index.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M'
    }
  ]
};
