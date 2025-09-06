'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle,
  FileText,
  Image,
  Archive,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';

interface UploadedFile {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  createdAt: number;
}

interface FileUploadProps {
  requestId?: number | null;
  onFilesChange: (files: UploadedFile[]) => void;
  initialFiles?: UploadedFile[];
  disabled?: boolean;
  allowLocalUpload?: boolean; // Allow uploading without a saved request
}

export function FileUpload({ requestId, onFilesChange, initialFiles = [], disabled = false }: Omit<FileUploadProps, 'allowLocalUpload'>) {
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles);
  const [] = useState<File[]>([]); // For files before request is saved
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <Archive className="w-4 h-4 text-orange-500" />;
    return <File className="w-4 h-4" />;
  };

  const uploadFile = async (file: File) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in to upload files');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (requestId) {
      formData.append('requestId', requestId.toString());
    }

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const uploadedFile = await response.json();
      const newFiles = [...files, uploadedFile];
      setFiles(newFiles);
      onFilesChange(newFiles);
      
      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || disabled) return;

    setUploading(true);
    setUploadProgress(0);

    const fileArray = Array.from(selectedFiles);
    const totalFiles = fileArray.length;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      await uploadFile(file);
      setUploadProgress(((i + 1) / totalFiles) * 100);
    }

    setUploading(false);
    setUploadProgress(0);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  };

  const removeFile = async (fileId: number) => {
    // Note: We're not implementing delete API endpoint in this phase
    // Just remove from UI for now
    const newFiles = files.filter(f => f.id !== fileId);
    setFiles(newFiles);
    onFilesChange(newFiles);
    toast.success('File removed');
  };

  const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>File Attachments</span>
          {files.length > 0 && (
            <Badge variant="secondary">{files.length} file{files.length !== 1 ? 's' : ''}</Badge>
          )}
        </CardTitle>
        {totalSize > 0 && (
          <p className="text-sm text-muted-foreground">
            Total size: {formatFileSize(totalSize)}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        {!disabled && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
            <p className="text-sm text-muted-foreground mb-4">
              Support for PDF, DOC, XLS, images, and ZIP files (max 100MB per file)
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Choose Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.zip"
            />
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Uploading files...</span>
              <span className="text-sm text-muted-foreground">{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Files List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Uploaded Files</h4>
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getFileIcon(file.mimeType)}
                  <div>
                    <p className="font-medium text-sm">{file.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.fileSize)} • {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Maximum file size: 100MB per file</p>
          <p>• Allowed types: PDF, DOC, XLS, TXT, CSV, JPG, PNG, GIF, ZIP</p>
          <p>• Files are stored securely and only accessible to authorized personnel</p>
        </div>
      </CardContent>
    </Card>
  );
}