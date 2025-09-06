import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { driveInventory, driveTracking, users } from '@/lib/db/schema';
import { eq, desc, isNull, isNotNull } from 'drizzle-orm';

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

    // Get active (not returned) drive issues
    const activeIssues = await db()
      .select({
        id: driveTracking.id,
        driveId: driveTracking.driveId,
        userId: driveTracking.userId,
        custodianId: driveTracking.custodianId,
        sourceIS: driveTracking.sourceIS,
        destinationIS: driveTracking.destinationIS,
        issuedAt: driveTracking.issuedAt,
        expectedReturnAt: driveTracking.expectedReturnAt,
        returnedAt: driveTracking.returnedAt,
        status: driveTracking.status,
        issueNotes: driveTracking.issueNotes,
        returnNotes: driveTracking.returnNotes,
        createdAt: driveTracking.createdAt,
        // Drive info
        driveSerialNumber: driveInventory.serialNumber,
        driveModel: driveInventory.model,
        driveCapacity: driveInventory.capacity,
        driveMediaController: driveInventory.mediaController,
        driveClassification: driveInventory.classification,
        // User info
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        // Custodian info (from a second join)
        custodianFirstName: users.firstName,
        custodianLastName: users.lastName,
        custodianEmail: users.email,
      })
      .from(driveTracking)
      .innerJoin(driveInventory, eq(driveTracking.driveId, driveInventory.id))
      .innerJoin(users, eq(driveTracking.userId, users.id))
      .where(isNull(driveTracking.returnedAt))
      .orderBy(desc(driveTracking.issuedAt));

    // Get completed (returned) drive issues
    const completedIssues = await db()
      .select({
        id: driveTracking.id,
        driveId: driveTracking.driveId,
        userId: driveTracking.userId,
        custodianId: driveTracking.custodianId,
        sourceIS: driveTracking.sourceIS,
        destinationIS: driveTracking.destinationIS,
        issuedAt: driveTracking.issuedAt,
        expectedReturnAt: driveTracking.expectedReturnAt,
        returnedAt: driveTracking.returnedAt,
        status: driveTracking.status,
        issueNotes: driveTracking.issueNotes,
        returnNotes: driveTracking.returnNotes,
        createdAt: driveTracking.createdAt,
        // Drive info
        driveSerialNumber: driveInventory.serialNumber,
        driveModel: driveInventory.model,
        driveCapacity: driveInventory.capacity,
        driveMediaController: driveInventory.mediaController,
        driveClassification: driveInventory.classification,
        // User info
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(driveTracking)
      .innerJoin(driveInventory, eq(driveTracking.driveId, driveInventory.id))
      .innerJoin(users, eq(driveTracking.userId, users.id))
      .where(isNotNull(driveTracking.returnedAt))
      .orderBy(desc(driveTracking.returnedAt))
      .limit(50); // Limit to recent 50 completed issues

    // Format the data for the frontend
    const formatIssue = (issue: typeof activeIssues[0]) => ({
      id: issue.id,
      driveId: issue.driveId,
      userId: issue.userId,
      custodianId: issue.custodianId,
      sourceIS: issue.sourceIS,
      destinationIS: issue.destinationIS,
      issuedAt: issue.issuedAt,
      expectedReturnAt: issue.expectedReturnAt,
      returnedAt: issue.returnedAt,
      status: issue.status,
      issueNotes: issue.issueNotes,
      returnNotes: issue.returnNotes,
      createdAt: issue.createdAt,
      drive: {
        id: issue.driveId,
        serialNumber: issue.driveSerialNumber,
        model: issue.driveModel,
        capacity: issue.driveCapacity,
        mediaController: issue.driveMediaController,
        classification: issue.driveClassification,
      },
      user: {
        firstName: issue.userFirstName,
        lastName: issue.userLastName,
        email: issue.userEmail,
      },
      custodian: {
        firstName: issue.custodianFirstName,
        lastName: issue.custodianLastName,
        email: issue.custodianEmail,
      }
    });

    // Format function for completed issues (no custodian info)
    const formatCompletedIssue = (issue: typeof completedIssues[0]) => ({
      id: issue.id,
      driveId: issue.driveId,
      userId: issue.userId,
      custodianId: issue.custodianId,
      sourceIS: issue.sourceIS,
      destinationIS: issue.destinationIS,
      issuedAt: issue.issuedAt,
      expectedReturnAt: issue.expectedReturnAt,
      returnedAt: issue.returnedAt,
      status: issue.status,
      issueNotes: issue.issueNotes,
      returnNotes: issue.returnNotes,
      createdAt: issue.createdAt,
      drive: {
        id: issue.driveId,
        serialNumber: issue.driveSerialNumber,
        model: issue.driveModel,
        capacity: issue.driveCapacity,
        mediaController: issue.driveMediaController,
        classification: issue.driveClassification,
      },
      user: {
        firstName: issue.userFirstName,
        lastName: issue.userLastName,
        email: issue.userEmail,
      },
      custodian: {
        firstName: '', 
        lastName: '', 
        email: ''
      }
    });

    return NextResponse.json({
      active: activeIssues.map(formatIssue),
      completed: completedIssues.map(formatCompletedIssue)
    });
    
  } catch (error) {
    console.error('Drive tracking fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drive tracking data' }, 
      { status: 500 }
    );
  }
}