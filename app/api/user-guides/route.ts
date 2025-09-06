import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userGuides, users, type UserRoleType } from '@/lib/db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

// GET /api/user-guides - Get all published guides (or all guides for admin)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const includeUnpublished = searchParams.get('includeUnpublished') === 'true';

    // Only admins can see unpublished guides
    const canSeeUnpublished = user.role === 'admin' && includeUnpublished;

    const whereConditions = [];
    
    // Filter by publication status
    if (!canSeeUnpublished) {
      whereConditions.push(eq(userGuides.isPublished, true));
    }

    // Filter by role if specified
    if (role) {
      whereConditions.push(
        role === 'all' 
          ? isNull(userGuides.role) 
          : eq(userGuides.role, role as UserRoleType)
      );
    }

    const guides = await db()
      .select({
        id: userGuides.id,
        title: userGuides.title,
        description: userGuides.description,
        role: userGuides.role,
        isPublished: userGuides.isPublished,
        sortOrder: userGuides.sortOrder,
        createdAt: userGuides.createdAt,
        updatedAt: userGuides.updatedAt,
        createdBy: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(userGuides)
      .leftJoin(users, eq(userGuides.createdBy, users.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(userGuides.sortOrder, desc(userGuides.updatedAt));

    return NextResponse.json(guides);
  } catch (error) {
    console.error('Error fetching user guides:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/user-guides - Create new guide (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const createGuideSchema = z.object({
      id: z.string().min(1).regex(/^[a-z0-9-]+$/, 'ID must be lowercase letters, numbers, and hyphens only'),
      title: z.string().min(1),
      description: z.string().min(1),
      role: z.string().optional(),
      content: z.string().min(1),
      isPublished: z.boolean().default(false),
      sortOrder: z.number().default(0),
    });

    const body = await request.json();
    const validatedData = createGuideSchema.parse(body);

    // Check if guide ID already exists
    const existingGuide = await db()
      .select()
      .from(userGuides)
      .where(eq(userGuides.id, validatedData.id))
      .limit(1);

    if (existingGuide.length > 0) {
      return NextResponse.json(
        { error: 'Guide ID already exists' },
        { status: 409 }
      );
    }

    const [newGuide] = await db()
      .insert(userGuides)
      .values({
        ...validatedData,
        role: validatedData.role === 'all' ? null : (validatedData.role as UserRoleType),
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning();

    return NextResponse.json(newGuide, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating user guide:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}