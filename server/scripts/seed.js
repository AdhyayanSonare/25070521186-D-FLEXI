// Resets the demo accounts and their sample data: npm run seed
import mongoose from 'mongoose';
import { connectDatabase } from '../src/db.js';
import { DEMO_ACCOUNTS, ensureDemoAccounts } from '../src/seed.js';

await connectDatabase();
await ensureDemoAccounts({ reset: true });
console.log('Demo accounts are ready:');
for (const a of DEMO_ACCOUNTS) console.log(`  ${a.label.padEnd(8)} ${a.email}  /  ${a.password}`);
await mongoose.disconnect();
