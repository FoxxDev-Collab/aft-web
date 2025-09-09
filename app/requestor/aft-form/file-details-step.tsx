import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface FormData {
  numberOfFiles: number;
  fileDescription: string;
  additionalFileListAttached: boolean;
}

interface FileDetailsStepProps {
  data: FormData;
  updateData: (data: Partial<FormData>) => void;
}

export function FileDetailsStep({ data, updateData }: FileDetailsStepProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="w-5 h-5" />
            File Transfer Information
          </CardTitle>
          <CardDescription>
            Provide details about the files to be transferred. File upload functionality has been disabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="numberOfFiles">Number of Files</Label>
            <Input
              id="numberOfFiles"
              type="number"
              min="1"
              value={data.numberOfFiles || ''}
              onChange={(e) => updateData({ numberOfFiles: parseInt(e.target.value) || 0 })}
              placeholder="Enter number of files"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fileDescription">File Description</Label>
            <Textarea
              id="fileDescription"
              value={data.fileDescription || ''}
              onChange={(e) => updateData({ fileDescription: e.target.value })}
              placeholder="Describe the files to be transferred (names, types, purposes, etc.)"
              rows={4}
            />
          </div>
          
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">File Transfer Guidelines</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Provide accurate count and description of files to be transferred</li>
          <li>• File names should not contain sensitive or classified information</li>
          <li>• If you have more than 10 files, check &quot;Additional File List(s) Attached&quot;</li>
          <li>• Executable files require additional security review and approval</li>
          <li>• All file details will be reviewed by security personnel before transfer</li>
        </ul>
      </div>
    </div>
  );
}