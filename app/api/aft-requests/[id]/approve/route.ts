import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { db as getDb } from '@/lib/db';
import { aftRequests, AFTStatusType } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const runtime = 'nodejs';

// Role-based signature schema - each role signs their own section
const signatureSchema = z.object({
  signature: z.string().min(1, 'Digital signature is required'),
  date: z.string().min(1, 'Date is required'),
});

export async function POST(
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

    // Check if user can approve requests (including primaryRole check)
    const userRole = user.primaryRole || user.role; // Handle both old and new schema
    if (!['dao', 'approver', 'cpso', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to approve requests' },
        { status: 403 }
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

    // Get the request first to check transfer type
    const db = getDb();
    const result = await db.select().from(aftRequests).where(eq(aftRequests.id, requestId)).limit(1);
    const aftRequest = result[0] || null;

    if (!aftRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Check if request is in a pending approval status
    if (!['pending_dao', 'pending_approver', 'pending_cpso', 'submitted'].includes(aftRequest.status)) {
      return NextResponse.json(
        { error: 'Request cannot be approved - invalid status' },
        { status: 400 }
      );
    }

    const isHighToLow = aftRequest.transferType === 'high-to-low';

    // Check if current user can approve at this stage
    let canUserApprove = false;
    if (userRole === 'admin') {
      canUserApprove = true; // Admin can approve at any stage
    } else if (userRole === 'dao' && (aftRequest.status === 'pending_dao' || aftRequest.status === 'submitted')) {
      canUserApprove = true;
    } else if (userRole === 'approver' && (aftRequest.status === 'pending_approver' || (aftRequest.status === 'submitted' && !isHighToLow))) {
      // Approver can approve pending_approver requests or submitted requests that are not high-to-low
      canUserApprove = true;
    } else if (userRole === 'cpso' && aftRequest.status === 'pending_cpso') {
      canUserApprove = true;
    }

    if (!canUserApprove) {
      return NextResponse.json(
        { error: `Request is not ready for ${userRole.toUpperCase()} approval. Current status: ${aftRequest.status}` },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = signatureSchema.parse(body);
    
    // Get existing approval data if it exists
    let existingApprovalData = null;
    try {
      if (aftRequest.approvalData && aftRequest.approvalData.trim() !== '') {
        try {
          existingApprovalData = JSON.parse(aftRequest.approvalData);
        } catch (error) {
          console.warn('Failed to parse approval data:', error, 'Data:', aftRequest.approvalData);
          existingApprovalData = null;
        }
      } else {
        existingApprovalData = null;
      }
    } catch {
      // Invalid JSON, start fresh
    }

    // Initialize approval record if it doesn't exist
    if (!existingApprovalData) {
      existingApprovalData = {
        requiresDAOApproval: isHighToLow,
        transferType: aftRequest.transferType,
        signatures: {},
        completedAt: null
      };
    }

    // Add the current user's signature
    const userRoleKey = userRole; // 'dao', 'approver', 'cpso'
    console.log(`Adding signature for ${userRoleKey} user:`, user.email, 'on request:', aftRequest.requestNumber);
    
    existingApprovalData.signatures[userRoleKey] = {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      date: validatedData.date,
      signature: validatedData.signature,
      signedAt: new Date().toISOString(),
    };

    console.log('Current signatures after adding:', Object.keys(existingApprovalData.signatures));

    // Determine next status based on what signatures are still needed
    let nextStatus: string = aftRequest.status;
    const signatures = existingApprovalData.signatures;
    
    // Check approval workflow based on transfer type
    console.log(`Determining next status. IsHighToLow: ${isHighToLow}, Current signatures:`, signatures);
    
    if (isHighToLow) {
      // HIGH-to-LOW requires DAO -> Approver -> CPSO
      if (!signatures.dao) {
        nextStatus = 'pending_dao';
      } else if (!signatures.approver) {
        nextStatus = 'pending_approver';
      } else if (!signatures.cpso) {
        nextStatus = 'pending_cpso';
      } else {
        // All approvals complete, move to DTA stage
        nextStatus = 'pending_dta';
        existingApprovalData.completedAt = new Date().toISOString();
      }
    } else {
      // Other transfers require Approver -> CPSO (no DAO needed)
      if (!signatures.approver) {
        nextStatus = 'pending_approver';
      } else if (!signatures.cpso) {
        nextStatus = 'pending_cpso';
      } else {
        // All approvals complete, move to DTA stage
        nextStatus = 'pending_dta';
        existingApprovalData.completedAt = new Date().toISOString();
      }
    }

    console.log(`Next status determined: ${nextStatus}`);

    // Update the request
    const updatedRequest = await db
      .update(aftRequests)
      .set({
        status: nextStatus as AFTStatusType,
        updatedAt: new Date(),
        approvalData: JSON.stringify(existingApprovalData),
      })
      .where(eq(aftRequests.id, requestId))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Request approved successfully',
      request: updatedRequest[0],
    });

  } catch (error) {
    console.error('Approve request error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.issues?.map(e => `${e.path.join('.')}: ${e.message}`) || []
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to approve request' },
      { status: 500 }
    );
  }
}