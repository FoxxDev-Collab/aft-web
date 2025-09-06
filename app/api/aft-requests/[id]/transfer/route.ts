import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { db as getDb } from '@/lib/db';
import { aftRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const runtime = 'nodejs';

const transferSchema = z.object({
  // Anti-Virus Scan Data
  originationScanPerformed: z.boolean(),
  originationFilesScanned: z.number().min(0),
  originationThreatsFound: z.number().min(0),
  destinationScanPerformed: z.boolean(),
  destinationFilesScanned: z.number().min(0),
  destinationThreatsFound: z.number().min(0),
  
  // Transfer Completion Data
  transferDate: z.string().min(1, 'Transfer date is required'),
  filesTransferred: z.number().min(1, 'Number of files transferred is required'),
  dtaName: z.string().min(1, 'DTA name is required'),
  dtaSignature: z.string().min(1, 'DTA signature is required'),
  smeName: z.string().min(1, 'SME name is required'),
  smeSignature: z.string().min(1, 'SME signature is required'),
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

    // Check if user can complete transfers
    if (user.role !== 'dta' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions to complete transfers' },
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = transferSchema.parse(body);

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

    // Check if request is in correct status
    if (aftRequest.status !== 'approved') {
      return NextResponse.json(
        { error: 'Request cannot be transferred - invalid status' },
        { status: 400 }
      );
    }

    // Create transfer record
    const transferRecord = {
      transferredBy: user.id,
      transferredAt: new Date().toISOString(),
      dtaName: `${user.firstName} ${user.lastName}`,
      dtaEmail: user.email,
      
      // Anti-virus scan data
      antiVirusScan: {
        origination: {
          performed: validatedData.originationScanPerformed,
          filesScanned: validatedData.originationFilesScanned,
          threatsFound: validatedData.originationThreatsFound,
        },
        destination: {
          performed: validatedData.destinationScanPerformed,
          filesScanned: validatedData.destinationFilesScanned,
          threatsFound: validatedData.destinationThreatsFound,
        },
      },
      
      // Transfer completion data
      transferCompletion: {
        date: validatedData.transferDate,
        filesTransferred: validatedData.filesTransferred,
        dtaName: validatedData.dtaName,
        dtaSignature: validatedData.dtaSignature,
        smeName: validatedData.smeName,
        smeSignature: validatedData.smeSignature,
      },
    };

    // Update the request status and add transfer data
    const updatedRequest = await db
      .update(aftRequests)
      .set({
        status: 'completed', // Move to completed status after DTA processing
        actualStartDate: new Date(validatedData.transferDate),
        actualEndDate: new Date(),
        updatedAt: new Date(),
        transferNotes: `Transfer completed by DTA: ${validatedData.dtaName} and SME: ${validatedData.smeName}`,
        // Store transfer data - we'll need to add this column to the schema
        transferData: JSON.stringify(transferRecord),
      })
      .where(eq(aftRequests.id, requestId))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Transfer completed successfully',
      request: updatedRequest[0],
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
    
    return NextResponse.json(
      { error: 'Failed to complete transfer' },
      { status: 500 }
    );
  }
}