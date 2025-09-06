import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth-server';
import { db } from '@/lib/db/server';
import { aftRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const transferCompleteSchema = z.object({
  filesTransferred: z.number().min(1),
  dtaName: z.string().min(1, 'DTA name is required'),
  dtaSignature: z.string().min(1, 'DTA signature is required'),
  transferDate: z.string().min(1, 'Transfer date is required'),
  tpiMaintained: z.boolean().refine(val => val === true, 'Two-Person Integrity must be confirmed'),
  completedDate: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is DTA
    const userRole = user.primaryRole || user.role;
    if (userRole !== 'dta' && userRole !== 'admin') {
      return NextResponse.json({ 
        error: 'Only DTA users can complete transfers' 
      }, { status: 403 });
    }

    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = transferCompleteSchema.parse(body);

    // Get the AFT request
    const aftRequestArray = await db
      .select()
      .from(aftRequests)
      .where(eq(aftRequests.id, requestId))
      .limit(1);

    if (aftRequestArray.length === 0) {
      return NextResponse.json({ error: 'AFT request not found' }, { status: 404 });
    }

    const aftRequest = aftRequestArray[0];

    // Check if request is ready for completion
    if (aftRequest.status !== 'active_transfer') {
      return NextResponse.json({ 
        error: `Request is not ready for completion. Current status: ${aftRequest.status}` 
      }, { status: 400 });
    }

    // Parse existing transfer data
    let transferData: Record<string, unknown> = {};
    if (aftRequest.transferData && aftRequest.transferData.trim() !== '') {
      try {
        transferData = JSON.parse(aftRequest.transferData);
      } catch (error) {
        console.warn('Failed to parse existing transfer data:', error);
        transferData = {};
      }
    }

    // Add transfer completion data
    transferData.transferCompletion = {
      completedBy: user.id,
      completedByName: `${user.firstName} ${user.lastName}`,
      completedByEmail: user.email,
      completedAt: validatedData.completedDate || new Date().toISOString(),
      filesTransferred: validatedData.filesTransferred,
      transferDate: validatedData.transferDate,
      dtaName: validatedData.dtaName,
      dtaSignature: validatedData.dtaSignature,
      tpiMaintained: validatedData.tpiMaintained,
      proceduresFollowed: true, // Following ACDS Assured File Transfer Standard Operating Procedures
    };

    // Update the request to pending SME signature status
    await db
      .update(aftRequests)
      .set({
        status: 'pending_sme_signature',
        transferData: JSON.stringify(transferData),
        updatedAt: new Date(),
      })
      .where(eq(aftRequests.id, requestId));

    return NextResponse.json({ 
      message: 'AFT transfer completed successfully, awaiting SME signature',
      status: 'pending_sme_signature',
      transferCompletion: transferData.transferCompletion
    });

  } catch (error) {
    console.error('Transfer completion error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.issues?.map(e => `${e.path.join('.')}: ${e.message}`) || []
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      error: 'Failed to complete transfer' 
    }, { status: 500 });
  }
}