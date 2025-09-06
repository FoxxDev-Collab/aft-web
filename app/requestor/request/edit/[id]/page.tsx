'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { MediaControlStep } from '@/app/requestor/aft-form/media-control-step';
import { SourceDestinationStep } from '@/app/requestor/aft-form/source-destination-step';
import { FileDetailsStep } from '@/app/requestor/aft-form/file-details-step';
import { FileUploadStep } from '@/app/requestor/aft-form/file-upload-step';
import { MediaTransportationStep } from '@/app/requestor/aft-form/media-transportation-step';
import { ReviewSubmitStep } from '@/app/requestor/aft-form/review-submit-step';

interface FileDetail {
  name: string;
  fileType: string;
  classification: string;
}

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
  transferType: 'low-to-low' | 'low-to-high' | 'high-to-low' | 'high-to-high' | '';
  destinationFile: 'upload' | 'download' | '';
  isNonHumanReadable: boolean;
  processName: string;
  justificationForTransfer: string;
  
  // File Details
  numberOfFiles: number;
  files: FileDetail[];
  additionalFileListAttached: boolean;
  uploadedFiles: File[];
  
  // Media Transportation
  mediaTransportedOutside: boolean;
  mediaDestination: string;
  destinationPOC: string;
  destinationAddress: string;
  mediaEncrypted: boolean;
}

interface RequestData {
  id: number;
  requestNumber: string;
  status: string;
  requestorId: number;
  requestorName: string;
  requestorOrg: string;
  requestorPhone: string;
  requestorEmail: string;
  transferPurpose: string;
  transferType: string;
  classification: string;
  dataDescription: string;
  sourceSystem?: string;
  destSystem?: string;
  destLocation?: string;
  dataFormat?: string;
  encryption?: string;
  transferMethod?: string;
  requestedStartDate?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

const initialFormData: FormData = {
  // Section I
  mediaControlNumber: '',
  mediaType: '',
  
  // Section II
  sourceIS: '',
  sourceISClassification: '',
  destinationIS: '',
  destinationISClassification: '',
  mediaDisposition: '',
  overallClassification: '',
  transferType: '',
  destinationFile: '',
  isNonHumanReadable: false,
  processName: '',
  justificationForTransfer: '',
  
  // File Details
  numberOfFiles: 1,
  files: [{ name: '', fileType: '', classification: '' }],
  additionalFileListAttached: false,
  uploadedFiles: [],
  
  // Media Transportation
  mediaTransportedOutside: false,
  mediaDestination: '',
  destinationPOC: '',
  destinationAddress: '',
  mediaEncrypted: false,
};

const steps = [
  { title: 'Media Control', description: 'Media control number and type' },
  { title: 'Source & Destination', description: 'Information systems and classification' },
  { title: 'File Details', description: 'Files to transfer and justification' },
  { title: 'File Upload', description: 'Upload actual files for transfer' },
  { title: 'Media Transportation', description: 'Transportation and encryption details' },
  { title: 'Review & Submit', description: 'Final review and submission' },
];

export default function EditRequestPage() {
  const params = useParams();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [originalRequest, setOriginalRequest] = useState<RequestData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{id: number, role: string, roles?: string[], firstName: string, lastName: string, email: string} | null>(null);

  // Map existing request data to form data structure
  const mapRequestToFormData = (request: RequestData): FormData => {
    return {
      // Default AFT form values - we'll need to populate these based on existing data
      mediaControlNumber: request.requestNumber || '',
      mediaType: '', // This wasn't in the old structure
      
      // Map from old structure where possible
      sourceIS: request.sourceSystem || '',
      sourceISClassification: request.classification || '',
      destinationIS: request.destSystem || '',
      destinationISClassification: request.classification || '',
      mediaDisposition: request.destLocation || '',
      overallClassification: request.classification || '',
      transferType: (request.transferType as 'low-to-low' | 'low-to-high' | 'high-to-low' | 'high-to-high') || '',
      destinationFile: '', // New field
      isNonHumanReadable: false, // New field
      processName: '', // New field
      justificationForTransfer: request.transferPurpose || '',
      
      // File details - create default structure
      numberOfFiles: 1,
      files: [{ 
        name: request.dataDescription || 'Data files', 
        fileType: request.dataFormat || '', 
        classification: request.classification || '' 
      }],
      additionalFileListAttached: false,
      uploadedFiles: [],
      
      // Media transportation
      mediaTransportedOutside: false, // New field
      mediaDestination: request.destLocation || '',
      destinationPOC: '', // New field
      destinationAddress: request.destLocation || '',
      mediaEncrypted: request.encryption ? true : false,
    };
  };

  const fetchRequest = useCallback(async () => {
    try {
      setLoading(true);
      const [requestResponse, userResponse] = await Promise.all([
        fetch(`/api/aft-requests/${params.id}`),
        fetch('/api/auth/me')
      ]);
      
      if (requestResponse.ok) {
        const data = await requestResponse.json();
        const request = data.request || data;
        setOriginalRequest(request);
        
        // Map the existing request data to the form structure
        const mappedData = mapRequestToFormData(request);
        setFormData(mappedData);
      } else {
        toast.error('Failed to fetch request details');
        router.push('/requestor/requests');
        return;
      }

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }
    } catch (error) {
      toast.error('Error fetching request details');
      console.error('Fetch request error:', error);
      router.push('/requestor/requests');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (params.id) {
      fetchRequest();
    }
  }, [params.id, fetchRequest]);

  // Check if current user can edit the request
  const canUserEdit = () => {
    if (!user || !originalRequest) return false;
    
    const userRoles = user.roles || [user.role];
    const requestStatus = originalRequest.status;
    
    // Only the original requestor (or admin) can edit their own requests
    if (userRoles.includes('requestor') && originalRequest.requestorId === user.id && ['draft', 'submitted', 'pending_dao', 'rejected'].includes(requestStatus)) {
      return true;
    }
    if (userRoles.includes('admin')) return true;
    
    return false;
  };

  const updateFormData = (stepData: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...stepData }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Media Control
        return !!(formData.mediaControlNumber && formData.mediaType);
      case 1: // Source & Destination
        return !!(formData.sourceIS && formData.sourceISClassification && formData.destinationIS && formData.destinationISClassification && formData.overallClassification && formData.transferType && formData.destinationFile && formData.justificationForTransfer);
      case 2: // File Details
        return formData.numberOfFiles > 0 && formData.files.every(file => file.name && file.fileType && file.classification);
      case 3: // Media Transportation
        return !formData.mediaTransportedOutside || !!(formData.mediaDestination && formData.destinationPOC && formData.destinationAddress);
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) {
      toast.error('Please fill in all required fields before continuing.');
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveRequest = async () => {
    if (!originalRequest || !canUserEdit()) {
      toast.error('You do not have permission to edit this request');
      return;
    }

    setIsSubmitting(true);
    try {
      // Map form data back to API schema
      const submitData = {
        ...formData,
        // Keep the original status when editing - don't auto-resubmit
        status: originalRequest.status,
        // TPI is now default for all AFT requests
        tpiRequired: true,
      };

      const response = await fetch(`/api/aft-requests/${originalRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        if (originalRequest.status === 'rejected') {
          toast.success('✅ Request saved successfully! You can now submit it for approval when ready.');
        } else {
          toast.success('AFT request updated successfully!');
        }
        router.push('/requestor/requests');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update request');
      }
    } catch {
      toast.error('Error updating request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <MediaControlStep data={formData} updateData={updateFormData} />;
      case 1:
        return <SourceDestinationStep data={formData} updateData={updateFormData} />;
      case 2:
        return <FileDetailsStep data={formData} updateData={updateFormData} />;
      case 3:
        return <FileUploadStep updateData={updateFormData} requestId={parseInt(params.id as string)} />;
      case 4:
        return <MediaTransportationStep data={formData} updateData={updateFormData} />;
      case 5:
        return <ReviewSubmitStep data={formData} onSubmit={saveRequest} isSubmitting={isSubmitting} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!originalRequest || !canUserEdit()) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Cannot Edit Request</h2>
        <p className="text-gray-600 mb-4">
          {!originalRequest 
            ? 'Request not found.' 
            : 'You do not have permission to edit this request or it is no longer editable.'
          }
        </p>
        <Button onClick={() => router.push('/requestor/requests')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requests
        </Button>
      </div>
    );
  }

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Button 
          onClick={() => router.push(`/requestor/requests/${originalRequest.id}`)} 
          variant="outline" 
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Request Details
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit AFT Request</h1>
            <p className="text-gray-600">Update your Assured File Transfer request: {originalRequest.requestNumber}</p>
          </div>
          {originalRequest.status === 'rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-w-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-red-900">Request was rejected</p>
                  {originalRequest.rejectionReason && (
                    <p className="text-red-800 mt-1">{originalRequest.rejectionReason}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="mb-8">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center mb-2">
            <CardTitle className="text-lg">Step {currentStep + 1} of {steps.length}</CardTitle>
            <span className="text-sm text-gray-500">{Math.round(progressPercentage)}% Complete</span>
          </div>
          <Progress value={progressPercentage} className="w-full" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                  index === currentStep
                    ? 'bg-blue-100 text-blue-800'
                    : index < currentStep
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="w-4 h-4 flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </Button>

        {currentStep === steps.length - 1 ? (
          <Button
            onClick={saveRequest}
            disabled={isSubmitting}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={nextStep}
            className="flex items-center space-x-2"
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}