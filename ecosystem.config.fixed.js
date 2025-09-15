require('dotenv').config(); // QUAN TRỌNG: Load .env file trước

module.exports = {
  apps: [
    {
      name: 'iqx-backend',
      script: './node_modules/.bin/tsx',
      args: 'src/index.ts',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 2024,
        HOST: '0.0.0.0',
        // Sửa lại password đúng trong DATABASE_URL
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:Timem.2302@localhost:5432/iqx_app',
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_NAME: process.env.DB_NAME || 'iqx_app',
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'Timem.2302',
        DB_SSL: process.env.DB_SSL || false,
        JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production',
        JWT_ACCESS_EXPIRY: '15m',
        JWT_REFRESH_EXPIRY: '7d',
        CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
        CORS_CREDENTIALS: 'true',
        RATE_LIMIT_MAX: '100',
        RATE_LIMIT_TIME_WINDOW: '1 minute',
        LOG_LEVEL: 'info',
        SWAGGER_HOST: 'localhost:2024',
        SWAGGER_SCHEMES: 'http,https',
        // Thêm các biến proxy
        PROXY_IQ_TARGET: process.env.PROXY_IQ_TARGET || 'https://iq.vietcap.com.vn',
        PROXY_TRADING_TARGET: process.env.PROXY_TRADING_TARGET || 'https://trading.vietcap.com.vn',
        PROXY_AI_TARGET: process.env.PROXY_AI_TARGET || 'https://ai.vietcap.com.vn'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 2024,
        HOST: '0.0.0.0',
        LOG_LEVEL: 'debug',
        watch: true,
        ignore_watch: ['node_modules', 'dist', 'logs', '.git', 'drizzle']
      },
      error_file: './logs/iqx-backend-error.log',
      out_file: './logs/iqx-backend-out.log',
      log_file: './logs/iqx-backend-combined.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      restart_delay: 5000,
      min_uptime: '10s',
      max_restarts: 10,
      kill_timeout: 5000,

      // Performance optimizations
      node_args: '--max-old-space-size=1024',

      // Graceful shutdown
      listen_timeout: 3000,
      shutdown_with_message: true,

      // Health check
      cron_restart: '0 3 * * *', // Restart every day at 3 AM
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/iqx-backend.git',
      path: '/var/www/iqx-backend',
      'post-deploy': 'npm install && npm run db:migrate && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying to production server"'
    },
    staging: {
      user: 'deploy',
      host: 'staging.your-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-repo/iqx-backend.git',
      path: '/var/www/iqx-backend-staging',
      'post-deploy': 'npm install && npm run db:migrate && pm2 reload ecosystem.config.js --env development',
      'pre-deploy-local': 'echo "Deploying to staging server"'
    }
  }
};