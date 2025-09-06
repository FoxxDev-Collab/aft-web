import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { driveInventory, driveTracking, users } from '@/lib/db/schema';
import { eq, isNull, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get currently issued drives with user information
    const issuedDrives = await db()
      .select({
        id: driveInventory.id,
        serialNumber: driveInventory.serialNumber,
        model: driveInventory.model,
        capacity: driveInventory.capacity,
        mediaController: driveInventory.mediaController,
        mediaType: driveInventory.mediaType,
        classification: driveInventory.classification,
        // User information
        userId: users.id,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        // Tracking info
        issuedAt: driveTracking.issuedAt,
        expectedReturnAt: driveTracking.expectedReturnAt,
        sourceIS: driveTracking.sourceIS,
        destinationIS: driveTracking.destinationIS,
      })
      .from(driveInventory)
      .innerJoin(driveTracking, eq(driveInventory.id, driveTracking.driveId))
      .innerJoin(users, eq(driveTracking.userId, users.id))
      .where(isNull(driveTracking.returnedAt)) // Currently issued (not returned)
      .orderBy(desc(driveTracking.issuedAt));

    return NextResponse.json(issuedDrives);
    
  } catch (error) {
    console.error('Issued drives fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issued drives' }, 
      { status: 500 }
    );
  }
}