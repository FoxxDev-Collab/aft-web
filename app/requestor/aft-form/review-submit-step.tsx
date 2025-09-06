import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';


interface FormData {
  // Section I: Media Control Number and Media Type
  mediaControlNumber: string;
  mediaType: 'CD-R' | 'DVD-R' | 'DVD-RDL' | 'SSD' | 'SSD-T' | '';
  
  // Section II: Source/Destination Information
  sourceIS: string;
  sourceISClassification: string;
  destinationIS: string;
  destinationISClassification: string;
  mediaDisposition: string;
  overallClassification: string;
  transferType: string;
  destinationFile: 'upload' | 'download' | '';
  isNonHumanReadable: boolean;
  processName: string;
  justificationForTransfer: string;
  
  // File Details
  uploadedFiles: File[];
  additionalFileListAttached: boolean;
  
  // Media Transportation
  mediaTransportedOutside: boolean;
  mediaDestination: string;
  destinationPOC: string;
  destinationAddress: string;
  mediaEncrypted: boolean;
}

interface ReviewSubmitStepProps {
  data: FormData;
  onSubmit?: () => Promise<void>;
  isSubmitting?: boolean;
}

export function ReviewSubmitStep({ data }: ReviewSubmitStepProps) {
  const getClassificationColor = (classification: string) => {
    switch (classification.toLowerCase()) {
      case 'unclassified': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cui': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'confidential': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'secret': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'top-secret': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getMediaTypeIcon = (mediaType: string) => {
    if (mediaType === 'SSD' || mediaType === 'SSD-T') {
      return '💾';
    }
    return '💿';
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Review Your AFT Request</h2>
        <p className="text-muted-foreground">
          Please review all information below before submitting your AFT request. The requestor information will be automatically populated from your user account.
        </p>
      </div>

      {/* Section I: Media Control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Section I: Media Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Media Control Number</p>
              <p className="text-foreground font-mono">{data.mediaControlNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Media Type</p>
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getMediaTypeIcon(data.mediaType)}</span>
                <Badge variant="outline">{data.mediaType}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section II: Source & Destination */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Section II: Source & Destination Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Source IS</p>
                <p className="text-foreground">{data.sourceIS}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Source IS Classification</p>
                <Badge className={getClassificationColor(data.sourceISClassification)}>
                  {data.sourceISClassification.toUpperCase().replace('-', '//').replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Destination IS</p>
                <p className="text-foreground">{data.destinationIS}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Destination IS Classification</p>
                <Badge className={getClassificationColor(data.destinationISClassification)}>
                  {data.destinationISClassification.toUpperCase().replace('-', '//').replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
          
          {data.mediaDisposition && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Media Disposition</p>
              <Badge variant="outline" className="capitalize">
                {data.mediaDisposition}
              </Badge>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Overall Classification</p>
            <Badge className={getClassificationColor(data.overallClassification)}>
              {data.overallClassification.toUpperCase()}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Transfer Type</p>
              <Badge variant="outline">
                {data.transferType.toUpperCase().replace('-TO-', ' → ')}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Destination File</p>
              <Badge variant="outline">
                {data.destinationFile.charAt(0).toUpperCase() + data.destinationFile.slice(1)}
              </Badge>
            </div>
          </div>
          
          {data.isNonHumanReadable && data.processName && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Process Name (Non-Human Readable)</p>
              <p className="text-foreground">{data.processName}</p>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Justification for Transfer</p>
            <p className="text-foreground">{data.justificationForTransfer}</p>
          </div>
        </CardContent>
      </Card>

      {/* File Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">File Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Number of Files</p>
              <p className="text-lg font-semibold text-foreground">{data.uploadedFiles.length}</p>
            </div>
            {data.additionalFileListAttached && (
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Additional File List Attached
              </Badge>
            )}
          </div>
          
          <div className="space-y-3">
            {data.uploadedFiles.map((file, index) => (
              <div key={index} className="border rounded-lg p-3 bg-muted/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Name</p>
                    <p className="text-sm text-foreground">{file.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Type</p>
                    <p className="text-sm text-foreground">{file.type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Size</p>
                    <p className="text-sm text-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Media Transportation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Media Transportation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Transported Outside Approved Area</p>
              <Badge variant={data.mediaTransportedOutside ? "destructive" : "default"}>
                {data.mediaTransportedOutside ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Media Encrypted</p>
              <Badge variant={data.mediaEncrypted ? "default" : "secondary"}>
                {data.mediaEncrypted ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
          
          {data.mediaTransportedOutside && (
            <div className="space-y-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Media Destination</p>
                <p className="text-foreground">{data.mediaDestination}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Destination POC</p>
                <p className="text-foreground">{data.destinationPOC}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Destination Address</p>
                <p className="text-foreground">{data.destinationAddress}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}