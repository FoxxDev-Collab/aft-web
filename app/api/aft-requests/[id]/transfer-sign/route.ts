import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth-server';
import { db } from '@/lib/db/server';
import { aftRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface TransferSignatureData {
  userId: number;
  name: string;
  email: string;
  role: string;
  date: string;
  signature: string;
  signedAt: string;
  technicalValidation?: {
    antivirusResults: string;
    integrityCheck: string;
    formatValidation: string;
    notes: string;
  };
  transferCompletion?: {
    actualStartDate: string;
    actualEndDate: string;
    transferMethod: string;
    verificationResults: string;
    notes: string;
  };
}

interface TransferSignaturesData {
  primaryDta?: TransferSignatureData;
  secondarySigner?: TransferSignatureData;
  secondarySignerType?: 'dta' | 'sme';
  completedAt?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Transfer signature request for AFT ID:', id);
    
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      console.log('No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User attempting to sign transfer:', user.email, user.role);

    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const body = await request.json();
    const { signature, technicalValidation, transferCompletion } = body;

    if (!signature) {
      return NextResponse.json({ error: 'Digital signature is required' }, { status: 400 });
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
    console.log('Current AFT status:', aftRequest.status);

    // Parse existing transfer signatures
    let transferData: TransferSignaturesData = {};
    if (aftRequest.transferData && aftRequest.transferData.trim() !== '') {
      try {
        transferData = JSON.parse(aftRequest.transferData);
      } catch (error) {
        console.warn('Failed to parse existing transfer data:', error, 'Data:', aftRequest.transferData);
        transferData = {};
      }
    }

    // Check if current user can sign at this stage
    let canUserSign = false;
    let newStatus = aftRequest.status;
    let isSecondaryDta = false;

    if (user.role === 'admin') {
      canUserSign = true; // Admin can sign at any stage
    } else if (user.role === 'dta' && aftRequest.status === 'pending_dta') {
      // First DTA signature (primary)
      canUserSign = true;
      if (!transferCompletion && !technicalValidation) {
        return NextResponse.json({ 
          error: 'Either transfer completion data or technical validation data is required for DTA signature' 
        }, { status: 400 });
      }
    } else if (user.role === 'dta' && aftRequest.status === 'pending_sme') {
      // Any DTA can sign as secondary signer when secondary signer type is DTA
      canUserSign = true;
      isSecondaryDta = true;
      if (!transferCompletion) {
        return NextResponse.json({ 
          error: 'Transfer completion data is required for secondary DTA signature' 
        }, { status: 400 });
      }
    } else if (user.role === 'sme' && aftRequest.status === 'pending_sme') {
      // Any SME can sign as secondary signer when secondary signer type is SME
      canUserSign = true;
      if (!technicalValidation) {
        return NextResponse.json({ 
          error: 'Technical validation data is required for SME signature' 
        }, { status: 400 });
      }
    } else if (user.role === 'dta' && aftRequest.status === 'pending_media_custodian') {
      // Any DTA can complete the final transfer step
      canUserSign = true;
      if (!transferCompletion) {
        return NextResponse.json({ 
          error: 'Transfer completion data is required for DTA completion signature' 
        }, { status: 400 });
      }
    }

    if (!canUserSign) {
      return NextResponse.json({ 
        error: `Cannot sign at this stage. Current status: ${aftRequest.status}, your role: ${user.role}` 
      }, { status: 403 });
    }

    // Create signature data
    const signatureData: TransferSignatureData = {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      date: new Date().toISOString().split('T')[0],
      signature,
      signedAt: new Date().toISOString(),
      ...(technicalValidation && { technicalValidation }),
      ...(transferCompletion && { transferCompletion }),
    };

    // Update transfer signatures based on role and position
    if (user.role === 'dta' && aftRequest.status === 'pending_dta') {
      // Primary DTA signature
      transferData.primaryDta = signatureData;
      // Default workflow moves to SME next
      
      if (true) { // Always go to SME next in current workflow
        newStatus = 'pending_sme';
      } else {
        // No secondary signer configured, complete the transfer
        newStatus = 'pending_media_custodian';
      }
    } else if (isSecondaryDta || (user.role === 'sme' && aftRequest.status === 'pending_sme')) {
      // Secondary signer (either second DTA or SME)
      transferData.secondarySigner = signatureData;
      
      // Check if primary DTA has already signed
      if (transferData.primaryDta) {
        newStatus = 'pending_media_custodian'; // Both signatures complete, ready for final completion
      } else {
        // This shouldn't happen in normal flow, but handle it gracefully
        newStatus = 'pending_dta'; // Wait for primary DTA
      }
    } else if (user.role === 'dta' && aftRequest.status === 'disposed') {
      // Final DTA completion step - any DTA can complete
      if (transferData.primaryDta) {
        // Update existing primary DTA data with completion info
        transferData.primaryDta = { ...transferData.primaryDta, ...signatureData };
      } else {
        // This DTA is completing the transfer
        transferData.primaryDta = signatureData;
      }
      newStatus = 'completed';
      transferData.completedAt = new Date().toISOString();
    }

    console.log('Updating transfer with signatures and status:', newStatus);

    // Update the AFT request with transfer signatures and new status
    await db
      .update(aftRequests)
      .set({
        transferData: JSON.stringify(transferData),
        status: newStatus,
        updatedAt: new Date(),
        // Update specific fields based on transfer completion data
        ...(transferCompletion && {
          actualStartDate: transferCompletion.actualStartDate ? new Date(transferCompletion.actualStartDate) : null,
          actualEndDate: transferCompletion.actualEndDate ? new Date(transferCompletion.actualEndDate) : null,
          transferNotes: transferCompletion.notes,
          verificationResults: transferCompletion.verificationResults,
        }),
      })
      .where(eq(aftRequests.id, requestId));

    console.log('Transfer signature recorded successfully');

    return NextResponse.json({ 
      message: 'Transfer signature recorded successfully',
      status: newStatus,
      transferData
    });

  } catch (error) {
    console.error('Transfer signature error:', error);
    return NextResponse.json({ 
      error: 'Failed to record transfer signature' 
    }, { status: 500 });
  }
}