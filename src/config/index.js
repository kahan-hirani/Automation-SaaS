import development from './development.js';
import production from './production.js';

const env = process.env.NODE_ENV || 'development';

const config = {
  development,
  production
};

export default config[env];
