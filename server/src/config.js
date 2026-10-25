import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  isProd,
  port: Number(process.env.PORT) || 5050,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
  mongoDb: process.env.MONGODB_DB || 'human_atlas_studio',
  jwtSecret: process.env.JWT_SECRET || '',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3016',
  ncbiApiKey: process.env.NCBI_API_KEY || '',
  ncbiEmail: process.env.NCBI_EMAIL || '',
  // Creates the demo student and admin accounts on start. Turn off for any public deployment.
  seedDemo: (process.env.SEED_DEMO_ACCOUNTS ?? 'true').toLowerCase() !== 'false',
};

if (!config.jwtSecret || config.jwtSecret === 'replace-with-a-long-random-string') {
  if (isProd) {
    console.error('JWT_SECRET must be set in production. Refusing to start.');
    process.exit(1);
  }
  // Development fallback: a random per-process secret (logins reset when the server restarts).
  const { randomBytes } = await import('node:crypto');
  config.jwtSecret = randomBytes(48).toString('hex');
  console.warn('[config] JWT_SECRET is not set; using a temporary secret. Set it in server/.env.');
}
