import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth-server';
import { db } from '@/lib/db/server';
import { aftRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

    // Check if user is DTA or admin
    const userRole = user.primaryRole || user.role;
    if (userRole !== 'dta' && userRole !== 'admin') {
      return NextResponse.json({ 
        error: 'Only DTA users can initiate transfers' 
      }, { status: 403 });
    }

    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
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

    // Check if request is ready for transfer initiation
    if (aftRequest.status !== 'pending_dta') {
      return NextResponse.json({ 
        error: `Request is not ready for transfer initiation. Current status: ${aftRequest.status}` 
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

    // Add transfer initiation data
    transferData.transferInitiation = {
      initiatedBy: user.id,
      initiatedByName: `${user.firstName} ${user.lastName}`,
      initiatedByEmail: user.email,
      initiatedAt: new Date().toISOString(),
    };

    // Update the request to active transfer status
    await db
      .update(aftRequests)
      .set({
        status: 'active_transfer',
        transferData: JSON.stringify(transferData),
        updatedAt: new Date(),
      })
      .where(eq(aftRequests.id, requestId));

    return NextResponse.json({ 
      message: 'AFT transfer initiated successfully',
      status: 'active_transfer',
      transferInitiation: transferData.transferInitiation
    });

  } catch (error) {
    console.error('Transfer initiation error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to initiate transfer' 
    }, { status: 500 });
  }
}