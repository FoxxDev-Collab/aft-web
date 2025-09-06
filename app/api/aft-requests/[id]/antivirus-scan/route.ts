import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth-server';
import { db } from '@/lib/db/server';
import { aftRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const antivirusScanSchema = z.object({
  originationScan: z.object({
    performed: z.boolean(),
    filesScanned: z.number().min(0),
    threatsFound: z.number().min(0),
  }),
  destinationScan: z.object({
    performed: z.boolean(),
    filesScanned: z.number().min(0),
    threatsFound: z.number().min(0),
  }),
  date: z.string().optional(),
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
        error: 'Only DTA users can record anti-virus scan results' 
      }, { status: 403 });
    }

    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = antivirusScanSchema.parse(body);

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

    // Anti-virus scanning can be performed at any stage during or after transfer
    // No status check required - DTA can record scan results regardless of current status

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

    // Add anti-virus scan results
    transferData.antivirusScan = {
      userId: user.id,
      dtaName: `${user.firstName} ${user.lastName}`,
      dtaEmail: user.email,
      scanDate: validatedData.date || new Date().toISOString(),
      recordedAt: new Date().toISOString(),
      originationScan: validatedData.originationScan,
      destinationScan: validatedData.destinationScan,
    };

    // Update the request with scan results
    await db
      .update(aftRequests)
      .set({
        transferData: JSON.stringify(transferData),
        updatedAt: new Date(),
      })
      .where(eq(aftRequests.id, requestId));

    return NextResponse.json({ 
      message: 'Anti-virus scan results recorded successfully',
      scanResults: transferData.antivirusScan
    });

  } catch (error) {
    console.error('Anti-virus scan recording error:', error);
    
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
      error: 'Failed to record anti-virus scan results' 
    }, { status: 500 });
  }
}