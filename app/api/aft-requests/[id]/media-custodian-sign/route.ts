import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth-server';
import { db } from '@/lib/db/server';
import { aftRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const mediaCustodianSignatureSchema = z.object({
  signature: z.string().min(1, 'Digital signature is required'),
  dispositionNotes: z.string().optional(),
  dispositionMethod: z.string().optional(),
  dispositionDate: z.string().optional(),
  dispositionType: z.enum(['destroy', 'return', 'archive', 'sanitize']).optional(),
  secondCustodianName: z.string().optional(),
  secondCustodianSignature: z.string().optional(),
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

    // Check if user is Media Custodian
    const userRole = user.primaryRole || user.role;
    if (userRole !== 'media_custodian' && userRole !== 'admin') {
      return NextResponse.json({ 
        error: 'Only Media Custodian users can complete final disposition' 
      }, { status: 403 });
    }

    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = mediaCustodianSignatureSchema.parse(body);
    
    // Check if dual signature is required for destruction
    if (validatedData.dispositionType === 'destroy') {
      if (!validatedData.secondCustodianName || !validatedData.secondCustodianSignature) {
        return NextResponse.json({ 
          error: 'Media destruction requires dual signature from two media custodians' 
        }, { status: 400 });
      }
    }

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

    // Check if request is ready for Media Custodian signature
    if (aftRequest.status !== 'pending_media_custodian') {
      return NextResponse.json({ 
        error: `Request is not ready for Media Custodian signature. Current status: ${aftRequest.status}` 
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

    // Add Media Custodian signature
    transferData.mediaCustodianSignature = {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: userRole,
      date: new Date().toISOString().split('T')[0],
      signature: validatedData.signature,
      signedAt: new Date().toISOString(),
      dispositionNotes: validatedData.dispositionNotes,
      dispositionMethod: validatedData.dispositionMethod,
      dispositionDate: validatedData.dispositionDate,
      dispositionType: validatedData.dispositionType,
    };
    
    // Add second custodian signature for destruction
    if (validatedData.dispositionType === 'destroy') {
      transferData.secondMediaCustodianSignature = {
        name: validatedData.secondCustodianName,
        signature: validatedData.secondCustodianSignature,
        signedAt: new Date().toISOString(),
        role: 'media_custodian_witness',
      };
    }

    // Mark as completed
    transferData.completedAt = new Date().toISOString();

    // Update the request to completed/disposed
    await db
      .update(aftRequests)
      .set({
        status: 'disposed',
        transferData: JSON.stringify(transferData),
        updatedAt: new Date(),
      })
      .where(eq(aftRequests.id, requestId));

    return NextResponse.json({ 
      message: 'Media Custodian signature recorded successfully. AFT process completed.',
      status: 'disposed',
      transferData
    });

  } catch (error) {
    console.error('Media Custodian signature error:', error);
    
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
      error: 'Failed to record Media Custodian signature' 
    }, { status: 500 });
  }
}