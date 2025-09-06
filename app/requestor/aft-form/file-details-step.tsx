import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { SimpleFileUpload } from '@/components/simple-file-upload';

interface FormData {
  uploadedFiles: File[];
  additionalFileListAttached: boolean;
}

interface FileDetailsStepProps {
  data: FormData;
  updateData: (data: Partial<FormData>) => void;
}

export function FileDetailsStep({ data, updateData }: FileDetailsStepProps) {
  const handleFilesChange = (files: File[]) => {
    updateData({ uploadedFiles: files });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="w-5 h-5" />
            File Upload and Transfer Information
          </CardTitle>
          <CardDescription>
            Upload the files to be transferred. File details will be automatically detected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="additionalFileListAttached"
              checked={data.additionalFileListAttached}
              onCheckedChange={(checked) => updateData({ additionalFileListAttached: !!checked })}
            />
            <Label htmlFor="additionalFileListAttached" className="text-sm">
              Additional File List(s) Attached (for transfers with more than 10 files)
            </Label>
          </div>
        </CardContent>
      </Card>

      <SimpleFileUpload
        onFilesChange={handleFilesChange}
        initialFiles={data.uploadedFiles || []}
        maxFiles={10}
      />

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-900 mb-2">File Upload Guidelines</h4>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• Upload all files that will be included in this transfer</li>
          <li>• Files are automatically validated for type and size limits</li>
          <li>• If you have more than 10 files, check &quot;Additional File List(s) Attached&quot;</li>
          <li>• Executable files require additional security review and approval</li>
          <li>• File names should not contain sensitive or classified information</li>
          <li>• All files will be stored securely and only accessible to authorized personnel</li>
        </ul>
      </div>
    </div>
  );
}