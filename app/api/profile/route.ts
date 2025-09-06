import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth-server';
import { db } from '@/lib/db/server';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const runtime = 'nodejs';

const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  organization: z.string().optional(),
  phone: z.string().optional(),
});

// PUT /api/profile - Update current user's profile
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Profile update request for user:', currentUser.id, 'Body:', JSON.stringify(body, null, 2));
    
    // Validate request body
    const validationResult = updateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { email, firstName, lastName, organization, phone } = validationResult.data;

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    };

    // Only update fields that are provided
    if (email !== undefined) updateData.email = email;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (organization !== undefined) updateData.organization = organization;
    if (phone !== undefined) updateData.phone = phone;

    console.log('Update data:', JSON.stringify(updateData, null, 2));

    // Update user profile
    const updatedUser = await db.update(users)
      .set(updateData)
      .where(eq(users.id, currentUser.id))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        primaryRole: users.primaryRole,
        organization: users.organization,
        phone: users.phone,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('Profile updated successfully for user:', updatedUser[0].email);
    return NextResponse.json(updatedUser[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}