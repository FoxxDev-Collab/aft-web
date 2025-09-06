import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Shield, Lock } from 'lucide-react';

interface FormData {
  mediaTransportedOutside: boolean;
  mediaDestination: string;
  destinationPOC: string;
  destinationAddress: string;
  mediaEncrypted: boolean;
}

interface MediaTransportationStepProps {
  data: FormData;
  updateData: (data: Partial<FormData>) => void;
}

export function MediaTransportationStep({ data, updateData }: MediaTransportationStepProps) {
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    updateData({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Media Transportation
          </CardTitle>
          <CardDescription>
            Specify transportation requirements and destination details if media will be transported outside an approved area.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium">
              Will media be transported outside an approved area? *
            </Label>
            <RadioGroup
              value={data.mediaTransportedOutside ? 'yes' : 'no'}
              onValueChange={(value) => handleInputChange('mediaTransportedOutside', value === 'yes')}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="transport-yes" />
                <Label htmlFor="transport-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="transport-no" />
                <Label htmlFor="transport-no">No</Label>
              </div>
            </RadioGroup>
          </div>

          {data.mediaTransportedOutside && (
            <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-3">Transportation Details Required</h4>
              
              <div>
                <Label htmlFor="mediaDestination">Media Destination *</Label>
                <Input
                  id="mediaDestination"
                  type="text"
                  placeholder="Enter media destination"
                  value={data.mediaDestination}
                  onChange={(e) => handleInputChange('mediaDestination', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="destinationPOC">Destination POC / Customer Name *</Label>
                <Input
                  id="destinationPOC"
                  type="text"
                  placeholder="Enter point of contact name"
                  value={data.destinationPOC}
                  onChange={(e) => handleInputChange('destinationPOC', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="destinationAddress">Destination Address / Location *</Label>
                <Textarea
                  id="destinationAddress"
                  placeholder="Enter complete destination address"
                  value={data.destinationAddress}
                  onChange={(e) => handleInputChange('destinationAddress', e.target.value)}
                  className="min-h-[80px]"
                  required
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Media Encryption
          </CardTitle>
          <CardDescription>
            Encryption requirements for media transport outside of controlled areas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm text-primary/80">
                <strong>Security Requirement:</strong> Cryptographic mechanisms during transport outside 
                of controlled areas shall be either an NSA or FIPS 140-2 compliant algorithm. [MP-5(4)]
              </div>
            </div>
          </div>

          <div>
            <Label className="text-base font-medium">Will Media be Encrypted? *</Label>
            <RadioGroup
              value={data.mediaEncrypted ? 'yes' : 'no'}
              onValueChange={(value) => handleInputChange('mediaEncrypted', value === 'yes')}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="encrypted-yes" />
                <Label htmlFor="encrypted-yes">Yes - Media will be encrypted</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="encrypted-no" />
                <Label htmlFor="encrypted-no">No - Media will not be encrypted</Label>
              </div>
            </RadioGroup>
            
            {data.mediaTransportedOutside && !data.mediaEncrypted && (
              <div className="mt-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                  <strong>Warning:</strong> Media being transported outside controlled areas without 
                  encryption may require additional security approvals and justification.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg text-primary">AFT Requester Certification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-foreground leading-relaxed">
              <strong>I certify that</strong> the above file(s)/media to be transferred to/from the IS 
              are required to support the development and sustainment contractual efforts on the ACDS contract.
            </p>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-muted-foreground">
                By proceeding to submit this request, you are providing your digital certification 
                of the above statement. Your name, date, and digital signature will be automatically 
                recorded upon submission.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h4 className="font-medium text-orange-900 mb-2">Transportation Guidelines</h4>
        <ul className="text-sm text-orange-800 space-y-1">
          <li>• Media transported outside approved areas requires additional security measures</li>
          <li>• All transported media must be properly logged and tracked</li>
          <li>• Encryption is strongly recommended for all classified or sensitive media</li>
          <li>• Transportation must comply with physical security protocols</li>
          <li>• Point of contact must be authorized to receive the media</li>
        </ul>
      </div>
    </div>
  );
}