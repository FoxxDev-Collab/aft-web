import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Disc, HardDrive } from 'lucide-react';
import { DriveInventory } from '@/lib/db/schema';

interface FormData {
  mediaControlNumber: string;
  mediaType: 'CD-R' | 'DVD-R' | 'DVD-RDL' | 'SSD' | 'SSD-T' | '';
  selectedDriveId?: number;
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
  const [issuedDrives, setIssuedDrives] = useState<IssuedDrive[]>([]);
  const [loadingDrives, setLoadingDrives] = useState(false);

  useEffect(() => {
    fetchIssuedDrives();
  }, []);

  const fetchIssuedDrives = async () => {
    try {
      setLoadingDrives(true);
      const response = await fetch('/api/drives/issued');
      if (response.ok) {
        const drives = await response.json();
        setIssuedDrives(drives);
      }
    } catch (error) {
      console.error('Error fetching issued drives:', error);
    } finally {
      setLoadingDrives(false);
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
          <div>
            <Label htmlFor="mediaControlNumber">Media Control Number *</Label>
            <Select
              value={data.mediaControlNumber}
              onValueChange={(value) => {
                // When a drive is selected, also set the selectedDriveId and auto-select media type
                const selectedDrive = issuedDrives.find(d => d.mediaController === value);
                if (selectedDrive) {
                  handleInputChange('mediaControlNumber', value);
                  handleInputChange('selectedDriveId', selectedDrive.id);
                  // Auto-select media type from the drive's actual media type
                  handleInputChange('mediaType', selectedDrive.mediaType);
                } else {
                  handleInputChange('mediaControlNumber', value);
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={loadingDrives ? "Loading drives..." : "Select media control number"} />
              </SelectTrigger>
              <SelectContent>
                {issuedDrives.length === 0 && !loadingDrives ? (
                  <SelectItem value="no-drives" disabled>
                    No drives currently issued. Contact the custodian to request a drive.
                  </SelectItem>
                ) : (
                  issuedDrives.map((drive) => (
                    <SelectItem key={drive.id} value={drive.mediaController}>
                      <div className="flex flex-col min-w-0 w-full">
                        <span className="font-medium">{drive.mediaController} - {drive.serialNumber}</span>
                        <span className="text-xs text-muted-foreground">
                          Issued to: {drive.userFirstName} {drive.userLastName} | {drive.capacity} | {drive.classification}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Select from drives currently issued by the custodian. This determines your DTA assignment.
            </p>
          </div>

          <div>
            <Label htmlFor="mediaType">Media Type *</Label>
            <Select
              value={data.mediaType}
              onValueChange={(value) => handleInputChange('mediaType', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select media type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CD-R">
                  <div className="flex items-center gap-2">
                    <Disc className="w-4 h-4" />
                    CD-R (Compact Disc Recordable)
                  </div>
                </SelectItem>
                <SelectItem value="DVD-R">
                  <div className="flex items-center gap-2">
                    <Disc className="w-4 h-4" />
                    DVD-R (DVD Recordable)
                  </div>
                </SelectItem>
                <SelectItem value="DVD-RDL">
                  <div className="flex items-center gap-2">
                    <Disc className="w-4 h-4" />
                    DVD-RDL (DVD Recordable Dual Layer)
                  </div>
                </SelectItem>
                <SelectItem value="SSD">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    SSD (Solid State Drive)
                  </div>
                </SelectItem>
                <SelectItem value="SSD-T">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    SSD-T (Solid State Drive - Trusted)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Select the physical media type that will be used for this transfer
            </p>
          </div>

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