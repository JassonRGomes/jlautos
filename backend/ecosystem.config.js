module.exports = {
  apps: [
    {
      name: 'jlautos-erp-backend',
      script: './dist/app.js',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--max-old-space-size=256',
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
        PRISMA_CLI_QUERY_ENGINE_TYPE: 'binary',
        PRISMA_CLIENT_ENGINE_TYPE: 'binary',
        PRISMA_ENGINE_PROTOCOL: 'json',
        TOKIO_WORKER_THREADS: '2',
        UV_THREADPOOL_SIZE: '2'
      }
    }
  ]
};
