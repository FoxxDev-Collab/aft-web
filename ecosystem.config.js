module.exports = {
  apps: [
    {
      name: 'aft-form-web',
      script: 'npm',
      args: 'start',
      instances: 2,
      exec_mode: 'cluster',
      
      // Environment configuration
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        PM2_SERVE_PATH: '.',
        PM2_SERVE_PORT: 3000,
        PM2_SERVE_SPA: 'false',
        PM2_SERVE_HOMEPAGE: '/login'
      },
      
      // Logging configuration (PM2 logs, Winston handles app logs)
      log_file: './pm2-logs/combined.log',
      out_file: './pm2-logs/out.log',
      error_file: './pm2-logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Restart and monitoring configuration
      autorestart: true,
      watch: false, // Disable in production for performance
      max_memory_restart: '1G',
      restart_delay: 4000,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Performance optimizations
      node_args: '--max-old-space-size=2048 --optimize-for-size',
      
      // Security headers and process isolation (remove uid/gid for non-root deployment)
      // uid: 'foxx', // Only use with root PM2 deployment
      // gid: 'foxx',
      
      // Source map support for better error tracking
      source_map_support: true,
      
      // Graceful reload for zero-downtime deployments
      increment_var: 'PORT',
      
      // Custom startup script to ensure database is ready
      post_update: ['npm run build'],
      
      // Environment-specific overrides
      env_development: {
        NODE_ENV: 'development',
        watch: true,
        ignore_watch: ['node_modules', 'logs', 'pm2-logs', '.git']
      },
      
      env_staging: {
        NODE_ENV: 'staging',
        instances: 1
      },
      
      env_production: {
        NODE_ENV: 'production',
        instances: 2
      }
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'foxx',
      host: ['localhost'], // Replace with your production servers
      ref: 'origin/main',
      repo: 'https://github.com/your-repo/aft-form-web.git', // Replace with your repo
      path: '/var/www/aft-form-web',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  },
  
  // PM2 module configuration for monitoring
  module_conf: {
    // PM2 Web interface (optional)
    'pm2-server-monit': {
      port: 8042
    }
  }
};