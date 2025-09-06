import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/server';
import { aftAttachments, aftRequests, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    // Check authentication using the same method as other API endpoints
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId: requestIdParam } = await params;
    const requestId = parseInt(requestIdParam);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    // First check if user has access to this request
    const requestInfo = await db
      .select({
        id: aftRequests.id,
        requestorId: aftRequests.requestorId,
        dtaId: aftRequests.dtaId,
        smeId: aftRequests.smeId,
        mediaCustodianId: aftRequests.mediaCustodianId,
        approverId: aftRequests.approverId,
      })
      .from(aftRequests)
      .where(eq(aftRequests.id, requestId))
      .limit(1);

    if (requestInfo.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const request = requestInfo[0];

    // Check access
    const hasAccess = 
      request.requestorId === user.id ||
      request.dtaId === user.id ||
      request.smeId === user.id ||
      request.mediaCustodianId === user.id ||
      request.approverId === user.id ||
      user.role === 'admin';

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get files for this request
    const files = await db
      .select({
        id: aftAttachments.id,
        fileName: aftAttachments.fileName,
        originalName: aftAttachments.originalName,
        fileSize: aftAttachments.fileSize,
        mimeType: aftAttachments.mimeType,
        createdAt: aftAttachments.createdAt,
        uploadedBy: aftAttachments.uploadedBy,
        uploaderName: users.firstName,
        uploaderLastName: users.lastName,
      })
      .from(aftAttachments)
      .innerJoin(users, eq(aftAttachments.uploadedBy, users.id))
      .where(eq(aftAttachments.requestId, requestId))
      .orderBy(aftAttachments.createdAt);

    // Format the response
    const formattedFiles = files.map(file => ({
      id: file.id,
      fileName: file.fileName,
      originalName: file.originalName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      createdAt: file.createdAt,
      uploadedBy: `${file.uploaderName} ${file.uploaderLastName}`,
    }));

    return NextResponse.json({ files: formattedFiles });

  } catch (error) {
    console.error('List files error:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}