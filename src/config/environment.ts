import { config } from 'dotenv';
import { existsSync } from 'node:fs';
config({ path: existsSync('.env') ? '.env' : 'config/.env', quiet: true });
export const corsOrigins = () => (process.env.CORS_ORIGINS || 'http://localhost:5500').split(',').map(x => x.trim()).filter(Boolean);
export function validateEnvironment() {
  if (!process.env.DB_URL?.startsWith('mongodb')) throw new Error('DB_URL must be a MongoDB connection string');
  const secrets = ['ACCESS_TOKEN_USER', 'ACCESS_TOKEN_ADMIN', 'REFRESH_TOKEN_USER', 'REFRESH_TOKEN_ADMIN'].map(key => {
    const value = process.env[key];
    if (!value || value.length < 32) throw new Error(key + ' must contain at least 32 characters');
    return value;
  });
  if (new Set(secrets).size !== secrets.length) throw new Error('Token secrets must all be different');
  if (!process.env.BEARER_USER || !process.env.BEARER_ADMIN || process.env.BEARER_USER === process.env.BEARER_ADMIN) throw new Error('Set distinct authorization prefixes');
  const port = Number(process.env.PORT || 5000), rounds = Number(process.env.SALT_ROUND || 12);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  if (!Number.isInteger(rounds) || rounds < 4 || rounds > 14) throw new Error('SALT_ROUND must be between 4 and 14');
}
