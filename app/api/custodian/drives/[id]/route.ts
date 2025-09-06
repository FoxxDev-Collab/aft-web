import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { driveInventory, driveTracking } from '@/lib/db/schema';
import { eq, isNull, and } from 'drizzle-orm';

export async function PUT(
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
    const driveId = parseInt(id);
    if (isNaN(driveId)) {
      return NextResponse.json({ error: 'Invalid drive ID' }, { status: 400 });
    }

    const body = await request.json();
    const { serialNumber, model, capacity, mediaController, mediaType, classification, status, notes } = body;

    // Validate required fields
    if (!serialNumber || !model || !capacity || !mediaController || !mediaType || !classification) {
      return NextResponse.json({ 
        error: 'Missing required fields: serialNumber, model, capacity, mediaController, mediaType, classification' 
      }, { status: 400 });
    }

    // Check if drive exists
    const existingDrive = await db()
      .select({ id: driveInventory.id, serialNumber: driveInventory.serialNumber })
      .from(driveInventory)
      .where(eq(driveInventory.id, driveId))
      .limit(1);

    if (existingDrive.length === 0) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 });
    }

    // Check if serial number is being changed and if it conflicts with another drive
    if (existingDrive[0].serialNumber !== serialNumber) {
      const conflictingDrive = await db()
        .select({ id: driveInventory.id })
        .from(driveInventory)
        .where(eq(driveInventory.serialNumber, serialNumber))
        .limit(1);

      if (conflictingDrive.length > 0) {
        return NextResponse.json({ 
          error: 'Drive with this serial number already exists' 
        }, { status: 400 });
      }
    }

    // Update drive
    const updatedDrive = await db()
      .update(driveInventory)
      .set({
        serialNumber,
        model,
        capacity,
        mediaController,
        mediaType,
        classification,
        status,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(driveInventory.id, driveId))
      .returning();

    return NextResponse.json(updatedDrive[0]);
    
  } catch (error) {
    console.error('Drive update error:', error);
    return NextResponse.json(
      { error: 'Failed to update drive' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const driveId = parseInt(id);
    if (isNaN(driveId)) {
      return NextResponse.json({ error: 'Invalid drive ID' }, { status: 400 });
    }

    // Check if drive exists
    const existingDrive = await db()
      .select({ id: driveInventory.id })
      .from(driveInventory)
      .where(eq(driveInventory.id, driveId))
      .limit(1);

    if (existingDrive.length === 0) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 });
    }

    // Check if drive is currently issued (can't delete issued drives)
    const issuedDrive = await db()
      .select({ id: driveTracking.id })
      .from(driveTracking)
      .where(and(
        eq(driveTracking.driveId, driveId),
        isNull(driveTracking.returnedAt)
      ))
      .limit(1);

    if (issuedDrive.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete drive that is currently issued. Please return the drive first.' 
      }, { status: 400 });
    }

    // Delete drive (this will cascade delete all related tracking records)
    await db()
      .delete(driveInventory)
      .where(eq(driveInventory.id, driveId));

    return NextResponse.json({ message: 'Drive deleted successfully' });
    
  } catch (error) {
    console.error('Drive deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete drive' }, 
      { status: 500 }
    );
  }
}