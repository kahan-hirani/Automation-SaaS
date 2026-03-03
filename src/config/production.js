export default {
  env: 'production',
  port: process.env.PORT || 3000,
  
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT) || 6379
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '1h'
  },
  
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.EMAIL_FROM
  },
  
  logging: {
    level: 'info'
  },
  
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100
  }
};
