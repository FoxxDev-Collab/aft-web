import 'server-only';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import { users, UserRole } from './schema';
import bcrypt from 'bcryptjs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { mkdirSync } from 'fs';
import { appLogger } from '../logger';

// Database file path
const dbPath = path.join(process.cwd(), 'data', 'aft.db');

// Ensure data directory exists
try {
  mkdirSync(path.dirname(dbPath), { recursive: true });
} catch {
  // Directory might already exist, ignore error
}

// Initialize SQLite database
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

// Initialize Drizzle ORM
export const db = drizzle(sqlite, { schema });

// Migration function
export async function runMigrations() {
  try {
    appLogger.info('Starting database migrations');
    await migrate(db, { migrationsFolder: './drizzle' });
    appLogger.info('Database migrations completed successfully');
  } catch (error) {
    appLogger.error(`Database migration failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Initialize database with admin user if not exists
export async function initializeDatabase() {
  try {
    appLogger.info('Starting database initialization');
    
    // Check if admin user exists
    const adminUser = await db.select().from(users).where(eq(users.primaryRole, UserRole.ADMIN)).limit(1);
    
    if (adminUser.length === 0) {
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await db.insert(users).values({
        email: 'admin@aft.gov',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        primaryRole: UserRole.ADMIN,
        organization: 'System',
        phone: '555-0000',
        isActive: true,
      });
      
      appLogger.securityEvent('ADMIN_USER_CREATED', { 
        email: 'admin@aft.gov',
        action: 'CREATE_DEFAULT_ADMIN' 
      });
      
      console.log('Default admin user created:');
      console.log('Email: admin@aft.gov');
      console.log('Password: admin123');
      console.log('Please change the password after first login.');
    } else {
      appLogger.info('Admin user already exists, skipping creation');
    }
    
    appLogger.info('Database initialization completed successfully');
  } catch (error) {
    appLogger.error(`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Utility function to generate unique request numbers
export function generateRequestNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `AFT-${timestamp}-${random}`;
}