import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth-server';
import { db } from '@/lib/db/server';
import { aftRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const smeSignatureSchema = z.object({
  signature: z.string().min(1, 'Digital signature is required'),
  comments: z.string().optional(),
  date: z.string().optional(),
  acknowledgeTerms: z.boolean().optional(),
  technicalValidation: z.object({
    antivirusResults: z.string().optional(),
    integrityCheck: z.string().optional(),
    formatValidation: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
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

    // Check if user is SME
    const userRole = user.primaryRole || user.role;
    if (userRole !== 'sme' && userRole !== 'admin') {
      return NextResponse.json({ 
        error: 'Only SME users can provide technical validation' 
      }, { status: 403 });
    }

    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = smeSignatureSchema.parse(body);

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

    // Check if request is ready for SME signature
    if (aftRequest.status !== 'pending_sme_signature' && aftRequest.status !== 'pending_sme') {
      return NextResponse.json({ 
        error: `Request is not ready for SME signature. Current status: ${aftRequest.status}` 
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

    // Add SME signature
    transferData.smeSignature = {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: userRole,
      date: validatedData.date || new Date().toISOString().split('T')[0],
      signature: validatedData.signature,
      comments: validatedData.comments || '',
      signedAt: new Date().toISOString(),
      technicalValidation: validatedData.technicalValidation,
    };

    // Update the request to pending media custodian
    await db
      .update(aftRequests)
      .set({
        status: 'pending_media_custodian',
        transferData: JSON.stringify(transferData),
        updatedAt: new Date(),
      })
      .where(eq(aftRequests.id, requestId));

    return NextResponse.json({ 
      message: 'SME signature recorded successfully. Request moved to Media Custodian.',
      status: 'pending_media_custodian',
      transferData
    });

  } catch (error) {
    console.error('SME signature error:', error);
    
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
      error: 'Failed to record SME signature' 
    }, { status: 500 });
  }
}