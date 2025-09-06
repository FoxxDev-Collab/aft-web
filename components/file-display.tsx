'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  File, 
  FileText,
  Image,
  Archive,
  FileSpreadsheet,
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface DisplayFile {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  createdAt: number;
  uploadedBy: string;
}

interface FileDisplayProps {
  requestId: number;
  title?: string;
  description?: string;
  canDownload?: boolean;
}

export function FileDisplay({ 
  requestId, 
  title = "Uploaded Files", 
  description = "Files uploaded by the requestor for this transfer",
  canDownload = true 
}: FileDisplayProps) {
  const [files, setFiles] = useState<DisplayFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);

  const loadFiles = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in to view files');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/files/list/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data.files);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to load files');
      }
    } catch (error) {
      console.error('Failed to load files:', error);
      toast.error('Error loading files');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const downloadFile = async (fileId: number, fileName: string) => {
    if (!canDownload) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in to download files');
      return;
    }

    try {
      setDownloading(fileId);
      const response = await fetch(`/api/files/download/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success(`${fileName} downloaded successfully`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" aria-label="Image file" />;
    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <Archive className="w-4 h-4 text-orange-500" />;
    return <File className="w-4 h-4 text-gray-500" />;
  };

  const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">Loading files...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <File className="w-5 h-5" />
              <span>{title}</span>
              {files.length > 0 && (
                <Badge variant="secondary">{files.length} file{files.length !== 1 ? 's' : ''}</Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          {totalSize > 0 && (
            <div className="text-right text-sm text-muted-foreground">
              <div>Total Size</div>
              <div className="font-medium">{formatFileSize(totalSize)}</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Files Uploaded</h3>
            <p className="text-muted-foreground">
              The requestor has not uploaded any files for this transfer yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center space-x-4">
                  {getFileIcon(file.mimeType)}
                  <div>
                    <p className="font-medium text-foreground">{file.originalName}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.fileSize)}</span>
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{file.uploadedBy}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                  </Badge>
                  {canDownload && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadFile(file.id, file.originalName)}
                      disabled={downloading === file.id}
                      className="flex items-center space-x-1"
                    >
                      <Download className="w-3 h-3" />
                      <span className="hidden sm:inline">
                        {downloading === file.id ? 'Downloading...' : 'Download'}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Security Notice */}
        {files.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Security Notice:</strong> These files are encrypted and stored securely. 
              All downloads are logged for audit purposes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}