import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import { users, UserRole } from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

let db: ReturnType<typeof drizzle>;
let initialized = false;

function getDb() {
  if (!db) {
    // Only initialize in server-side context
    if (typeof window === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { mkdirSync } = require('fs');
      
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
      db = drizzle(sqlite, { schema });
      
      // Auto-initialize database with admin user on first access
      if (!initialized) {
        initialized = true;
        initializeDatabase().catch(console.error);
      }
    }
  }
  return db;
}

export { getDb as db };

// Migration function
export async function runMigrations() {
  try {
    const database = getDb();
    await migrate(database, { migrationsFolder: './drizzle' });
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Initialize database with admin user if not exists
export async function initializeDatabase() {
  try {
    const database = getDb();
    // Check if admin user exists
    const adminUser = await database.select().from(users).where(eq(users.primaryRole, UserRole.ADMIN)).limit(1);
    
    if (adminUser.length === 0) {
      // Get admin credentials from environment variables
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@aft.gov';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const adminFirstName = process.env.ADMIN_FIRST_NAME || 'System';
      const adminLastName = process.env.ADMIN_LAST_NAME || 'Administrator';
      const adminOrganization = process.env.ADMIN_ORGANIZATION || 'AFT System';
      const adminPhone = process.env.ADMIN_PHONE || '555-0000';
      
      // Create default admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      await database.insert(users).values({
        email: adminEmail,
        password: hashedPassword,
        firstName: adminFirstName,
        lastName: adminLastName,
        primaryRole: UserRole.ADMIN,
        organization: adminOrganization,
        phone: adminPhone,
        isActive: true,
      });
      
      console.log('Default admin user created:');
      console.log(`Email: ${adminEmail}`);
      console.log('Please change the password after first login.');
    }

    // Create test users for approval roles
    const testUsers = [
      { email: 'dao@aft.gov', role: UserRole.DAO, name: 'David Anderson', title: 'Designated Authorizing Official' },
      { email: 'issm@aft.gov', role: UserRole.APPROVER, name: 'Jane Smith', title: 'Information System Security Manager' },
      { email: 'cpso@aft.gov', role: UserRole.CPSO, name: 'Robert Taylor', title: 'Contractor Program Security Officer' },
      { email: 'dta@aft.gov', role: UserRole.DTA, name: 'Mike Johnson', title: 'Data Transfer Agent' },
      { email: 'dta2@aft.gov', role: UserRole.DTA, name: 'Lisa Brown', title: 'Data Transfer Agent 2' },
      { email: 'sme@aft.gov', role: UserRole.SME, name: 'Jennifer Davis', title: 'Subject Matter Expert' },
      { email: 'custodian@aft.gov', role: UserRole.MEDIA_CUSTODIAN, name: 'Sarah Wilson', title: 'Media Custodian' }
    ];

    for (const testUser of testUsers) {
      const userCheck = await database.select().from(users).where(eq(users.email, testUser.email)).limit(1);
      
      if (userCheck.length === 0) {
        const hashedPassword = await bcrypt.hash('password123', 12);
        const [firstName, lastName] = testUser.name.split(' ');
        
        await database.insert(users).values({
          email: testUser.email,
          password: hashedPassword,
          firstName,
          lastName,
          primaryRole: testUser.role,
          organization: 'AFT System',
          phone: '555-0000',
          isActive: true,
        });
        
        console.log(`✓ Test ${testUser.title} user created: ${testUser.email}`);
      } else {
        console.log(`✓ Test ${testUser.title} user already exists: ${testUser.email}`);
      }
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Utility function to generate unique request numbers
export function generateRequestNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `AFT-${timestamp}-${random}`;
}