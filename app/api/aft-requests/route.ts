import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { db } from '@/lib/db/server';
import { aftRequests, AFTStatus, AFTStatusType } from '@/lib/db/schema';
import { z } from 'zod';
import { eq, and, desc, or } from 'drizzle-orm';

export const runtime = 'nodejs';

const fileDetailSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  fileType: z.string().min(1, 'File type is required'),
  classification: z.string().min(1, 'File classification is required'),
});

const createRequestSchema = z.object({
  // Section I: Media Control Number and Media Type
  mediaControlNumber: z.string().min(1, 'Media control number is required'),
  mediaType: z.enum(['CD-R', 'DVD-R', 'DVD-RDL', 'SSD', 'SSD-T'], {
    message: 'Valid media type is required',
  }),
  
  // Section II: Source/Destination Information
  sourceIS: z.string().min(1, 'Source IS is required'),
  sourceISClassification: z.string().min(1, 'Source IS classification is required'),
  destinationIS: z.string().min(1, 'Destination IS is required'),
  destinationISClassification: z.string().min(1, 'Destination IS classification is required'),
  mediaDisposition: z.string().optional(),
  overallClassification: z.string().min(1, 'Overall classification is required'),
  transferType: z.enum(['low-to-low', 'low-to-high', 'high-to-low', 'high-to-high'], {
    message: 'Valid transfer type is required',
  }),
  destinationFile: z.enum(['upload', 'download'], {
    message: 'Destination file type must be upload or download',
  }),
  isNonHumanReadable: z.boolean().default(false),
  processName: z.string().optional(),
  justificationForTransfer: z.string().min(1, 'Justification for transfer is required'),
  
  // File Details
  numberOfFiles: z.number().min(1, 'Must have at least one file'),
  files: z.array(fileDetailSchema).min(1, 'Must specify at least one file'),
  additionalFileListAttached: z.boolean().default(false),
  
  // Media Transportation
  mediaTransportedOutside: z.boolean().default(false),
  mediaDestination: z.string().optional(),
  destinationPOC: z.string().optional(),
  destinationAddress: z.string().optional(),
  mediaEncrypted: z.boolean().default(false),
  
  // Section 4: Dual Signature Configuration (Optional) - Removed as not part of current workflow
});

// Generate a unique request number
function generateRequestNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `AFT${year}${month}${day}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user can create requests
    const allowedRoles = ['requestor', 'admin', 'dta'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create requests' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createRequestSchema.parse(body);

    // Generate unique request number
    const requestNumber = generateRequestNumber();

    // Create transfer purpose from justification
    const transferPurpose = validatedData.justificationForTransfer;
    
    // Create data description from files
    const dataDescription = `${validatedData.numberOfFiles} files: ${validatedData.files.map(f => f.name).join(', ')}`;

    // Store ALL form data that doesn't have dedicated schema fields in transferData
    const formDataExtended = {
      // File details
      numberOfFiles: validatedData.numberOfFiles,
      files: validatedData.files,
      additionalFileListAttached: validatedData.additionalFileListAttached,
      
      // Missing form fields that don't have dedicated columns
      mediaControlNumber: validatedData.mediaControlNumber,
      mediaType: validatedData.mediaType,
      sourceISClassification: validatedData.sourceISClassification,
      destinationISClassification: validatedData.destinationISClassification,
      destinationFile: validatedData.destinationFile, // 'upload' or 'download'
      isNonHumanReadable: validatedData.isNonHumanReadable,
      processName: validatedData.processName,
      
      // Media transportation details
      mediaTransportedOutside: validatedData.mediaTransportedOutside,
      mediaDestination: validatedData.mediaDestination,
      destinationPOC: validatedData.destinationPOC,
      destinationAddress: validatedData.destinationAddress,
      mediaEncrypted: validatedData.mediaEncrypted
    };

    // All new requests start as draft - requestor must explicitly submit them
    const initialStatus: string = 'draft';

    // Create the request
    const newRequest = await db.insert(aftRequests).values({
      requestNumber,
      requestorId: user.id,
      status: initialStatus as AFTStatusType,
      
      // Auto-populate requestor info from user session
      requestorName: `${user.firstName} ${user.lastName}`,
      requestorOrg: user.organization || 'Not specified',
      requestorPhone: 'Not specified', 
      requestorEmail: user.email,
      
      // Map new form fields to existing schema
      transferPurpose,
      transferType: validatedData.transferType, // FIXED: use actual transfer type, not destinationFile
      classification: validatedData.overallClassification,
      caveatInfo: validatedData.mediaDisposition || null,
      dataDescription,
      transferData: JSON.stringify(formDataExtended),
      
      // Use source/dest IS as system names  
      sourceSystem: validatedData.sourceIS,
      sourceLocation: validatedData.sourceIS,
      sourceContact: null, // Form doesn't have source contact
      sourcePhone: null,
      sourceEmail: null,
      
      destSystem: validatedData.destinationIS,
      destLocation: validatedData.mediaTransportedOutside ? validatedData.destinationAddress : validatedData.destinationIS,
      destContact: validatedData.mediaTransportedOutside ? validatedData.destinationPOC : null,
      destPhone: null,
      destEmail: null,
      
      // Map technical details
      dataFormat: validatedData.mediaType,
      dataSize: `${validatedData.numberOfFiles} files`,
      transferMethod: validatedData.mediaTransportedOutside ? 'physical-transport' : 'direct-transfer',
      encryption: validatedData.mediaEncrypted ? 'encrypted' : 'none',
      compressionRequired: false,
      
      // Set dates (can be updated later)
      requestedStartDate: new Date(),
      requestedEndDate: null,
      urgencyLevel: 'medium', // Default urgency
      
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json({
      success: true,
      request: {
        id: newRequest[0].id,
        requestNumber: newRequest[0].requestNumber,
        status: newRequest[0].status,
      },
    });

  } catch (error) {
    console.error('Create request error:', error);
    
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
      { error: 'Failed to create request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const scope = searchParams.get('scope');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query based on user role and status parameter
    const whereConditions = [];
    
    // If status is 'all', show all requests to all users for team awareness
    const showAllRequests = status === 'all';
    
    // Handle explicit scope parameter first
    if (scope === 'my-requests') {
      // Always show only the user's own requests when explicitly requested
      whereConditions.push(eq(aftRequests.requestorId, user.id));
    } else if (!showAllRequests) {
      if (user.role === 'requestor') {
        // Requestors can only see their own requests
        whereConditions.push(eq(aftRequests.requestorId, user.id));
      } else if (['dao', 'approver', 'cpso'].includes(user.role)) {
        // Approvers can see pending requests
        if (user.role === 'dao') {
          // DAO can see submitted requests (new/resubmitted) and requests waiting for DAO approval
          whereConditions.push(or(
            eq(aftRequests.status, AFTStatus.SUBMITTED),
            eq(aftRequests.status, AFTStatus.PENDING_DAO)
          ));
        } else if (user.role === 'approver') {
          // Approver can see submitted requests (for non-high-to-low transfers) and pending_approver requests
          whereConditions.push(or(
            eq(aftRequests.status, AFTStatus.SUBMITTED),
            eq(aftRequests.status, AFTStatus.PENDING_APPROVER)
          ));
        } else if (user.role === 'cpso') {
          // CPSO can see all pending requests in the approval queue
          // but can only act on requests that have reached CPSO stage
          whereConditions.push(or(
            eq(aftRequests.status, AFTStatus.PENDING_DAO),
            eq(aftRequests.status, AFTStatus.PENDING_APPROVER),
            eq(aftRequests.status, AFTStatus.PENDING_CPSO)
          ));
        }
      } else if (user.role === 'dta') {
        // DTAs can see requests in the transfer chain of custody
        whereConditions.push(or(
          eq(aftRequests.status, AFTStatus.APPROVED),
          eq(aftRequests.status, AFTStatus.PENDING_DTA),
          eq(aftRequests.status, AFTStatus.ACTIVE_TRANSFER),
          eq(aftRequests.status, AFTStatus.PENDING_SME_SIGNATURE),
          eq(aftRequests.status, AFTStatus.PENDING_SME),
          eq(aftRequests.status, AFTStatus.PENDING_MEDIA_CUSTODIAN),
          eq(aftRequests.status, AFTStatus.COMPLETED),
          eq(aftRequests.status, AFTStatus.DISPOSED)
        ));
      } else if (user.role === 'sme') {
        // SMEs can see requests in the transfer chain that need SME validation
        whereConditions.push(or(
          eq(aftRequests.status, AFTStatus.PENDING_SME_SIGNATURE),
          eq(aftRequests.status, AFTStatus.PENDING_SME),
          eq(aftRequests.status, AFTStatus.PENDING_MEDIA_CUSTODIAN),
          eq(aftRequests.status, AFTStatus.COMPLETED),
          eq(aftRequests.status, AFTStatus.DISPOSED)
        ));
      } else if (user.role === 'media_custodian') {
        // Media Custodians can see requests ready for final disposition
        whereConditions.push(or(
          eq(aftRequests.status, AFTStatus.PENDING_MEDIA_CUSTODIAN),
          eq(aftRequests.status, AFTStatus.COMPLETED),
          eq(aftRequests.status, AFTStatus.DISPOSED)
        ));
      }
    }
    // When status=all, all users can see all requests for team awareness (no additional filters)

    // Add status filter if provided
    if (status && status !== 'all') {
      // Map frontend status names to enum values if needed
      const statusMapping: Record<string, string> = {
        'submitted': AFTStatus.SUBMITTED,
        'approved': AFTStatus.APPROVED,
        'rejected': AFTStatus.REJECTED,
        'in-progress': AFTStatus.PENDING_DTA,
        'completed': AFTStatus.COMPLETED,
        'cancelled': AFTStatus.CANCELLED,
      };
      const mappedStatus = statusMapping[status] || status;
      whereConditions.push(eq(aftRequests.status, mappedStatus as typeof AFTStatus[keyof typeof AFTStatus]));
    }

    // Fetch requests with basic info
    const whereClause = whereConditions.length > 0 ? (whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)) : undefined;
    
    const query = db.select({
      id: aftRequests.id,
      requestNumber: aftRequests.requestNumber,
      status: aftRequests.status,
      transferType: aftRequests.transferType,
      classification: aftRequests.classification,
      urgencyLevel: aftRequests.urgencyLevel,
      requestorName: aftRequests.requestorName,
      requestorOrg: aftRequests.requestorOrg,
      transferPurpose: aftRequests.transferPurpose,
      requestedStartDate: aftRequests.requestedStartDate,
      createdAt: aftRequests.createdAt,
      updatedAt: aftRequests.updatedAt,
      approvalData: aftRequests.approvalData,
      transferData: aftRequests.transferData,
    }).from(aftRequests);

    if (whereClause) {
      query.where(whereClause);
    }

    const requests = await query.limit(limit).offset(offset).orderBy(desc(aftRequests.createdAt));

    return NextResponse.json({ requests });

  } catch (error) {
    console.error('Get requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}