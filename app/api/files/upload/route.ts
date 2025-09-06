import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';
import { db } from '@/lib/db/server';
import { aftAttachments } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth-server';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/zip',
  'application/x-zip-compressed',
];

function generateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function sanitizeFilename(filename: string): string {
  // Remove any path components and dangerous characters
  return filename
    .replace(/^.*[\\\/]/, '') // Remove path
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
    .substring(0, 255); // Limit length
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication using the same method as other API endpoints
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const requestId = formData.get('requestId') as string;

    if (!file || !requestId) {
      return NextResponse.json({ error: 'File and requestId are required' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate filename and paths
    const timestamp = Date.now();
    const sanitizedName = sanitizeFilename(file.name);
    const fileName = `${timestamp}-${sanitizedName}`;
    const requestDir = join(process.cwd(), 'data', 'files-for-aft', requestId);
    const uploadsDir = join(requestDir, 'uploads');
    const filePath = join(uploadsDir, fileName);
    const relativePath = `${requestId}/uploads/${fileName}`;

    // Create directories if they don't exist
    if (!existsSync(requestDir)) {
      await mkdir(requestDir, { recursive: true });
    }
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Write file to disk
    await writeFile(filePath, buffer);

    // Generate checksum
    const checksum = generateChecksum(buffer);

    // Save to database
    const result = await db.insert(aftAttachments).values({
      requestId: parseInt(requestId),
      fileName,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      filePath: relativePath,
      checksum,
      uploadedBy: user.id,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json({
      id: result[0].id,
      fileName: result[0].fileName,
      originalName: result[0].originalName,
      fileSize: result[0].fileSize,
      mimeType: result[0].mimeType,
      createdAt: result[0].createdAt,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}