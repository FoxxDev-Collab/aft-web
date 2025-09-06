import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth-server';
import { db } from '@/lib/db/server';
import { cacSignatures, aftRequests, type AFTRequest } from '@/lib/db/schema';
import { type AuthUser } from '@/lib/auth-server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const runtime = 'nodejs';

// Schema for signature creation
const createSignatureSchema = z.object({
  requestId: z.number(),
  stepType: z.string(),
  certificateSubject: z.string(),
  certificateIssuer: z.string(),
  certificateSerial: z.string(),
  certificateThumbprint: z.string(),
  certificateNotBefore: z.string().transform(str => new Date(str)),
  certificateNotAfter: z.string().transform(str => new Date(str)),
  signatureData: z.string(),
  signedData: z.string(),
  signatureAlgorithm: z.string().default('RSA-SHA256'),
  signatureReason: z.string().optional(),
  signatureLocation: z.string().optional(),
});

// POST /api/signatures - Create new digital signature
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = createSignatureSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Signature validation error:', validationResult.error);
      return NextResponse.json(
        { 
          error: 'Invalid signature data', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const signatureData = validationResult.data;

    // Verify the request exists and user has permission
    const aftRequest = await db.select()
      .from(aftRequests)
      .where(eq(aftRequests.id, signatureData.requestId))
      .limit(1);

    if (aftRequest.length === 0) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized for this step type
    const isAuthorized = await verifyStepAuthorization(
      currentUser, 
      signatureData.stepType, 
      aftRequest[0]
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Not authorized for this signature step' },
        { status: 403 }
      );
    }

    // Check if signature already exists for this step
    const existingSignature = await db.select()
      .from(cacSignatures)
      .where(
        and(
          eq(cacSignatures.requestId, signatureData.requestId),
          eq(cacSignatures.stepType, signatureData.stepType),
          eq(cacSignatures.userId, currentUser.id)
        )
      )
      .limit(1);

    if (existingSignature.length > 0) {
      return NextResponse.json(
        { error: 'Signature already exists for this step' },
        { status: 409 }
      );
    }

    // Get client information
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create signature record
    const newSignature = await db.insert(cacSignatures).values({
      requestId: signatureData.requestId,
      userId: currentUser.id,
      stepType: signatureData.stepType,
      certificateSubject: signatureData.certificateSubject,
      certificateIssuer: signatureData.certificateIssuer,
      certificateSerial: signatureData.certificateSerial,
      certificateThumbprint: signatureData.certificateThumbprint,
      certificateNotBefore: signatureData.certificateNotBefore,
      certificateNotAfter: signatureData.certificateNotAfter,
      signatureData: signatureData.signatureData,
      signedData: signatureData.signedData,
      signatureAlgorithm: signatureData.signatureAlgorithm,
      signatureReason: signatureData.signatureReason,
      signatureLocation: signatureData.signatureLocation,
      ipAddress: clientIP,
      userAgent: userAgent,
      isVerified: false, // Will be verified separately
      createdAt: new Date(),
    }).returning();

    // TODO: Queue signature for verification
    // await queueSignatureVerification(newSignature[0].id);

    return NextResponse.json({
      id: newSignature[0].id,
      status: 'created',
      message: 'Digital signature applied successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create signature error:', error);
    return NextResponse.json(
      { error: 'Failed to create signature' },
      { status: 500 }
    );
  }
}

// GET /api/signatures?requestId=X - Get signatures for a request
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const requestId = url.searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'requestId parameter required' },
        { status: 400 }
      );
    }

    // Verify user has access to this request
    const aftRequest = await db.select()
      .from(aftRequests)
      .where(eq(aftRequests.id, parseInt(requestId)))
      .limit(1);

    if (aftRequest.length === 0) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Get signatures for the request
    const signatures = await db.select({
      id: cacSignatures.id,
      stepType: cacSignatures.stepType,
      certificateSubject: cacSignatures.certificateSubject,
      certificateIssuer: cacSignatures.certificateIssuer,
      certificateThumbprint: cacSignatures.certificateThumbprint,
      signatureReason: cacSignatures.signatureReason,
      signatureLocation: cacSignatures.signatureLocation,
      isVerified: cacSignatures.isVerified,
      createdAt: cacSignatures.createdAt,
    })
      .from(cacSignatures)
      .where(eq(cacSignatures.requestId, parseInt(requestId)));

    return NextResponse.json(signatures);

  } catch (error) {
    console.error('Get signatures error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve signatures' },
      { status: 500 }
    );
  }
}

/**
 * Verify if user is authorized for the given signature step
 */
async function verifyStepAuthorization(
  user: AuthUser, 
  stepType: string, 
  aftRequest: AFTRequest
): Promise<boolean> {
  const userRoles = [user.primaryRole || user.role, ...(user.roles || [])];
  
  switch (stepType) {
    case 'dao_approval':
      return userRoles.includes('dao') && aftRequest.status === 'pending_dao';
    
    case 'approver_approval':
      return userRoles.includes('approver') && aftRequest.status === 'pending_approver';
    
    case 'cpso_approval':
      return userRoles.includes('cpso') && aftRequest.status === 'pending_cpso';
    
    case 'dta_completion':
      return userRoles.includes('dta') && 
             (aftRequest.status === 'pending_dta' || aftRequest.status === 'active_transfer');
    
    case 'sme_signature':
      return userRoles.includes('sme') && 
             (aftRequest.status === 'pending_sme' || aftRequest.status === 'pending_sme_signature');
    
    case 'custodian_disposition':
      return userRoles.includes('media_custodian') && 
             aftRequest.status === 'pending_media_custodian';
    
    default:
      return false;
  }
}