import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth-server';
import { db as getDb } from '@/lib/db';
import { aftRequests, aftAuditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const runtime = 'nodejs';

const submitRequestSchema = z.object({
  signature: z.string().min(1, 'Digital signature is required'),
  acknowledgeTerms: z.boolean().refine(val => val === true, {
    message: 'You must acknowledge the terms and conditions'
  })
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestId = parseInt(id);
    
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = submitRequestSchema.parse(body);

    // Get the current request
    const db = getDb();
    const currentRequest = await db
      .select()
      .from(aftRequests)
      .where(eq(aftRequests.id, requestId))
      .limit(1);

    if (currentRequest.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const current = currentRequest[0];
    const userRoles = user.roles || [user.role];

    // Check if user can submit this request
    const canSubmit = (
      userRoles.includes('requestor') && 
      current.requestorId === user.id && 
      current.status === 'draft'
    ) || userRoles.includes('admin');

    if (!canSubmit) {
      return NextResponse.json({ 
        error: 'You can only submit your own draft requests' 
      }, { status: 403 });
    }

    // Determine the next status based on transfer type
    const isHighToLow = current.transferType === 'high-to-low';
    const nextStatus = isHighToLow ? 'pending_dao' : 'pending_approver';

    // Update the request status
    const updatedRequest = await db
      .update(aftRequests)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(aftRequests.id, requestId))
      .returning();

    // Create audit log entry
    await db.insert(aftAuditLog).values({
      requestId: requestId,
      userId: user.id,
      action: 'submitted',
      oldStatus: 'draft',
      newStatus: nextStatus,
      notes: `Request submitted with digital signature: ${validatedData.signature}`,
      createdAt: new Date(),
    });

    return NextResponse.json({
      message: 'Request submitted successfully',
      request: updatedRequest[0],
      nextStatus: nextStatus,
      requiresApproval: isHighToLow ? 'DAO (Designated Authorizing Official)' : 'Approver (Information System Security Manager)'
    });

  } catch (error) {
    console.error('Submit request error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.issues.map(e => ({ field: e.path.join('.'), message: e.message }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}