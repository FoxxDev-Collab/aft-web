import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

let db: Database.Database;
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
      db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
      
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

// Create database tables
export function createTables() {
  const database = getDb();
  
  // Create users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      primaryRole TEXT NOT NULL,
      organization TEXT,
      phone TEXT,
      isActive BOOLEAN DEFAULT true,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create user_roles table
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      role TEXT NOT NULL,
      isActive BOOLEAN DEFAULT true,
      assignedBy INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (assignedBy) REFERENCES users(id)
    )
  `);
  
  // Create aft_requests table
  database.exec(`
    CREATE TABLE IF NOT EXISTS aft_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestNumber TEXT UNIQUE NOT NULL,
      requestorId INTEGER NOT NULL,
      requestorName TEXT NOT NULL,
      requestorOrg TEXT NOT NULL,
      requestorPhone TEXT NOT NULL,
      requestorEmail TEXT NOT NULL,
      transferPurpose TEXT NOT NULL,
      transferType TEXT NOT NULL,
      classification TEXT NOT NULL,
      dataDescription TEXT NOT NULL,
      sourceSystem TEXT,
      destSystem TEXT,
      destLocation TEXT,
      dataFormat TEXT,
      encryption TEXT,
      transferMethod TEXT,
      requestedStartDate TEXT,
      status TEXT DEFAULT 'draft',
      rejectionReason TEXT,
      signatures TEXT DEFAULT '{}',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requestorId) REFERENCES users(id)
    )
  `);
  
  // Create drive_inventory table
  database.exec(`
    CREATE TABLE IF NOT EXISTS drive_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serialNumber TEXT UNIQUE NOT NULL,
      model TEXT NOT NULL,
      capacity TEXT NOT NULL,
      mediaController TEXT UNIQUE NOT NULL,
      mediaType TEXT NOT NULL,
      classification TEXT NOT NULL,
      status TEXT DEFAULT 'available',
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create drive_tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS drive_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driveId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      issuedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      expectedReturnAt DATETIME,
      returnedAt DATETIME,
      sourceIS TEXT,
      destinationIS TEXT,
      mediaType TEXT,
      notes TEXT,
      FOREIGN KEY (driveId) REFERENCES drive_inventory(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
  
  console.log('Database tables created successfully');
}

// Initialize database with admin user if not exists
export async function initializeDatabase() {
  try {
    const database = getDb();
    
    // Create tables first
    createTables();
    
    // Check if admin user exists
    const adminUser = database.prepare('SELECT * FROM users WHERE primaryRole = ? LIMIT 1').get('admin');
    
    if (!adminUser) {
      // Get admin credentials from environment variables
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@aft.gov';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const adminFirstName = process.env.ADMIN_FIRST_NAME || 'System';
      const adminLastName = process.env.ADMIN_LAST_NAME || 'Administrator';
      const adminOrganization = process.env.ADMIN_ORGANIZATION || 'AFT System';
      const adminPhone = process.env.ADMIN_PHONE || '555-0000';
      
      // Create default admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      database.prepare(`
        INSERT INTO users (email, password, firstName, lastName, primaryRole, organization, phone, isActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(adminEmail, hashedPassword, adminFirstName, adminLastName, 'admin', adminOrganization, adminPhone, 1);
      
      console.log('Default admin user created:');
      console.log(`Email: ${adminEmail}`);
      console.log('Please change the password after first login.');
    }

    // Create test users for approval roles
    const testUsers = [
      { email: 'dao@aft.gov', role: 'dao', name: 'David Anderson', title: 'Designated Authorizing Official' },
      { email: 'issm@aft.gov', role: 'approver', name: 'Jane Smith', title: 'Information System Security Manager' },
      { email: 'cpso@aft.gov', role: 'cpso', name: 'Robert Taylor', title: 'Contractor Program Security Officer' },
      { email: 'dta@aft.gov', role: 'dta', name: 'Mike Johnson', title: 'Data Transfer Agent' },
      { email: 'dta2@aft.gov', role: 'dta', name: 'Lisa Brown', title: 'Data Transfer Agent 2' },
      { email: 'sme@aft.gov', role: 'sme', name: 'Jennifer Davis', title: 'Subject Matter Expert' },
      { email: 'custodian@aft.gov', role: 'media_custodian', name: 'Sarah Wilson', title: 'Media Custodian' }
    ];

    for (const testUser of testUsers) {
      const userCheck = database.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').get(testUser.email);
      
      if (!userCheck) {
        const hashedPassword = await bcrypt.hash('password123', 12);
        const [firstName, lastName] = testUser.name.split(' ');
        
        database.prepare(`
          INSERT INTO users (email, password, firstName, lastName, primaryRole, organization, phone, isActive)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(testUser.email, hashedPassword, firstName, lastName, testUser.role, 'AFT System', '555-0000', 1);
        
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