import { db } from '../lib/db';
import bcrypt from 'bcryptjs';

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    const database = db();
    // Demo users for team demo
    const userSeeds = [
      { email: 'admin@cyber.mil', firstName: 'Admin', lastName: 'User', role: 'admin', organization: 'Cyber Command' },
      { email: 'daniel.farrel@cyber.mil', firstName: 'Daniel', lastName: 'Farrell', role: 'requestor', organization: 'Cyber Command' },
      { email: 'benji.tran@cyber.mil', firstName: 'Benji', lastName: 'Tran', role: 'dta', organization: 'Cyber Command' },
      { email: 'joel.haas@cyber.mil', firstName: 'Joel', lastName: 'Haas', role: 'approver', organization: 'Cyber Command' },
      { email: 'chad.quin@cyber.mil', firstName: 'Chad', lastName: 'Quin', role: 'cpso', organization: 'Cyber Command' },
      { email: 'alex.nichols@cyber.mil', firstName: 'Alex', lastName: 'Nichols', role: 'sme', organization: 'Cyber Command' },
      { email: 'chris.arm@cyber.mil', firstName: 'Chris', lastName: 'Arm', role: 'media_custodian', organization: 'Cyber Command' }
    ];

    for (const userData of userSeeds) {
      // Check if user already exists
      const existingUser = database.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').get(userData.email);
      
      if (existingUser) {
        console.log(`⚠️  User already exists: ${userData.email}`);
        continue;
      }

      const hashedPassword = await bcrypt.hash('apples@@22', 12);
      
      const result = database.prepare(`
        INSERT INTO users (email, firstName, lastName, primaryRole, organization, password, phone, isActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userData.email, userData.firstName, userData.lastName, userData.role, userData.organization, hashedPassword, '555-0123', 1);

      // Add primary role to user_roles table
      database.prepare(`
        INSERT INTO user_roles (userId, role, isActive, assignedBy)
        VALUES (?, ?, ?, ?)
      `).run(result.lastInsertRowid, userData.role, 1, result.lastInsertRowid);
      
      console.log(`✓ Created ${userData.role}: ${userData.email}`);
    }

    // Seed drive inventory - 2 of each media type
    const driveSeeds = [
      // CD-R drives
      { serialNumber: 'CDR-001', model: 'Sony CD-R 700MB', capacity: '700MB', mediaController: 'MC-001', mediaType: 'CD-R', classification: 'UNCLASSIFIED' },
      { serialNumber: 'CDR-002', model: 'Sony CD-R 700MB', capacity: '700MB', mediaController: 'MC-002', mediaType: 'CD-R', classification: 'UNCLASSIFIED' },
      
      // DVD-R drives
      { serialNumber: 'DVDR-001', model: 'Verbatim DVD-R 4.7GB', capacity: '4.7GB', mediaController: 'MC-003', mediaType: 'DVD-R', classification: 'UNCLASSIFIED' },
      { serialNumber: 'DVDR-002', model: 'Verbatim DVD-R 4.7GB', capacity: '4.7GB', mediaController: 'MC-004', mediaType: 'DVD-R', classification: 'UNCLASSIFIED' },
      
      // DVD-RDL drives
      { serialNumber: 'DVDRDL-001', model: 'Verbatim DVD+R DL 8.5GB', capacity: '8.5GB', mediaController: 'MC-005', mediaType: 'DVD-RDL', classification: 'UNCLASSIFIED' },
      { serialNumber: 'DVDRDL-002', model: 'Verbatim DVD+R DL 8.5GB', capacity: '8.5GB', mediaController: 'MC-006', mediaType: 'DVD-RDL', classification: 'UNCLASSIFIED' },
      
      // SSD drives
      { serialNumber: 'SSD-001', model: 'Samsung T7 Portable SSD', capacity: '1TB', mediaController: 'MC-007', mediaType: 'SSD', classification: 'UNCLASSIFIED' },
      { serialNumber: 'SSD-002', model: 'Samsung T7 Portable SSD', capacity: '1TB', mediaController: 'MC-008', mediaType: 'SSD', classification: 'UNCLASSIFIED' },
      
      // SSD-T drives (Tactical)
      { serialNumber: 'SSDT-001', model: 'IronKey D500S Tactical SSD', capacity: '500GB', mediaController: 'MC-009', mediaType: 'SSD-T', classification: 'SECRET' },
      { serialNumber: 'SSDT-002', model: 'IronKey D500S Tactical SSD', capacity: '500GB', mediaController: 'MC-010', mediaType: 'SSD-T', classification: 'SECRET' }
    ];

    for (const driveData of driveSeeds) {
      // Check if drive already exists
      const existingDrive = database.prepare('SELECT * FROM drive_inventory WHERE serialNumber = ? LIMIT 1').get(driveData.serialNumber);
      
      if (existingDrive) {
        console.log(`⚠️  Drive already exists: ${driveData.serialNumber}`);
        continue;
      }

      database.prepare(`
        INSERT INTO drive_inventory (serialNumber, model, capacity, mediaController, mediaType, classification, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(driveData.serialNumber, driveData.model, driveData.capacity, driveData.mediaController, driveData.mediaType, driveData.classification, 'available', 'Demo drive for team testing');

      console.log(`✓ Created ${driveData.mediaType} drive: ${driveData.serialNumber}`);
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log(`📊 Created ${userSeeds.length} demo users and ${driveSeeds.length} drives for team demo`);
    console.log('🔑 All users have password: apples@@22');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedDatabase };