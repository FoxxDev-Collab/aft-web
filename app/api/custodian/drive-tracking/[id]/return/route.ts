import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { driveInventory, driveTracking, aftAuditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const trackingId = parseInt(id);
    if (isNaN(trackingId)) {
      return NextResponse.json({ error: 'Invalid tracking ID' }, { status: 400 });
    }

    const body = await request.json();
    const { returnNotes } = body;

    // Check if tracking record exists and is not already returned
    const tracking = await db()
      .select({
        id: driveTracking.id,
        driveId: driveTracking.driveId,
        userId: driveTracking.userId,
        returnedAt: driveTracking.returnedAt,
        sourceIS: driveTracking.sourceIS,
        destinationIS: driveTracking.destinationIS,
      })
      .from(driveTracking)
      .where(eq(driveTracking.id, trackingId))
      .limit(1);

    if (tracking.length === 0) {
      return NextResponse.json({ error: 'Tracking record not found' }, { status: 404 });
    }

    if (tracking[0].returnedAt) {
      return NextResponse.json({ 
        error: 'Drive has already been returned' 
      }, { status: 400 });
    }

    // Get drive info for audit log
    const drive = await db()
      .select({
        id: driveInventory.id,
        serialNumber: driveInventory.serialNumber,
      })
      .from(driveInventory)
      .where(eq(driveInventory.id, tracking[0].driveId))
      .limit(1);

    if (drive.length === 0) {
      return NextResponse.json({ error: 'Associated drive not found' }, { status: 404 });
    }

    const now = new Date();

    // Update tracking record with return information
    const updatedTracking = await db().update(driveTracking)
      .set({
        returnedAt: now,
        status: 'returned',
        returnNotes,
      })
      .where(eq(driveTracking.id, trackingId))
      .returning();

    // Update drive status back to available
    await db().update(driveInventory)
      .set({ 
        status: 'available',
        updatedAt: now 
      })
      .where(eq(driveInventory.id, tracking[0].driveId));

    // Create audit log entry
    await db().insert(aftAuditLog).values({
      requestId: 0, // No specific request for drive tracking
      userId: user.id,
      action: 'drive_returned',
      notes: `Drive ${drive[0].serialNumber} returned from user ${tracking[0].userId} after transfer from ${tracking[0].sourceIS} to ${tracking[0].destinationIS}${returnNotes ? '. Notes: ' + returnNotes : ''}`,
      createdAt: now,
    });

    const result = updatedTracking[0];

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Drive return error:', error);
    return NextResponse.json(
      { error: 'Failed to return drive' }, 
      { status: 500 }
    );
  }
}