import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth-server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db/raw';

// GET /api/users - Get all users (admin and media custodian)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    // Allow admin users and media custodians to view users
    const isMediaCustodian = currentUser?.roles?.includes('media_custodian') || currentUser?.primaryRole === 'media_custodian';
    
    if (!currentUser || (!isAdmin(currentUser) && !isMediaCustodian)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Support including inactive/archived users via query param (admin only)
    const url = new URL(request.url);
    const { includeInactive: includeInactiveParam = false } = Object.fromEntries(url.searchParams);
    const includeInactive = includeInactiveParam === 'true';

    // Build query; by default or for non-admins, only return active users
    const stmt = db.prepare(`
      SELECT id, email, first_name, last_name, primary_role, organization, phone, is_active, created_at, updated_at
      FROM users 
      ORDER BY created_at DESC
    `);
    const usersWithRoles = (stmt.all() as { id: number; email: string; first_name: string; last_name: string; primary_role: string; organization: string; phone: string; is_active: number; created_at: number; updated_at: number }[]).map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      primaryRole: user.primary_role,
      organization: user.organization,
      phone: user.phone,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    // Get roles for each user
    const usersWithRolesAndRoles = await Promise.all(
      usersWithRoles.map(async (user) => {
        const stmt = db.prepare('SELECT role FROM user_roles WHERE user_id = ? AND is_active = 1');
        const roles = stmt.all(user.id) as { role: string }[];
        return {
          ...user,
          roles: roles.map(r => r.role)
        };
      })
    );

    return NextResponse.json(usersWithRolesAndRoles);
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
    const currentUser = await getCurrentUser();
    
    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const createUserSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      firstName: z.string(),
      lastName: z.string(),
      primaryRole: z.string(),
      organization: z.string(),
      phone: z.string(),
      additionalRoles: z.array(z.string()).optional(),
    });
    const validatedData = createUserSchema.parse(body);
    
    // Check if user already exists
    const existingUserStmt = db.prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    const existingUser = existingUserStmt.get(validatedData.email);

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);
    
    // Create new user
    const insertUserStmt = db.prepare(`
      INSERT INTO users (email, password, first_name, last_name, primary_role, organization, phone, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = Date.now();
    const result = insertUserStmt.run(
      validatedData.email,
      hashedPassword,
      validatedData.firstName,
      validatedData.lastName,
      validatedData.primaryRole,
      validatedData.organization,
      validatedData.phone,
      1, // is_active
      now,
      now
    );
    
    const getUserStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const newUser = getUserStmt.get(result.lastInsertRowid) as { id: number; email: string; first_name: string; last_name: string; primary_role: string; organization: string; phone: string; is_active: number; created_at: number; updated_at: number };

    // Add primary role to user_roles table
    const insertRoleStmt = db.prepare(`
      INSERT INTO user_roles (user_id, role, is_active, assigned_by, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    insertRoleStmt.run(
      newUser.id,
      validatedData.primaryRole,
      1, // is_active
      currentUser.id,
      now
    );

    // Add additional roles if provided
    if (validatedData.additionalRoles && validatedData.additionalRoles.length > 0) {
      for (const role of validatedData.additionalRoles) {
        insertRoleStmt.run(
          newUser.id,
          role,
          1, // is_active
          currentUser.id,
          now
        );
      }
    }

    return NextResponse.json({
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      primaryRole: newUser.primary_role,
      organization: newUser.organization,
      phone: newUser.phone,
      isActive: newUser.is_active,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}