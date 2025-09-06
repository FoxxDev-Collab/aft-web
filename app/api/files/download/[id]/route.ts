import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { db } from '@/lib/db/server';
import { aftAttachments, aftRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication using the same method as other API endpoints
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const fileId = parseInt(id);
    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    // Get file info with request details for access control
    const fileInfo = await db
      .select({
        id: aftAttachments.id,
        fileName: aftAttachments.fileName,
        originalName: aftAttachments.originalName,
        fileSize: aftAttachments.fileSize,
        mimeType: aftAttachments.mimeType,
        filePath: aftAttachments.filePath,
        requestId: aftAttachments.requestId,
        uploadedBy: aftAttachments.uploadedBy,
        requestStatus: aftRequests.status,
        requestorId: aftRequests.requestorId,
        dtaId: aftRequests.dtaId,
        smeId: aftRequests.smeId,
        mediaCustodianId: aftRequests.mediaCustodianId,
        approverId: aftRequests.approverId,
      })
      .from(aftAttachments)
      .innerJoin(aftRequests, eq(aftAttachments.requestId, aftRequests.id))
      .where(eq(aftAttachments.id, fileId))
      .limit(1);

    if (fileInfo.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const file = fileInfo[0];

    // Access control: Check if user has permission to download this file
    const hasAccess = 
      file.uploadedBy === user.id || // Uploader can download
      file.requestorId === user.id || // Requestor can download
      file.dtaId === user.id || // Assigned DTA can download
      file.smeId === user.id || // Assigned SME can download
      file.mediaCustodianId === user.id || // Assigned custodian can download
      file.approverId === user.id || // Assigned approver can download
      user.role === 'admin'; // Admins can download

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build full file path
    const fullPath = join(process.cwd(), 'data', 'files-for-aft', file.filePath);

    // Check if file exists on disk
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    // Read file from disk
    const fileBuffer = await readFile(fullPath);

    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', file.mimeType || 'application/octet-stream');
    headers.set('Content-Length', fileBuffer.length.toString());
    headers.set('Content-Disposition', `attachment; filename="${file.originalName}"`);

    // Log download for audit trail (optional)
    console.log(`File downloaded: ${file.originalName} by user ${user.id} (${user.role})`);

    return new NextResponse(fileBuffer as BodyInit, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}