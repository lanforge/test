import { cleanEnv, str, port, url } from 'envalid';
import dotenv from 'dotenv';
dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: port({ default: 5000 }),
  MONGODB_URI: str(),
  JWT_SECRET: str(),
  JWT_REFRESH_SECRET: str(),
  FRONTEND_URL: url({ default: 'http://localhost:3000' }),
  ALLOWED_ORIGINS: str({ default: '' }),
});
