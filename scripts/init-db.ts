import { config } from 'dotenv';
import { initializeDatabase } from '../lib/db/index';

// Load environment variables
config({ path: '.env.production' });
config({ path: '.env', override: false }); // Fallback to .env if .env.production doesn't have all values

async function init() {
  try {
    console.log('Initializing database with admin user...');
    await initializeDatabase();
    console.log('✅ Database initialization completed successfully!');
    process.exit(0);
  } catch (error: unknown) {
    // If the error is just about users already existing, that's OK
    if ((error as { code?: string; message?: string })?.code === 'SQLITE_CONSTRAINT_UNIQUE' || (error as { message?: string })?.message?.includes('already exists')) {
      console.log('✅ Database initialization completed (users already exist)');
      process.exit(0);
    } else {
      console.error('❌ Database initialization failed:', error);
      process.exit(1);
    }
  }
}

init();