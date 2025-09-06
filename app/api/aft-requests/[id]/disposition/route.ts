import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth-server';
import { db } from '@/lib/db/server';
import { aftRequests, AFTStatus } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const runtime = 'nodejs';

const mediaDispositionSchema = z.object({
  mediaDisposition: z.object({
    opticalDestroyed: z.enum(['yes', 'no', 'na']),
    opticalRetained: z.enum(['yes', 'no', 'na']),
    ssdSanitized: z.enum(['yes', 'no', 'na']),
    custodianName: z.string().min(1, 'Custodian name is required'),
    custodianSignature: z.string().min(1, 'Custodian signature is required'),
    date: z.string().min(1, 'Date is required'),
  }),
  processedAt: z.string().optional(),
});

// Legacy schema for backwards compatibility
const dispositionSchema = z.object({
  dispositionType: z.enum(['completed', 'disposed'], {
    message: 'Valid disposition type is required'
  }),
  custodianName: z.string().min(1, 'Custodian name is required'),
  dispositionMethod: z.string().optional(),
  comments: z.string().optional(),
  mediaDetails: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
});


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('Media disposition request received');
    
    // Authenticate user
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      console.log('No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User attempting disposition:', user.email, user.role);

    // Check if user is a media custodian or admin
    if (user.role !== 'media_custodian' && user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Insufficient permissions to complete media disposition' 
      }, { status: 403 });
    }

    const { id } = await params;
    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    
    // Try the new Section V format first, then fall back to legacy
    let validatedData;
    let isNewFormat = false;
    
    try {
      validatedData = mediaDispositionSchema.parse(body);
      isNewFormat = true;
      console.log('Using Section V media disposition format');
    } catch (error) {
      // Try legacy format
      try {
        validatedData = dispositionSchema.parse(body);
        console.log('Using legacy disposition format');
      } catch (legacyError) {
        console.error('Neither format matched:', error, legacyError);
        return NextResponse.json({
          error: 'Invalid request format',
          details: 'Request must match either Section V media disposition format or legacy format'
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
    console.log('Current AFT status:', aftRequest.status);

    // Check if request is in correct status for disposition
    if (aftRequest.status !== AFTStatus.PENDING_MEDIA_CUSTODIAN) {
      return NextResponse.json({ 
        error: 'Request must be pending media custodian approval before disposition can be processed' 
      }, { status: 400 });
    }

    // Parse existing transfer data
    let existingTransferData = {};
    if (aftRequest.transferData && aftRequest.transferData.trim() !== '') {
      try {
        existingTransferData = JSON.parse(aftRequest.transferData);
      } catch (error) {
        console.warn('Failed to parse existing transfer data:', error);
      }
    }

    let dispositionRecord;
    let newStatus;

    if (isNewFormat) {
      // Section V format
      const sectionVData = validatedData as z.infer<typeof mediaDispositionSchema>;
      const { mediaDisposition } = sectionVData;
      
      dispositionRecord = {
        ...mediaDisposition,
        userId: user.id,
        processedBy: `${user.firstName} ${user.lastName}`,
        processedAt: sectionVData.processedAt || new Date().toISOString(),
      };

      // Determine final status based on media disposition
      const { opticalDestroyed, opticalRetained, ssdSanitized } = mediaDisposition;
      
      // If any media was retained or not fully disposed, mark as completed
      // If all applicable media was destroyed/sanitized, mark as disposed
      if ((opticalDestroyed === 'yes' || opticalDestroyed === 'na') && 
          (opticalRetained === 'no' || opticalRetained === 'na') && 
          (ssdSanitized === 'yes' || ssdSanitized === 'na')) {
        // All media properly disposed
        if (opticalDestroyed === 'yes' || ssdSanitized === 'yes') {
          newStatus = AFTStatus.DISPOSED;
        } else {
          newStatus = AFTStatus.COMPLETED;
        }
      } else if (opticalRetained === 'yes') {
        // Media was retained, so transfer is completed but not disposed
        newStatus = AFTStatus.COMPLETED;
      } else {
        newStatus = AFTStatus.COMPLETED;
      }

      console.log('Processing Section V media disposition for request:', aftRequest.requestNumber);
    } else {
      // Legacy format
      const legacyData = validatedData as z.infer<typeof dispositionSchema>;
      dispositionRecord = {
        dispositionType: legacyData.dispositionType,
        custodianName: legacyData.custodianName,
        dispositionMethod: legacyData.dispositionMethod,
        comments: legacyData.comments,
        mediaDetails: legacyData.mediaDetails,
        date: legacyData.date,
        custodianId: user.id,
        custodianEmail: user.email,
        completedAt: new Date().toISOString(),
      };

      newStatus = legacyData.dispositionType === 'disposed' ? AFTStatus.DISPOSED : AFTStatus.COMPLETED;
      console.log('Processing legacy disposition for request:', aftRequest.requestNumber);
    }

    // Update the AFT request with disposition data and new status
    await db
      .update(aftRequests)
      .set({
        status: newStatus,
        updatedAt: new Date(),
        transferData: JSON.stringify({
          ...existingTransferData,
          mediaDisposition: dispositionRecord
        }),
      })
      .where(eq(aftRequests.id, requestId));

    console.log('Media disposition completed successfully');

    return NextResponse.json({ 
      message: 'Media disposition processed successfully',
      status: newStatus,
      disposition: dispositionRecord
    });

  } catch (error) {
    console.error('Media disposition error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.issues?.map(e => `${e.path.join('.')}: ${e.message}`) || []
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to complete media disposition' 
    }, { status: 500 });
  }
}