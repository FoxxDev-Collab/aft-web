import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getCurrentUserFromRequest } from '@/lib/auth-server';
import { db as getDb } from '@/lib/db';
import { aftRequests, aftAuditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { appLogger } from '@/lib/logger';

export const runtime = 'nodejs';

// Helper function to check if an approver has participated in the request workflow
async function checkApproverParticipation(aftRequest: { approvalData?: string | null }, userRole: string): Promise<boolean> {
  // Check if the approver has signed this request by examining the approvalData
  if (aftRequest.approvalData) {
    try {
      const approvalData = JSON.parse(aftRequest.approvalData);
      return !!approvalData.signatures?.[userRole];
    } catch (error) {
      console.warn('Failed to parse approval data for participation check:', error);
      return false;
    }
  }
  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    // Get the request
    const db = getDb();
    const result = await db.select().from(aftRequests).where(eq(aftRequests.id, requestId)).limit(1);
    const aftRequest = result[0] || null;

    if (!aftRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Check permissions - anyone can view their own requests regardless of role
    if (aftRequest.requestorId === user.id) {
      // User is the requestor, allow access
    } else if (user.role === 'requestor') {
      // User is a requestor but not the owner of this request
      return NextResponse.json(
        { error: 'Forbidden - You can only view your own requests' },
        { status: 403 }
      );
    }

    // Approvers (dao, approver, cpso) can view requests they're involved with at any stage
    // This includes historical requests for audit and review purposes
    if (['dao', 'approver', 'cpso'].includes(user.role)) {
      // Check if this approver has participated in the request workflow
      const hasParticipated = await checkApproverParticipation(aftRequest, user.role);
      
      // Allow access if:
      // 1. Request is in their current workflow stage (pending states or submitted)
      // 2. They have already participated in the approval process (historical access)
      // 3. Request is in approved/rejected states (general approver visibility)
      const canViewCurrentWorkflow = ['submitted', 'pending_dao', 'pending_approver', 'pending_cpso', 'approved', 'rejected'].includes(aftRequest.status);
      
      if (!canViewCurrentWorkflow && !hasParticipated) {
        return NextResponse.json(
          { error: 'Access denied - request not in viewable state' },
          { status: 403 }
        );
      }
    }

    if (user.role === 'dta' && aftRequest.requestorId !== user.id && !['approved', 'pending_dta', 'active_transfer', 'pending_sme_signature', 'pending_sme', 'pending_media_custodian', 'completed', 'disposed'].includes(aftRequest.status)) {
      return NextResponse.json(
        { error: 'Forbidden - Request not available for DTA processing' },
        { status: 403 }
      );
    }

    return NextResponse.json({ request: aftRequest });

  } catch (error) {
    console.error('Get request error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request' },
      { status: 500 }
    );
  }
}

// PUT - Update request
export async function PUT(
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

    const updateData = await request.json();

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

    // Check if user can edit this request
    const canEdit = (
      // Requestors can edit their own requests in specific statuses
      (userRoles.includes('requestor') && 
       current.requestorId === user.id && 
       ['draft', 'rejected'].includes(current.status)) ||
      // Admin can edit any request
      userRoles.includes('admin')
    );

    // Special case: Allow requestors to return their own submitted requests to draft for editing
    const canReturnToDraft = (
      userRoles.includes('requestor') && 
      current.requestorId === user.id && 
      ['submitted', 'pending_dao', 'pending_approver', 'pending_cpso'].includes(current.status) &&
      updateData.status === 'draft'
    );

    if (!canEdit && !canReturnToDraft) {
      return NextResponse.json({ 
        error: 'You do not have permission to edit this request at its current stage' 
      }, { status: 403 });
    }

    // Update the request
    const updatedRequest = await db
      .update(aftRequests)
      .set({
        ...updateData,
        updatedAt: new Date(),
        // Clear rejection reason if resubmitting
        rejectionReason: updateData.status === 'submitted' ? null : updateData.rejectionReason
      })
      .where(eq(aftRequests.id, requestId))
      .returning();

    // Create audit log entry
    await db.insert(aftAuditLog).values({
      requestId,
      userId: user.id,
      action: current.status === 'rejected' && updateData.status === 'submitted' ? 'RESUBMITTED' : 'UPDATED',
      oldStatus: current.status,
      newStatus: updateData.status || current.status,
      notes: `Request updated by ${user.firstName} ${user.lastName}`,
      createdAt: new Date(),
    });

    // Log the update
    appLogger.info('AFT request updated', {
      userId: user.id.toString(),
      action: 'REQUEST_UPDATE',
      resource: `request_${requestId}`
    });

    if (current.status === 'rejected' && updateData.status === 'submitted') {
      appLogger.securityEvent('REQUEST_RESUBMITTED', {
        requestId,
        requestNumber: current.requestNumber,
        resubmittedBy: user.email,
        previousStatus: current.status
      }, {
        userId: user.id.toString(),
        action: 'REQUEST_RESUBMISSION'
      });
    }

    return NextResponse.json({ 
      message: 'Request updated successfully',
      request: updatedRequest[0]
    });

  } catch (error) {
    appLogger.error(`Error updating AFT request: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    // Get the request
    const db = getDb();
    const result = await db.select().from(aftRequests).where(eq(aftRequests.id, requestId)).limit(1);
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    const aftRequest = result[0];

    // Only allow deletion of draft requests by the requestor or admin
    if (aftRequest.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft requests can be deleted' },
        { status: 403 }
      );
    }

    if (aftRequest.requestorId !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You can only delete your own draft requests' },
        { status: 403 }
      );
    }

    // Delete the request (cascade delete should handle attachments)
    await db.delete(aftRequests).where(eq(aftRequests.id, requestId));

    // Log the deletion
    appLogger.info(`Draft AFT request ${aftRequest.requestNumber} deleted by user ${user.id}`, {
      userId: user.id.toString(),
      action: 'REQUEST_DELETE',
      resource: `request_${aftRequest.id}`
    });

    return NextResponse.json({ 
      message: 'Request deleted successfully'
    });

  } catch (error) {
    appLogger.error(`Error deleting AFT request: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}