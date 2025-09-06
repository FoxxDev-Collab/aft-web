import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth-server';
import { db } from '@/lib/db/server';
import { aftRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const dtaSignatureSchema = z.object({
  signature: z.string().min(1, 'Digital signature is required'),
  assignedSME: z.string().min(1, 'SME assignment is required'),
  assignedMediaCustodian: z.string().min(1, 'Media Custodian assignment is required'),
  transferNotes: z.string().optional(),
  date: z.string().optional(),
  acknowledgeTerms: z.boolean().refine(val => val === true, 'Terms must be acknowledged'),
  actualStartDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  verificationResults: z.string().optional(),
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
        error: 'Only DTA users can sign transfer documents' 
      }, { status: 403 });
    }

    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = dtaSignatureSchema.parse(body);

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

    // Check if request is ready for DTA signature
    if (aftRequest.status !== 'pending_dta') {
      return NextResponse.json({ 
        error: `Request is not ready for DTA signature. Current status: ${aftRequest.status}` 
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

    // Add DTA signature and assignments
    transferData.dtaSignature = {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: userRole,
      date: validatedData.date || new Date().toISOString().split('T')[0],
      signature: validatedData.signature,
      signedAt: new Date().toISOString(),
      transferNotes: validatedData.transferNotes,
      assignedSME: validatedData.assignedSME,
      assignedMediaCustodian: validatedData.assignedMediaCustodian,
      acknowledgeTerms: validatedData.acknowledgeTerms,
      actualStartDate: validatedData.actualStartDate,
      actualEndDate: validatedData.actualEndDate,
      verificationResults: validatedData.verificationResults,
    };

    // Update the request to pending SME signature
    await db
      .update(aftRequests)
      .set({
        status: 'pending_sme',
        transferData: JSON.stringify(transferData),
        transferNotes: validatedData.transferNotes,
        actualStartDate: validatedData.actualStartDate ? new Date(validatedData.actualStartDate) : null,
        actualEndDate: validatedData.actualEndDate ? new Date(validatedData.actualEndDate) : null,
        verificationResults: validatedData.verificationResults,
        updatedAt: new Date(),
      })
      .where(eq(aftRequests.id, requestId));

    return NextResponse.json({ 
      message: 'DTA signature recorded successfully. Request moved to SME approval.',
      status: 'pending_sme',
      transferData
    });

  } catch (error) {
    console.error('DTA signature error:', error);
    
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
      error: 'Failed to record DTA signature' 
    }, { status: 500 });
  }
}