import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { driveInventory } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow access for requestors (to see available drives) and custodians/admins
    // No additional permission check needed - all authenticated users can see available drives

    // Get only available drives
    const availableDrives = await db()
      .select()
      .from(driveInventory)
      .where(eq(driveInventory.status, 'available'))
      .orderBy(desc(driveInventory.updatedAt));

    return NextResponse.json(availableDrives);
    
  } catch (error) {
    console.error('Available drives fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available drives' }, 
      { status: 500 }
    );
  }
}