'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DTASelectionStep } from '@/app/requestor/aft-form/dta-selection-step';
import { MediaControlStep } from '@/app/requestor/aft-form/media-control-step';
import { SourceDestinationStep } from '@/app/requestor/aft-form/source-destination-step';
import { FileDetailsStep } from '@/app/requestor/aft-form/file-details-step';
import { MediaTransportationStep } from '@/app/requestor/aft-form/media-transportation-step';
import { ReviewSubmitStep } from '@/app/requestor/aft-form/review-submit-step';


interface DestinationIS {
  id: string;
  name: string;
  classification: string;
}

interface FormData {
  // Step 0: DTA Selection
  selectedDriveId?: number;
  dtaSelected: boolean;
  
  // Section I: Media Control Number and Media Type
  mediaControlNumber: string;
  mediaType: 'CD-R' | 'DVD-R' | 'DVD-RDL' | 'SSD' | 'SSD-T' | '';
  
  // Section II: Source/Destination Information
  sourceIS: string;
  sourceISClassification: string;
  destinationIS: string;
  destinationISClassification: string;
  destinationISList?: DestinationIS[];
  mediaDisposition: string;
  overallClassification: string;
  transferType: 'low-to-low' | 'low-to-high' | 'high-to-low' | 'high-to-high' | '';
  destinationFile: 'upload' | 'download' | '';
  isNonHumanReadable: boolean;
  processName: string;
  justificationForTransfer: string;
  
  // File Details
  numberOfFiles: number;
  fileDescription: string;
  additionalFileListAttached: boolean;
  
  // Media Transportation
  mediaTransportedOutside: boolean;
  mediaDestination: string;
  destinationPOC: string;
  destinationAddress: string;
  mediaEncrypted: boolean;
}

const initialFormData: FormData = {
  // Step 0: DTA Selection
  selectedDriveId: undefined,
  dtaSelected: false,
  
  // Section I
  mediaControlNumber: '',
  mediaType: '',
  
  // Section II
  sourceIS: '',
  sourceISClassification: '',
  destinationIS: '',
  destinationISClassification: '',
  destinationISList: [],
  mediaDisposition: '',
  overallClassification: '',
  transferType: '',
  destinationFile: '',
  isNonHumanReadable: false,
  processName: '',
  justificationForTransfer: '',
  
  // File Details
  numberOfFiles: 0,
  fileDescription: '',
  additionalFileListAttached: false,
  
  // Media Transportation
  mediaTransportedOutside: false,
  mediaDestination: '',
  destinationPOC: '',
  destinationAddress: '',
  mediaEncrypted: false,
};

const steps = [
  { title: 'DTA Selection', description: 'Select your Data Transfer Agent' },
  { title: 'Media Control', description: 'Media control number and type' },
  { title: 'Source & Destination', description: 'Information systems and classification' },
  { title: 'File Details', description: 'File count and description information' },
  { title: 'Media Transportation', description: 'Transportation and encryption details' },
  { title: 'Review & Submit', description: 'Final review and submission' },
];

export default function NewRequestPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const updateFormData = (stepData: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...stepData }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // DTA Selection
        return !!(formData.selectedDriveId && formData.dtaSelected);
      case 1: // Media Control
        return !!(formData.mediaControlNumber && formData.mediaType);
      case 2: // Source & Destination
        return !!(formData.sourceIS && formData.sourceISClassification && formData.destinationISList && formData.destinationISList.length > 0 && formData.destinationISList.every(dest => dest.name && dest.classification) && formData.overallClassification && formData.transferType && formData.destinationFile && formData.justificationForTransfer);
      case 3: // File Details
        return formData.numberOfFiles > 0 && formData.fileDescription.trim() !== '';
      case 4: // Media Transportation
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

  const saveAsDraft = async () => {
    if (!validateStep(currentStep - 1)) {
      toast.error('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      toast.info('Saving request...');
      
      // Save the request with file details (no actual file upload)
      const submitData = {
        ...formData,
        numberOfFiles: formData.numberOfFiles,
        files: [], // No actual files, just metadata
        tpiRequired: true,
      };

      const response = await fetch('/api/aft-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save request');
      }

      toast.success('AFT request saved as draft successfully!');
      
      router.push('/requestor/requests');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error saving request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <DTASelectionStep data={formData} updateData={updateFormData} />;
      case 1:
        return <MediaControlStep data={formData} updateData={updateFormData} />;
      case 2:
        return <SourceDestinationStep data={formData} updateData={updateFormData} />;
      case 3:
        return <FileDetailsStep data={formData} updateData={updateFormData} />;
      case 4:
        return <MediaTransportationStep data={formData} updateData={updateFormData} />;
      case 5:
        return <ReviewSubmitStep data={formData} onSubmit={saveAsDraft} isSubmitting={isSubmitting} />;
      default:
        return null;
    }
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">New AFT Request</h1>
        <p className="text-muted-foreground">Complete the form to submit a new Assured File Transfer request.</p>
      </div>

      {/* Progress Bar */}
      <Card className="mb-8">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center mb-2">
            <CardTitle className="text-lg">Step {currentStep + 1} of {steps.length}</CardTitle>
            <span className="text-sm text-muted-foreground">{Math.round(progressPercentage)}% Complete</span>
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
                    ? 'bg-primary/10 text-primary'
                    : index < currentStep
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-muted text-muted-foreground'
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
            onClick={saveAsDraft}
            disabled={isSubmitting}
            className="flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Save as Draft</span>
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