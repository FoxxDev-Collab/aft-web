import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, ArrowUpDown, Shield } from 'lucide-react';

interface FormData {
  sourceIS: string;
  sourceISClassification: string;
  destinationIS: string;
  destinationISClassification: string;
  mediaDisposition: string;
  overallClassification: string;
  transferType: 'low-to-low' | 'low-to-high' | 'high-to-low' | 'high-to-high' | '';
  destinationFile: 'upload' | 'download' | '';
  isNonHumanReadable: boolean;
  processName: string;
  justificationForTransfer: string;
}

interface SourceDestinationStepProps {
  data: FormData;
  updateData: (data: Partial<FormData>) => void;
}

export function SourceDestinationStep({ data, updateData }: SourceDestinationStepProps) {
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    updateData({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Database className="w-5 h-5" />
            Section II: Source and Destination Information
          </CardTitle>
          <CardDescription>
            Specify the source and destination information systems and transfer details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <Label htmlFor="sourceIS">Source IS *</Label>
                <Input
                  id="sourceIS"
                  type="text"
                  placeholder="Source Information System"
                  value={data.sourceIS}
                  onChange={(e) => handleInputChange('sourceIS', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sourceISClassification">Source IS Classification *</Label>
                <Select
                  value={data.sourceISClassification}
                  onValueChange={(value) => handleInputChange('sourceISClassification', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source classification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unclassified">UNCLASSIFIED</SelectItem>
                    <SelectItem value="cui">CUI</SelectItem>
                    <SelectItem value="secret">SECRET</SelectItem>
                    <SelectItem value="top-secret">TOP SECRET</SelectItem>
                    <SelectItem value="top-secret-sci">TOP SECRET//SCI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="destinationIS">Destination IS *</Label>
                <Input
                  id="destinationIS"
                  type="text"
                  placeholder="Destination Information System"
                  value={data.destinationIS}
                  onChange={(e) => handleInputChange('destinationIS', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="destinationISClassification">Destination IS Classification *</Label>
                <Select
                  value={data.destinationISClassification}
                  onValueChange={(value) => handleInputChange('destinationISClassification', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination classification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unclassified">UNCLASSIFIED</SelectItem>
                    <SelectItem value="cui">CUI</SelectItem>
                    <SelectItem value="secret">SECRET</SelectItem>
                    <SelectItem value="top-secret">TOP SECRET</SelectItem>
                    <SelectItem value="top-secret-sci">TOP SECRET//SCI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="mediaDisposition">Media Disposition</Label>
            <Select
              value={data.mediaDisposition}
              onValueChange={(value) => handleInputChange('mediaDisposition', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select media disposition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retain">Retain</SelectItem>
                <SelectItem value="destroy">Destroy</SelectItem>
                <SelectItem value="sanitize">Sanitize</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Classification Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="overallClassification">Overall Classification *</Label>
              <Select
                value={data.overallClassification}
                onValueChange={(value) => handleInputChange('overallClassification', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select overall classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unclassified">UNCLASSIFIED</SelectItem>
                  <SelectItem value="cui">CUI</SelectItem>
                  <SelectItem value="secret">SECRET</SelectItem>
                  <SelectItem value="top-secret">TOP SECRET</SelectItem>
                  <SelectItem value="top-secret-sci">TOP SECRET//SCI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5" />
            Transfer Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="transferType">Transfer Type *</Label>
            <Select
              value={data.transferType}
              onValueChange={(value) => handleInputChange('transferType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transfer type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low-to-low">LOW → LOW</SelectItem>
                <SelectItem value="low-to-high">LOW → HIGH</SelectItem>
                <SelectItem value="high-to-low">HIGH → LOW</SelectItem>
                <SelectItem value="high-to-high">HIGH → HIGH</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {data.transferType === 'high-to-low' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>HIGH-to-LOW Transfer Notice:</strong> This transfer requires additional approval from the Designated Authorizing Official (DAO) as specified in the ACDS AFT SOP for High-to-Low transfers. Additional review time may be required.
                </div>
              </div>
            </div>
          )}

          <div>
            <Label className="text-base font-medium">Destination File *</Label>
            <RadioGroup
              value={data.destinationFile}
              onValueChange={(value) => handleInputChange('destinationFile', value)}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="upload" id="upload" />
                <Label htmlFor="upload">Upload (Add Files to IS)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="download" id="download" />
                <Label htmlFor="download">Download (Remove Files from IS)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isNonHumanReadable"
              checked={data.isNonHumanReadable}
              onCheckedChange={(checked) => handleInputChange('isNonHumanReadable', !!checked)}
            />
            <Label htmlFor="isNonHumanReadable" className="text-sm">
              Non-Human Readable Content
            </Label>
          </div>

          {data.isNonHumanReadable && (
            <div>
              <Label htmlFor="processName">Process Name (Use Procedure Document # As Applicable)</Label>
              <Input
                id="processName"
                type="text"
                placeholder="Enter process name or procedure document number"
                value={data.processName}
                onChange={(e) => handleInputChange('processName', e.target.value)}
              />
            </div>
          )}

          <div>
            <Label htmlFor="justificationForTransfer">Justification for Transfer *</Label>
            <Textarea
              id="justificationForTransfer"
              placeholder="Provide detailed justification for this transfer..."
              value={data.justificationForTransfer}
              onChange={(e) => handleInputChange('justificationForTransfer', e.target.value)}
              className="min-h-[100px]"
              required
            />
          </div>
        </CardContent>
      </Card>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <h4 className="font-medium text-primary mb-2">Transfer Requirements</h4>
        <ul className="text-sm text-primary/80 space-y-1">
          <li>• Overall classification must be equal to or higher than individual file classifications</li>
          <li>• <strong>HIGH-to-LOW transfers</strong> require additional approval from Designated Authorizing Official (DAO)</li>
          <li>• Non-human readable content requires specific process documentation</li>
          <li>• Justification must clearly state business need for the transfer</li>
          <li>• All transfers must comply with ACDS AFT Standard Operating Procedures</li>
        </ul>
      </div>
    </div>
  );
}