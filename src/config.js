import fs from 'node:fs';
import path from 'node:path';

// Node.js 22.13+ supports loading .env without an external package.
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);

const number = (name, fallback, min, max) => {
  const value = process.env[name] === undefined || process.env[name] === '' ? fallback : Number(process.env[name]);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(name + ' must be an integer between ' + min + ' and ' + max);
  return value;
};
const publicUrl = process.env.PUBLIC_URL || 'http://localhost:' + (process.env.PORT || '3000');
let parsedUrl;
try { parsedUrl = new URL(publicUrl); } catch { throw new Error('PUBLIC_URL must be a valid URL'); }
if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('PUBLIC_URL must use http or https');

export const config = Object.freeze({
  port: number('PORT', 3000, 1, 65535),
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
  publicUrl: parsedUrl.origin,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicBaseUrl: (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, ''),
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-5',
  maxTokens: number('MAX_TOKENS', 12000, 256, 64000),
  dailyStepLimit: number('DAILY_STEP_LIMIT', 500, 1, 10000),
  maxSteps: number('MAX_STEPS', 120, 1, 500),
  commandTimeoutMs: number('COMMAND_TIMEOUT_MS', 60000, 1000, 300000),
  apiTimeoutMs: number('API_TIMEOUT_MS', 90000, 1000, 300000),
  cookieSecure: process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false'),
  trustProxy: process.env.TRUST_PROXY === 'true',
  isTest: process.env.NODE_ENV === 'test',
  registrationInvite: process.env.INVITE_CODE || '',
});
if (!config.anthropicApiKey) console.warn('[Quruvchi] ANTHROPIC_API_KEY yo‘q: sayt ochiladi, lekin AI chat kalit kiritilmaguncha ishlamaydi.');
if (!config.isTest && !process.env.CLAUDE_MODEL) console.warn('[Quruvchi] CLAUDE_MODEL was not set; using configured default claude-sonnet-5.');
