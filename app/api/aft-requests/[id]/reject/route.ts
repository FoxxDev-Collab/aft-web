import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/server';
import { aftRequests, aftAuditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserFromRequest } from '@/lib/auth-server';
import { appLogger } from '@/lib/logger';

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

    // Get current user
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { reason } = await request.json();

    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    // Get the AFT request
    const aftRequest = await db
      .select()
      .from(aftRequests)
      .where(eq(aftRequests.id, requestId))
      .limit(1);

    if (aftRequest.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const currentRequest = aftRequest[0];
    const currentStatus = currentRequest.status;
    const userRoles = user.roles || [user.role];
    const isHighToLow = currentRequest.transferType === 'high-to-low';

    // Check if user can reject at current stage
    const canReject = (
      (userRoles.includes('dao') && (currentStatus === 'pending_dao' || currentStatus === 'submitted')) ||
      (userRoles.includes('approver') && (currentStatus === 'pending_approver' || (currentStatus === 'submitted' && !isHighToLow))) ||
      (userRoles.includes('cpso') && currentStatus === 'pending_cpso') ||
      (userRoles.includes('admin') && ['pending_dao', 'pending_approver', 'pending_cpso', 'submitted'].includes(currentStatus))
    );

    if (!canReject) {
      return NextResponse.json({ 
        error: 'You do not have permission to reject this request at its current stage' 
      }, { status: 403 });
    }

    // Update request status to rejected
    await db
      .update(aftRequests)
      .set({
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(aftRequests.id, requestId));

    // Create audit log entry
    await db.insert(aftAuditLog).values({
      requestId,
      userId: user.id,
      action: 'REJECTED',
      oldStatus: currentStatus,
      newStatus: 'rejected',
      notes: `Request rejected by ${user.firstName} ${user.lastName} (${user.role}): ${reason}`,
      createdAt: new Date(),
    });

    // Log security event
    appLogger.securityEvent('REQUEST_REJECTED', {
      requestId,
      requestNumber: currentRequest.requestNumber,
      rejectedBy: user.email,
      rejectedByRole: user.role,
      previousStatus: currentStatus,
      reason: reason.substring(0, 100) // Truncate for logging
    }, {
      userId: user.id.toString(),
      action: 'REQUEST_REJECTION'
    });

    appLogger.info('AFT request rejected', {
      userId: user.id.toString(),
      action: 'REQUEST_REJECTION',
      resource: `request_${requestId}`
    });

    return NextResponse.json({ 
      message: 'Request rejected successfully',
      status: 'rejected'
    });

  } catch (error) {
    const resolvedParams = await params;
    appLogger.error(`Error rejecting AFT request: ${error instanceof Error ? error.message : String(error)}`, {
      resource: `request_${resolvedParams.id}`
    });
    
    console.error('Reject request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}