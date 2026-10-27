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

// Without JWT_SECRET, db.js generates a random signing secret once and keeps it in MongoDB
// (collection appConfig), so sessions survive restarts and serverless cold starts.
if (config.jwtSecret === 'replace-with-a-long-random-string') config.jwtSecret = '';
