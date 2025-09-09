'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, X } from 'lucide-react';

interface FileEntry {
  id: string;
  fileName: string;
  fileType: string;
  classification: string;
  description: string;
}

interface FileUploadStepProps {
  data: {
    manualFiles?: FileEntry[];
    [key: string]: unknown;
  };
  updateData: (updates: Record<string, unknown>) => void;
  requestId?: number | null;
}

export function FileUploadStep({ data, updateData }: Omit<FileUploadStepProps, 'requestId'>) {
  const [files, setFiles] = useState<FileEntry[]>(data.manualFiles || []);

  useEffect(() => {
    updateData({ 
      manualFiles: files,
      numberOfFiles: files.length 
    });
  }, [files, updateData]);

  const addFile = () => {
    const newFile: FileEntry = {
      id: Date.now().toString(),
      fileName: '',
      fileType: '',
      classification: '',
      description: ''
    };
    setFiles([...files, newFile]);
  };

  const updateFile = (id: string, field: keyof FileEntry, value: string) => {
    setFiles(files.map(file => 
      file.id === id ? { ...file, [field]: value } : file
    ));
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(file => file.id !== id));
  };

  const classificationOptions = [
    'UNCLASSIFIED',
    'CUI',
    'CONFIDENTIAL',
    'SECRET',
    'TOP SECRET'
  ];

  const fileTypeOptions = [
    'Document (.doc, .docx, .pdf)',
    'Spreadsheet (.xls, .xlsx, .csv)',
    'Image (.jpg, .png, .gif)',
    'Archive (.zip, .rar, .7z)',
    'Text (.txt, .log)',
    'Database (.db, .sql)',
    'Executable (.exe, .msi)',
    'Other'
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            File Information
          </CardTitle>
          <CardDescription>
            Manually specify the files that will be transferred. Provide detailed information for each file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {files.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No files specified yet</p>
              <Button onClick={addFile} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add File
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{files.length} file{files.length !== 1 ? 's' : ''}</Badge>
                </div>
                <Button onClick={addFile} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add File
                </Button>
              </div>

              <div className="space-y-4">
                {files.map((file, index) => (
                  <Card key={file.id} className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-medium">File {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`fileName-${file.id}`}>File Name *</Label>
                        <Input
                          id={`fileName-${file.id}`}
                          value={file.fileName}
                          onChange={(e) => updateFile(file.id, 'fileName', e.target.value)}
                          placeholder="e.g., document.pdf"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`fileType-${file.id}`}>File Type *</Label>
                        <Select
                          value={file.fileType}
                          onValueChange={(value) => updateFile(file.id, 'fileType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select file type" />
                          </SelectTrigger>
                          <SelectContent>
                            {fileTypeOptions.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`classification-${file.id}`}>Classification *</Label>
                        <Select
                          value={file.classification}
                          onValueChange={(value) => updateFile(file.id, 'classification', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select classification" />
                          </SelectTrigger>
                          <SelectContent>
                            {classificationOptions.map((classification) => (
                              <SelectItem key={classification} value={classification}>
                                {classification}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2 md:col-span-1">
                        <Label htmlFor={`description-${file.id}`}>Description</Label>
                        <Textarea
                          id={`description-${file.id}`}
                          value={file.description}
                          onChange={(e) => updateFile(file.id, 'description', e.target.value)}
                          placeholder="Brief description of file contents and purpose"
                          rows={3}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>File Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Files:</span>
                <br />
                {files.length}
              </div>
              <div>
                <span className="font-medium">Complete Entries:</span>
                <br />
                {files.filter(f => f.fileName && f.fileType && f.classification).length}
              </div>
              <div>
                <span className="font-medium">Highest Classification:</span>
                <br />
                {files.length > 0 ? getHighestClassification(files) : 'None'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">File Information Guidelines</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Provide accurate file names and types for each file to be transferred</li>
          <li>• Ensure classification levels are correctly specified</li>
          <li>• Include descriptions to help reviewers understand file contents</li>
          <li>• All required fields (*) must be completed before submission</li>
        </ul>
      </div>
    </div>
  );
}

function getHighestClassification(files: FileEntry[]): string {
  const classificationLevels = {
    'UNCLASSIFIED': 0,
    'CUI': 1,
    'CONFIDENTIAL': 2,
    'SECRET': 3,
    'TOP SECRET': 4
  };

  let highest = 'UNCLASSIFIED';
  let highestLevel = 0;

  files.forEach(file => {
    const level = classificationLevels[file.classification as keyof typeof classificationLevels];
    if (level > highestLevel) {
      highest = file.classification;
      highestLevel = level;
    }
  });

  return highest;
}