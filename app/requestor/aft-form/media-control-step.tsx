import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Disc, HardDrive } from 'lucide-react';
import { DriveInventory } from '@/lib/db/schema';

interface FormData {
  selectedDriveId?: number;
  dtaSelected: boolean;
  mediaControlNumber: string;
  mediaType: 'CD-R' | 'DVD-R' | 'DVD-RDL' | 'SSD' | 'SSD-T' | '';
}

interface IssuedDrive extends DriveInventory {
  userId: number;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  issuedAt: Date;
  expectedReturnAt: Date | null;
  sourceIS: string;
  destinationIS: string;
  mediaType: string;
}

interface MediaControlStepProps {
  data: FormData;
  updateData: (data: Partial<FormData>) => void;
}

export function MediaControlStep({ data, updateData }: MediaControlStepProps) {
  const [selectedDrive, setSelectedDrive] = useState<IssuedDrive | null>(null);
  const [loadingDrive, setLoadingDrive] = useState(false);

  useEffect(() => {
    if (data.selectedDriveId) {
      fetchSelectedDrive(data.selectedDriveId);
    }
  }, [data.selectedDriveId]);

  const fetchSelectedDrive = async (driveId: number) => {
    try {
      setLoadingDrive(true);
      const response = await fetch(`/api/drives/${driveId}`);
      if (response.ok) {
        const drive = await response.json();
        setSelectedDrive(drive);
      }
    } catch (error) {
      console.error('Error fetching drive details:', error);
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    updateData({ [field]: value });
  };

  const getMediaIcon = () => {
    if (data.mediaType === 'SSD' || data.mediaType === 'SSD-T') {
      return <HardDrive className="w-5 h-5" />;
    }
    return <Disc className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            {getMediaIcon()}
            Section I: Media Control Number and Media Type
          </CardTitle>
          <CardDescription>
            Specify the media control number and select the type of media being used for this transfer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!data.dtaSelected ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 border-2 border-yellow-600 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-yellow-600">!</span>
                </div>
                <div className="text-sm text-yellow-800">
                  <strong>DTA Selection Required:</strong> Please go back to Step 1 and select your Data Transfer Agent (DTA) first. 
                  The media control number and type will be automatically configured based on your DTA selection.
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="mediaControlNumber">Media Control Number *</Label>
                <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2">
                    {getMediaIcon()}
                    <span className="font-medium text-green-800">{data.mediaControlNumber}</span>
                    <span className="text-sm text-green-600">(Auto-assigned from DTA)</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Media control number automatically assigned from your selected DTA.
                </p>
              </div>
              
              {selectedDrive && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-3">Selected DTA Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-blue-800">Serial Number:</span>
                      <br />
                      <span className="text-blue-700">{selectedDrive.serialNumber}</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Capacity:</span>
                      <br />
                      <span className="text-blue-700">{selectedDrive.capacity}</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Classification:</span>
                      <br />
                      <span className="text-blue-700">{selectedDrive.classification}</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Media Type:</span>
                      <br />
                      <div className="flex items-center gap-1 text-blue-700">
                        {getMediaIcon()}
                        {selectedDrive.mediaType}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {data.dtaSelected && (
            <div>
              <Label htmlFor="mediaType">Media Type *</Label>
              <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2">
                  {getMediaIcon()}
                  <span className="font-medium text-green-800">{data.mediaType}</span>
                  <span className="text-sm text-green-600">(Auto-assigned from DTA)</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Media type automatically assigned from your selected DTA.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <h4 className="font-medium text-primary mb-2">Media Control Guidelines</h4>
        <ul className="text-sm text-primary/80 space-y-1">
          <li>• Media control numbers must be unique and traceable throughout the transfer process</li>
          <li>• Optical media (CD-R, DVD-R, DVD-RDL) requires destruction after transfer</li>
          <li>• SSD media requires sanitization after transfer completion</li>
          <li>• SSD-T (Trusted) provides additional security features for classified transfers</li>
        </ul>
      </div>
    </div>
  );
}