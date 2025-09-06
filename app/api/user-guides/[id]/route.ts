import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userGuides, users, type NewUserGuide, type UserRoleType } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

// GET /api/user-guides/[id] - Get specific guide
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    const [guide] = await db()
      .select({
        id: userGuides.id,
        title: userGuides.title,
        description: userGuides.description,
        role: userGuides.role,
        content: userGuides.content,
        isPublished: userGuides.isPublished,
        sortOrder: userGuides.sortOrder,
        createdAt: userGuides.createdAt,
        updatedAt: userGuides.updatedAt,
        createdBy: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(userGuides)
      .leftJoin(users, eq(userGuides.createdBy, users.id))
      .where(eq(userGuides.id, id))
      .limit(1);

    if (!guide) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    // Non-admin users can only see published guides
    if (user.role !== 'admin' && !guide.isPublished) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    return NextResponse.json(guide);
  } catch (error) {
    console.error('Error fetching user guide:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/user-guides/[id] - Update guide (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserFromRequest();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const updateGuideSchema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      role: z.string().optional(),
      content: z.string().min(1).optional(),
      isPublished: z.boolean().optional(),
      sortOrder: z.number().optional(),
    });

    const body = await request.json();
    const validatedData = updateGuideSchema.parse(body);

    // Check if guide exists
    const [existingGuide] = await db()
      .select()
      .from(userGuides)
      .where(eq(userGuides.id, id))
      .limit(1);

    if (!existingGuide) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    const { role, ...otherData } = validatedData;
    const updateData: Partial<NewUserGuide> = {
      ...otherData,
      updatedBy: user.id,
      updatedAt: new Date(),
    };

    if (role === 'all') {
      updateData.role = null;
    } else if (role) {
      updateData.role = role as UserRoleType; // Type assertion for role
    }

    const [updatedGuide] = await db()
      .update(userGuides)
      .set(updateData)
      .where(eq(userGuides.id, id))
      .returning();

    return NextResponse.json(updatedGuide);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating user guide:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/user-guides/[id] - Delete guide (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserFromRequest();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if guide exists
    const [existingGuide] = await db()
      .select()
      .from(userGuides)
      .where(eq(userGuides.id, id))
      .limit(1);

    if (!existingGuide) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    await db().delete(userGuides).where(eq(userGuides.id, id));

    return NextResponse.json({ message: 'Guide deleted successfully' });
  } catch (error) {
    console.error('Error deleting user guide:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}