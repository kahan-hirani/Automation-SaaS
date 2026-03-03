export default {
  env: 'development',
  port: process.env.PORT || 3000,
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'automation_saas_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_key',
    expiresIn: '24h'
  },
  
  email: {
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: process.env.ETHEREAL_USER,
      pass: process.env.ETHEREAL_PASS
    },
    from: '"Automation SaaS Dev" <dev@automation-saas.com>'
  },
  
  logging: {
    level: 'debug'
  },
  
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 1000 // Higher limit for development
  }
};
