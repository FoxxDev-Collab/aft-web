// CLI-specific database operations (without server-only restriction)
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import { users, UserRole } from './schema';
import bcrypt from 'bcryptjs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { mkdirSync } from 'fs';

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
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Initialize database with admin user if not exists
export async function initializeDatabase() {
  try {
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
      
      console.log('Default admin user created:');
      console.log('Email: admin@aft.gov');
      console.log('Password: admin123');
      console.log('Please change the password after first login.');
    } else {
      console.log('Admin user already exists.');
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}