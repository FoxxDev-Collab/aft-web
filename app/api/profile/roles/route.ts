import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth-server';
import { db } from '@/lib/db/server';
import { userRoles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';

// GET /api/profile/roles - Get current user's roles
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's roles
    const roles = await db.select().from(userRoles).where(
      and(eq(userRoles.userId, currentUser.id), eq(userRoles.isActive, true))
    );

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Get profile roles error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user roles' },
      { status: 500 }
    );
  }
}