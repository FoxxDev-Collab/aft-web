import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { driveInventory, driveTracking, users } from '@/lib/db/schema';
import { eq, desc, isNull } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is media custodian or admin
    if (!user.roles?.includes('media_custodian') && user.primaryRole !== 'media_custodian' && 
        !user.roles?.includes('admin') && user.primaryRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Media Custodian access required' }, { status: 403 });
    }

    // Get all drives with their current issue status
    const drives = await db()
      .select({
        id: driveInventory.id,
        serialNumber: driveInventory.serialNumber,
        model: driveInventory.model,
        capacity: driveInventory.capacity,
        mediaController: driveInventory.mediaController,
        mediaType: driveInventory.mediaType,
        classification: driveInventory.classification,
        status: driveInventory.status,
        notes: driveInventory.notes,
        createdAt: driveInventory.createdAt,
        updatedAt: driveInventory.updatedAt,
        // Current user info if drive is issued
        issuedToFirstName: users.firstName,
        issuedToLastName: users.lastName,
        issuedToEmail: users.email,
        issuedAt: driveTracking.issuedAt,
        expectedReturnAt: driveTracking.expectedReturnAt,
      })
      .from(driveInventory)
      .leftJoin(
        driveTracking,
        eq(driveInventory.id, driveTracking.driveId)
      )
      .leftJoin(users, eq(driveTracking.userId, users.id))
      .where(isNull(driveTracking.returnedAt)) // Only show current issues, not returned ones
      .orderBy(desc(driveInventory.updatedAt));

    // Format the response to include issued user info
    const formattedDrives = drives.map(drive => ({
      ...drive,
      issuedTo: drive.issuedToFirstName && drive.issuedToLastName 
        ? `${drive.issuedToFirstName} ${drive.issuedToLastName} (${drive.issuedToEmail})`
        : null,
      issuedDate: drive.issuedAt?.toISOString(),
      expectedReturn: drive.expectedReturnAt?.toISOString(),
    }));

    return NextResponse.json(formattedDrives);
    
  } catch (error) {
    console.error('Drive inventory fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drive inventory' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is media custodian or admin
    if (!user.roles?.includes('media_custodian') && user.primaryRole !== 'media_custodian' && 
        !user.roles?.includes('admin') && user.primaryRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Media Custodian access required' }, { status: 403 });
    }

    const body = await request.json();
    const { serialNumber, model, capacity, mediaController, mediaType, classification, status, notes } = body;

    // Validate required fields
    if (!serialNumber || !model || !capacity || !mediaController || !mediaType || !classification) {
      return NextResponse.json({ 
        error: 'Missing required fields: serialNumber, model, capacity, mediaController, mediaType, classification' 
      }, { status: 400 });
    }

    // Check if serial number already exists
    const existingDrive = await db()
      .select({ id: driveInventory.id })
      .from(driveInventory)
      .where(eq(driveInventory.serialNumber, serialNumber))
      .limit(1);

    if (existingDrive.length > 0) {
      return NextResponse.json({ 
        error: 'Drive with this serial number already exists' 
      }, { status: 400 });
    }

    // Insert new drive
    const newDrive = await db().insert(driveInventory).values({
      serialNumber,
      model,
      capacity,
      mediaController,
      mediaType,
      classification,
      status: status || 'available',
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newDrive[0], { status: 201 });
    
  } catch (error) {
    console.error('Drive creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create drive' }, 
      { status: 500 }
    );
  }
}