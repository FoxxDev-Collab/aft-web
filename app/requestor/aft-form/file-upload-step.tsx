'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/file-upload';

interface FileUploadStepProps {
  data: Record<string, unknown>;
  updateData: (updates: Record<string, unknown>) => void;
  requestId?: number | null;
}

interface UploadedFile {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  createdAt: number;
}

export function FileUploadStep({ updateData, requestId }: Omit<FileUploadStepProps, 'data'>) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const loadExistingFiles = useCallback(async (): Promise<void> => {
    if (!requestId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/files/list/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setFiles(result.files);
      }
    } catch (error) {
      console.error('Failed to load existing files:', error);
    }
  }, [requestId]);

  useEffect(() => {
    // Load existing files if we have a request ID (editing mode)
    if (requestId) {
      loadExistingFiles();
    }
  }, [requestId, loadExistingFiles]);

  const handleFilesChange = (newFiles: UploadedFile[]) => {
    setFiles(newFiles);
    // Update form data to include file information
    updateData({ 
      uploadedFiles: newFiles,
      numberOfFiles: newFiles.length 
    });
  };

  // Show message if no requestId (new request that hasn't been saved yet)
  const needsSaveFirst = !requestId;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>File Upload</CardTitle>
          <CardDescription>
            Upload the files that need to be transferred. Files will be securely stored and made available to the DTA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {needsSaveFirst ? (
            <div className="text-center py-8">
              <div className="bg-muted/50 rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Save Request First</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You need to save your request as a draft before you can upload files.
                </p>
                <p className="text-xs text-muted-foreground">
                  Click &ldquo;Save as Draft&rdquo; in the review step to enable file uploads.
                </p>
              </div>
            </div>
          ) : (
            <FileUpload
              requestId={requestId}
              onFilesChange={handleFilesChange}
              initialFiles={files}
            />
          )}
        </CardContent>
      </Card>

      {/* File Summary */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Files:</span>
                <br />
                {files.length}
              </div>
              <div>
                <span className="font-medium">Total Size:</span>
                <br />
                {formatFileSize(files.reduce((sum, f) => sum + f.fileSize, 0))}
              </div>
              <div>
                <span className="font-medium">Last Upload:</span>
                <br />
                {files.length > 0 ? new Date(Math.max(...files.map(f => f.createdAt))).toLocaleDateString() : 'None'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}