'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck, HardDrive, Disc } from 'lucide-react';
import { DriveInventory } from '@/lib/db/schema';

interface FormData {
  selectedDriveId?: number;
  mediaControlNumber: string;
  mediaType: 'CD-R' | 'DVD-R' | 'DVD-RDL' | 'SSD' | 'SSD-T' | '';
  dtaSelected: boolean;
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

interface DTASelectionStepProps {
  data: FormData;
  updateData: (data: Partial<FormData>) => void;
}

export function DTASelectionStep({ data, updateData }: DTASelectionStepProps) {
  const [issuedDrives, setIssuedDrives] = useState<IssuedDrive[]>([]);
  const [loadingDrives, setLoadingDrives] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState<IssuedDrive | null>(null);

  useEffect(() => {
    fetchIssuedDrives();
  }, []);

  useEffect(() => {
    if (data.selectedDriveId) {
      const drive = issuedDrives.find(d => d.id === data.selectedDriveId);
      setSelectedDrive(drive || null);
    }
  }, [data.selectedDriveId, issuedDrives]);

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

  const handleDriveSelection = (driveId: string) => {
    const selectedDrive = issuedDrives.find(d => d.id.toString() === driveId);
    if (selectedDrive) {
      updateData({
        selectedDriveId: selectedDrive.id,
        mediaControlNumber: selectedDrive.mediaController,
        mediaType: selectedDrive.mediaType as 'CD-R' | 'DVD-R' | 'DVD-RDL' | 'SSD' | 'SSD-T',
        dtaSelected: true
      });
      setSelectedDrive(selectedDrive);
    }
  };

  const getMediaIcon = (mediaType: string) => {
    if (mediaType === 'SSD' || mediaType === 'SSD-T') {
      return <HardDrive className="w-4 h-4" />;
    }
    return <Disc className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Step 1: Select Your DTA (Data Transfer Agent)
          </CardTitle>
          <CardDescription>
            Choose the drive that has been issued to you by the custodian. This will determine your media control number and available media types.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="dtaSelection">Available DTAs *</Label>
            <Select
              value={data.selectedDriveId?.toString() || ''}
              onValueChange={handleDriveSelection}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={loadingDrives ? "Loading available DTAs..." : "Select your assigned DTA"} />
              </SelectTrigger>
              <SelectContent>
                {issuedDrives.length === 0 && !loadingDrives ? (
                  <SelectItem value="no-drives" disabled>
                    No DTAs currently issued. Contact the custodian to request a drive.
                  </SelectItem>
                ) : (
                  issuedDrives.map((drive) => (
                    <SelectItem key={drive.id} value={drive.id.toString()}>
                      <div className="flex flex-col min-w-0 w-full">
                        <div className="flex items-center gap-2">
                          {getMediaIcon(drive.mediaType)}
                          <span className="font-medium">{drive.mediaController} - {drive.serialNumber}</span>
                          <Badge variant="outline" className="text-xs">
                            {drive.mediaType}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {drive.capacity} | {drive.classification} | Issued to: {drive.userFirstName} {drive.userLastName}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Select from drives currently issued by the custodian. This determines your DTA assignment and available media options.
            </p>
          </div>

          {selectedDrive && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  DTA Selected
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-green-800">Media Control Number:</span>
                    <br />
                    <span className="text-green-700">{selectedDrive.mediaController}</span>
                  </div>
                  <div>
                    <span className="font-medium text-green-800">Media Type:</span>
                    <br />
                    <div className="flex items-center gap-1 text-green-700">
                      {getMediaIcon(selectedDrive.mediaType)}
                      {selectedDrive.mediaType}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-green-800">Capacity:</span>
                    <br />
                    <span className="text-green-700">{selectedDrive.capacity}</span>
                  </div>
                  <div>
                    <span className="font-medium text-green-800">Classification:</span>
                    <br />
                    <Badge variant="secondary" className="text-green-700">
                      {selectedDrive.classification}
                    </Badge>
                  </div>
                </div>
                
                <div className="bg-green-100 border border-green-300 rounded-lg p-3 mt-4">
                  <p className="text-sm text-green-800">
                    <strong>✓ DTA Confirmed:</strong> You can now proceed to configure your transfer details. 
                    The media control number and type have been automatically set based on your selected DTA.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <h4 className="font-medium text-primary mb-2">DTA Selection Guidelines</h4>
        <ul className="text-sm text-primary/80 space-y-1">
          <li>• DTA (Data Transfer Agent) selection is required before configuring transfer details</li>
          <li>• Each DTA corresponds to a specific media type and control number</li>
          <li>• Only drives issued by the custodian will appear in the selection list</li>
          <li>• Your DTA selection determines the available media capacity and classification level</li>
          <li>• Contact the custodian if you need a different drive or media type</li>
        </ul>
      </div>
    </div>
  );
}
