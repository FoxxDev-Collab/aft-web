import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { driveInventory, driveTracking, aftAuditLog, users } from '@/lib/db/schema';
import { eq, isNull, and } from 'drizzle-orm';

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
    const { driveId, userId, sourceIS, destinationIS, expectedReturnAt, issueNotes } = body;

    // Validate required fields
    if (!driveId || !userId || !sourceIS || !destinationIS) {
      return NextResponse.json({ 
        error: 'Missing required fields: driveId, userId, sourceIS, destinationIS' 
      }, { status: 400 });
    }

    // Check if drive exists and is available
    const drive = await db()
      .select({
        id: driveInventory.id,
        serialNumber: driveInventory.serialNumber,
        status: driveInventory.status
      })
      .from(driveInventory)
      .where(eq(driveInventory.id, driveId))
      .limit(1);

    if (drive.length === 0) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 });
    }

    if (drive[0].status !== 'available') {
      return NextResponse.json({ 
        error: 'Drive is not available for issue' 
      }, { status: 400 });
    }

    // Check if drive is already issued (not returned)
    const existingIssue = await db()
      .select({ id: driveTracking.id })
      .from(driveTracking)
      .where(and(
        eq(driveTracking.driveId, driveId),
        isNull(driveTracking.returnedAt)
      ))
      .limit(1);

    if (existingIssue.length > 0) {
      return NextResponse.json({ 
        error: 'Drive is already issued and not yet returned' 
      }, { status: 400 });
    }

    const now = new Date();

    // Validate that the user exists and is active
    const targetUser = await db()
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (targetUser.length === 0) {
      return NextResponse.json({ 
        error: 'Target user not found' 
      }, { status: 400 });
    }

    if (!targetUser[0].isActive) {
      return NextResponse.json({ 
        error: 'Cannot issue drive to inactive user' 
      }, { status: 400 });
    }

    // Create tracking record
    const tracking = await db().insert(driveTracking).values({
      driveId,
      userId,
      custodianId: user.id,
      sourceIS,
      destinationIS,
      issuedAt: now,
      expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt) : null,
      status: 'issued',
      issueNotes,
      createdAt: now,
    }).returning();

    // Update drive status to issued
    await db().update(driveInventory)
      .set({ 
        status: 'issued',
        updatedAt: now 
      })
      .where(eq(driveInventory.id, driveId));

    // Create audit log entry
    await db().insert(aftAuditLog).values({
      requestId: 0, // No specific request for drive tracking
      userId: user.id,
      action: 'drive_issued',
      notes: `Drive ${drive[0].serialNumber} issued to user ${userId} for transfer from ${sourceIS} to ${destinationIS}`,
      createdAt: now,
    });

    const result = tracking[0];

    return NextResponse.json(result, { status: 201 });
    
  } catch (error) {
    console.error('Drive issue error:', error);
    return NextResponse.json(
      { error: 'Failed to issue drive' }, 
      { status: 500 }
    );
  }
}