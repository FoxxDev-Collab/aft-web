import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isAdmin } from '@/lib/auth-server';
import { db } from '@/lib/db/server';
import { userRoles, users, UserRole } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const addRoleSchema = z.object({
  role: z.enum([UserRole.ADMIN, UserRole.REQUESTOR, UserRole.DAO, UserRole.APPROVER, UserRole.CPSO, UserRole.DTA, UserRole.SME, UserRole.MEDIA_CUSTODIAN]),
});

const removeRoleSchema = z.object({
  role: z.enum([UserRole.ADMIN, UserRole.REQUESTOR, UserRole.DAO, UserRole.APPROVER, UserRole.CPSO, UserRole.DTA, UserRole.SME, UserRole.MEDIA_CUSTODIAN]),
});

// GET /api/users/[id]/roles - Get user's roles
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    
    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Get user's roles
    const roles = await db.select().from(userRoles).where(
      and(eq(userRoles.userId, userId), eq(userRoles.isActive, true))
    );

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Get user roles error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user roles' },
      { status: 500 }
    );
  }
}

// POST /api/users/[id]/roles - Add role to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    
    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = addRoleSchema.parse(body);

    // Check if user exists
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if role already exists
    const existingRole = await db.select().from(userRoles).where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.role, validatedData.role),
        eq(userRoles.isActive, true)
      )
    ).limit(1);

    if (existingRole.length > 0) {
      return NextResponse.json(
        { error: 'User already has this role' },
        { status: 409 }
      );
    }

    // Add role
    const newRole = await db.insert(userRoles).values({
      userId: userId,
      role: validatedData.role,
      isActive: true,
      assignedBy: currentUser.id,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json(newRole[0], { status: 201 });
  } catch (error) {
    console.error('Add user role error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid role specified',
          details: error.issues?.map(e => `${e.path.join('.')}: ${e.message}`) || []
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to add role' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id]/roles - Remove role from user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    
    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = removeRoleSchema.parse(body);

    // Check if user exists
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Don't allow removing primary role
    if (user[0].primaryRole === validatedData.role) {
      return NextResponse.json(
        { error: 'Cannot remove primary role. Change primary role first.' },
        { status: 400 }
      );
    }

    // Remove role (mark as inactive)
    const result = await db.update(userRoles)
      .set({ isActive: false })
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.role, validatedData.role),
          eq(userRoles.isActive, true)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Role not found or already removed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Role removed successfully' });
  } catch (error) {
    console.error('Remove user role error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid role specified',
          details: error.issues?.map(e => `${e.path.join('.')}: ${e.message}`) || []
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to remove role' },
      { status: 500 }
    );
  }
}