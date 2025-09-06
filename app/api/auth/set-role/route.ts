import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db/server';
import { userRoles, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface JWTPayload {
  id: number;
  email: string;
  roles?: string[];
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('aft-auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify user has the requested role and it's active
    const userRole = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, decoded.id),
          eq(userRoles.role, role),
          eq(userRoles.isActive, true)
        )
      )
      .limit(1);

    if (userRole.length === 0) {
      return NextResponse.json({ error: 'Role not found or inactive' }, { status: 403 });
    }

    // Create new token with current role, preserving original token structure but removing JWT metadata
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { iat, exp, ...userPayload } = decoded;
    const newTokenPayload = {
      ...userPayload,
      currentRole: role,
      timestamp: Date.now()
    };
    
    const newToken = jwt.sign(
      newTokenPayload,
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Set the updated token as a cookie
    const response = NextResponse.json({ 
      success: true, 
      currentRole: role,
      message: 'Role updated successfully' 
    });

    response.cookies.set('aft-auth-token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    // Also update the user's last selected role in the database
    await db
      .update(users)
      .set({ 
        updatedAt: new Date()
      })
      .where(eq(users.id, decoded.id));

    return response;

  } catch (error) {
    console.error('Set role error:', error);
    return NextResponse.json({ error: 'Failed to set role' }, { status: 500 });
  }
}