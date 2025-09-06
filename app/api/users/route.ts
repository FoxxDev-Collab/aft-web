import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isAdmin } from '@/lib/auth-server';
import { db } from '@/lib/db/server';
import { users, userRoles, createUserSchema } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import { eq, desc, and } from 'drizzle-orm';

export const runtime = 'nodejs';

// GET /api/users - Get all users (admin and media custodian)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    
    // Allow admin users and media custodians to view users
    const isMediaCustodian = currentUser?.roles?.includes('media_custodian') || currentUser?.primaryRole === 'media_custodian';
    
    if (!currentUser || (!isAdmin(currentUser) && !isMediaCustodian)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.primaryRole,
      organization: users.organization,
      phone: users.phone,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.isActive, true)).orderBy(desc(users.createdAt));

    // Get roles for each user
    const usersWithRoles = await Promise.all(
      allUsers.map(async (user) => {
        const roles = await db.select().from(userRoles).where(
          and(eq(userRoles.userId, user.id), eq(userRoles.isActive, true))
        );
        return {
          ...user,
          roles: roles.map(r => r.role)
        };
      })
    );

    return NextResponse.json(usersWithRoles);
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    
    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = createUserSchema.parse(body);
    
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, validatedData.email)).limit(1);
    
    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);
    
    // Create user
    const newUser = await db.insert(users).values({
      email: validatedData.email,
      password: hashedPassword,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      primaryRole: validatedData.primaryRole,
      organization: validatedData.organization,
      phone: validatedData.phone,
      isActive: true,
    }).returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.primaryRole,
      organization: users.organization,
      phone: users.phone,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });

    // Add primary role to user_roles table
    await db.insert(userRoles).values({
      userId: newUser[0].id,
      role: validatedData.primaryRole,
      isActive: true,
      assignedBy: currentUser.id,
      createdAt: new Date(),
    });

    // Add additional roles if provided
    if (validatedData.additionalRoles && validatedData.additionalRoles.length > 0) {
      const additionalRoleValues = validatedData.additionalRoles
        .filter(role => role !== validatedData.primaryRole) // Don't duplicate primary role
        .map(role => ({
          userId: newUser[0].id,
          role: role,
          isActive: true,
          assignedBy: currentUser.id,
          createdAt: new Date(),
        }));

      if (additionalRoleValues.length > 0) {
        await db.insert(userRoles).values(additionalRoleValues);
      }
    }
    
    return NextResponse.json(newUser[0], { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}