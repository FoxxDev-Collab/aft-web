import 'server-only';
import Database from 'better-sqlite3';
import path from 'path';
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

export { sqlite as db };

// User roles enum
export const UserRole = {
  ADMIN: 'admin',
  REQUESTOR: 'requestor',
  DAO: 'dao',
  APPROVER: 'approver',
  CPSO: 'cpso',
  DTA: 'dta',
  SME: 'sme',
  MEDIA_CUSTODIAN: 'media_custodian'
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// AFT Status enum
export const AFTStatus = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  PENDING_DAO: 'pending_dao',
  PENDING_APPROVER: 'pending_approver',
  PENDING_CPSO: 'pending_cpso',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PENDING_DTA: 'pending_dta',
  ACTIVE_TRANSFER: 'active_transfer',
  PENDING_SME_SIGNATURE: 'pending_sme_signature',
  PENDING_SME: 'pending_sme',
  PENDING_MEDIA_CUSTODIAN: 'pending_media_custodian',
  COMPLETED: 'completed',
  DISPOSED: 'disposed',
  CANCELLED: 'cancelled'
} as const;

export type AFTStatusType = typeof AFTStatus[keyof typeof AFTStatus];

// Initialize database with admin user if not exists
export async function initializeDatabase() {
  try {
    console.log('Starting database initialization');
    
    // Check if admin user exists
    const adminUser = sqlite.prepare('SELECT * FROM users WHERE primary_role = ? LIMIT 1').get(UserRole.ADMIN);
    
    if (!adminUser) {
      // Create default admin user
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const insertUser = sqlite.prepare(`
        INSERT INTO users (email, password, first_name, last_name, primary_role, organization, phone, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const now = Date.now();
      insertUser.run(
        'admin@aft.gov',
        hashedPassword,
        'System',
        'Administrator',
        UserRole.ADMIN,
        'System',
        '555-0000',
        1,
        now,
        now
      );
      
      console.log('Default admin user created:');
      console.log('Email: admin@aft.gov');
      console.log('Password: admin123');
      console.log('Please change the password after first login.');
    } else {
      console.log('Admin user already exists, skipping creation');
    }
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error(`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Utility function to generate unique request numbers
export function generateRequestNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `AFT-${timestamp}-${random}`;
}
