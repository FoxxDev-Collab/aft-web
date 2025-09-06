import { db } from '../lib/db';
import { users, userRoles, driveInventory, UserRole } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    const database = db();
    // Demo users for team demo
    const userSeeds = [
      { email: 'admin@cyber.mil', firstName: 'Admin', lastName: 'User', role: UserRole.ADMIN, organization: 'Cyber Command' },
      { email: 'daniel.farrel@cyber.mil', firstName: 'Daniel', lastName: 'Farrell', role: UserRole.REQUESTOR, organization: 'Cyber Command' },
      { email: 'benji.tran@cyber.mil', firstName: 'Benji', lastName: 'Tran', role: UserRole.DTA, organization: 'Cyber Command' },
      { email: 'joel.haas@cyber.mil', firstName: 'Joel', lastName: 'Haas', role: UserRole.APPROVER, organization: 'Cyber Command' },
      { email: 'chad.quin@cyber.mil', firstName: 'Chad', lastName: 'Quin', role: UserRole.CPSO, organization: 'Cyber Command' },
      { email: 'alex.nichols@cyber.mil', firstName: 'Alex', lastName: 'Nichols', role: UserRole.SME, organization: 'Cyber Command' },
      { email: 'chris.arm@cyber.mil', firstName: 'Chris', lastName: 'Arm', role: UserRole.MEDIA_CUSTODIAN, organization: 'Cyber Command' }
    ];

    for (const userData of userSeeds) {
      // Check if user already exists
      const existingUser = await database.select().from(users).where(eq(users.email, userData.email)).limit(1);
      
      if (existingUser.length > 0) {
        console.log(`⚠️  User already exists: ${userData.email}`);
        continue;
      }

      const hashedPassword = await bcrypt.hash('apples@@22', 12);
      
      const [newUser] = await database.insert(users).values({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        primaryRole: userData.role,
        organization: userData.organization,
        password: hashedPassword,
        phone: '555-0123',
        isActive: true,
      }).returning();

      // Add primary role to user_roles table
      await database.insert(userRoles).values({
        userId: newUser.id,
        role: userData.role,
        isActive: true,
        assignedBy: newUser.id, // Self-assigned for initial setup
        createdAt: new Date(),
      });
      
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
      const existingDrive = await database.select().from(driveInventory).where(eq(driveInventory.serialNumber, driveData.serialNumber)).limit(1);
      
      if (existingDrive.length > 0) {
        console.log(`⚠️  Drive already exists: ${driveData.serialNumber}`);
        continue;
      }

      await database.insert(driveInventory).values({
        serialNumber: driveData.serialNumber,
        model: driveData.model,
        capacity: driveData.capacity,
        mediaController: driveData.mediaController,
        mediaType: driveData.mediaType,
        classification: driveData.classification,
        status: 'available',
        notes: 'Demo drive for team testing',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

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