'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, FileSignature } from 'lucide-react';
import { CACSignatureComponent } from '@/components/cac-signature';
import { DigitalSignature } from '@/lib/cac-signature';
import { toast } from 'sonner';
import { type AFTRequest } from '@/lib/db/schema';

interface ApprovalWithSignatureProps {
  requestId: number;
  requestData: AFTRequest;
  stepType: 'dao_approval' | 'approver_approval' | 'cpso_approval' | 'dta_completion' | 'sme_signature' | 'custodian_disposition';
  title: string;
  description?: string;
  onApprove: (notes: string, signature: DigitalSignature) => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
  disabled?: boolean;
  requiresSignature?: boolean;
}

export function ApprovalWithSignature({
  requestId,
  requestData,
  stepType,
  title,
  description,
  onApprove,
  onReject,
  disabled = false,
  requiresSignature = true
}: ApprovalWithSignatureProps) {
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [showRejection, setShowRejection] = useState(false);

  // Generate the data that will be signed
  const generateSignatureData = (): string => {
    const signaturePayload = {
      requestId: requestId,
      requestNumber: requestData.requestNumber,
      stepType: stepType,
      action: 'approve',
      timestamp: new Date().toISOString(),
      notes: notes,
      requestor: requestData.requestorName,
      transferType: requestData.transferType,
      classification: requestData.classification,
      dataDescription: requestData.dataDescription,
      // Include relevant request details for signature integrity
      sourceSystem: requestData.sourceSystem,
      destSystem: requestData.destSystem,
    };

    return JSON.stringify(signaturePayload, null, 2);
  };

  const handleApproveClick = () => {
    if (requiresSignature) {
      setShowSignature(true);
    } else {
      handleApproveWithoutSignature();
    }
  };

  const handleApproveWithoutSignature = async () => {
    if (!notes.trim()) {
      toast.error('Please provide approval notes');
      return;
    }

    setIsApproving(true);
    try {
      // Create a mock signature for non-CAC approvals (fallback)
      const mockSignature: DigitalSignature = {
        certificateData: {
          subject: 'Manual Approval',
          issuer: 'System',
          serialNumber: '0',
          thumbprint: 'manual',
          notBefore: new Date(),
          notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          publicKey: {} as CryptoKey,
          certificate: new ArrayBuffer(0)
        },
        signatureData: 'manual-approval',
        signedData: 'manual',
        algorithm: 'manual',
        timestamp: new Date()
      };

      await onApprove(notes, mockSignature);
      toast.success('Request approved successfully');
    } catch (error) {
      toast.error('Failed to approve request');
      console.error('Approval error:', error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleSignatureComplete = async (signature: DigitalSignature) => {
    setIsApproving(true);
    try {
      // First, save the signature to the database
      const signatureResponse = await fetch('/api/signatures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: requestId,
          stepType: stepType,
          certificateSubject: signature.certificateData.subject,
          certificateIssuer: signature.certificateData.issuer,
          certificateSerial: signature.certificateData.serialNumber,
          certificateThumbprint: signature.certificateData.thumbprint,
          certificateNotBefore: signature.certificateData.notBefore.toISOString(),
          certificateNotAfter: signature.certificateData.notAfter.toISOString(),
          signatureData: signature.signatureData,
          signedData: signature.signedData,
          signatureAlgorithm: signature.algorithm,
          signatureReason: signature.reason,
          signatureLocation: signature.location,
        }),
      });

      if (!signatureResponse.ok) {
        throw new Error('Failed to save signature');
      }

      // Then process the approval
      await onApprove(notes, signature);
      
      setShowSignature(false);
      toast.success('Request approved with digital signature');
    } catch (error) {
      toast.error('Failed to complete approval with signature');
      console.error('Signature approval error:', error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide rejection reason');
      return;
    }

    setIsRejecting(true);
    try {
      await onReject?.(rejectionReason);
      setShowRejection(false);
      toast.success('Request rejected');
    } catch (error) {
      toast.error('Failed to reject request');
      console.error('Rejection error:', error);
    } finally {
      setIsRejecting(false);
    }
  };

  const getActionLabel = () => {
    switch (stepType) {
      case 'dao_approval': return 'DAO Approval';
      case 'approver_approval': return 'Approver Review';
      case 'cpso_approval': return 'CPSO Approval';
      case 'dta_completion': return 'DTA Completion';
      case 'sme_signature': return 'SME Signature';
      case 'custodian_disposition': return 'Custodian Disposition';
      default: return 'Approval';
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Approval Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            {title}
          </CardTitle>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Request Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <strong>Request:</strong> {requestData.requestNumber}
            </div>
            <div>
              <strong>Requestor:</strong> {requestData.requestorName}
            </div>
            <div>
              <strong>Transfer Type:</strong> {requestData.transferType}
            </div>
            <div>
              <strong>Classification:</strong> {requestData.classification}
            </div>
          </div>

          {/* Approval Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{getActionLabel()} Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Enter your ${getActionLabel().toLowerCase()} notes...`}
              rows={4}
              disabled={disabled}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleApproveClick}
              disabled={disabled || isApproving || !notes.trim()}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isApproving ? 'Processing...' : `Approve${requiresSignature ? ' with Digital Signature' : ''}`}
            </Button>
            
            {onReject && (
              <Button
                variant="outline"
                onClick={() => setShowRejection(true)}
                disabled={disabled || isRejecting}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            )}
          </div>

          {requiresSignature && (
            <Alert>
              <FileSignature className="h-4 w-4" />
              <AlertDescription>
                This step requires a CAC-based digital signature for compliance and non-repudiation.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Digital Signature Component */}
      {showSignature && (
        <CACSignatureComponent
          requestId={requestId}
          stepType={stepType}
          dataToSign={generateSignatureData()}
          reason={`${getActionLabel()} for AFT Request ${requestData.requestNumber}`}
          onSignatureComplete={handleSignatureComplete}
          onSignatureError={(error) => {
            console.error('Signature error:', error);
            toast.error('Digital signature failed');
          }}
          disabled={isApproving}
        />
      )}

      {/* Rejection Form */}
      {showRejection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Reject Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection">Rejection Reason</Label>
              <Textarea
                id="rejection"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a detailed reason for rejection..."
                rows={4}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isRejecting || !rejectionReason.trim()}
                className="flex-1"
              >
                {isRejecting ? 'Processing...' : 'Confirm Rejection'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejection(false)}
                disabled={isRejecting}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}