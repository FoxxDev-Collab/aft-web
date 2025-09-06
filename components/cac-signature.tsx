'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertCircle, 
  Loader2, 
  CreditCard,
  Lock
} from 'lucide-react';
import { BrowserCACService, CACCertificate, DigitalSignature } from '@/lib/browser-cac-signature';

interface CACSignatureProps {
  requestId: number;
  stepType: string;
  dataToSign: string; // JSON string of data being signed
  reason?: string;
  onSignatureComplete: (signature: DigitalSignature) => void;
  onSignatureError?: (error: string) => void;
  disabled?: boolean;
}

export function CACSignatureComponent({
  stepType,
  dataToSign,
  reason = '',
  onSignatureComplete,
  onSignatureError,
  disabled = false
}: CACSignatureProps) {
  const [selectedCert, setSelectedCert] = useState<CACCertificate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cacAvailable, setCacAvailable] = useState<{ available: boolean; message: string } | null>(null);
  const [signatureReason, setSignatureReason] = useState(reason);
  const [signatureLocation, setSignatureLocation] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkCACAvailability();
  }, []);

  const checkCACAvailability = async () => {
    setIsLoading(true);
    try {
      const availability = await BrowserCACService.checkCACAvailability();
      setCacAvailable(availability);
    } catch (error) {
      setCacAvailable({ 
        available: false, 
        message: `Error checking CAC: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectCertificate = async () => {
    try {
      setIsLoading(true);
      const cert = await BrowserCACService.selectCACCertificate();
      setSelectedCert(cert);
      setError(null);
    } catch (error) {
      setError(`Certificate selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSign = async () => {
    if (!selectedCert) {
      setError('Please select a certificate');
      return;
    }

    setIsSigning(true);
    setError(null);

    try {
      const signature = await BrowserCACService.createDigitalSignature(
        dataToSign,
        selectedCert,
        signatureReason || undefined,
        signatureLocation || undefined
      );

      onSignatureComplete(signature);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create signature';
      setError(errorMessage);
      onSignatureError?.(errorMessage);
    } finally {
      setIsSigning(false);
    }
  };

  const formatCertificateInfo = (cert: CACCertificate) => {
    const formatted = BrowserCACService.formatCertificateSubject(cert.subject);
    return {
      name: formatted.name,
      issuer: BrowserCACService.isDoDCertificate(cert) ? 'DoD PKI' : 'Other CA',
      expiry: cert.notAfter.toLocaleDateString()
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking CAC availability...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!cacAvailable?.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            CAC Not Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {cacAvailable?.message || 'CAC not detected'}
            </AlertDescription>
          </Alert>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>To use digital signatures, please ensure:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>CAC card is inserted into reader</li>
              <li>CAC middleware (ActivClient/DoD) is installed</li>
              <li>Browser has access to certificate store</li>
              <li>Certificate is not expired</li>
            </ul>
          </div>
          <Button 
            onClick={checkCACAvailability} 
            variant="outline" 
            className="mt-4"
            disabled={isLoading}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Retry CAC Detection
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          Digital Signature Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Certificate Selection */}
        {!selectedCert && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Click below to select your CAC certificate. Your browser will prompt you to choose a certificate.
              </p>
              <Button onClick={selectCertificate} disabled={isLoading}>
                <CreditCard className="h-4 w-4 mr-2" />
                {isLoading ? 'Selecting...' : 'Select CAC Certificate'}
              </Button>
            </div>
          </div>
        )}

        {/* Selected Certificate Info */}
        {selectedCert && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-green-600" />
              <span className="font-medium">Selected Certificate</span>
            </div>
            <div className="text-sm space-y-1">
              <div><strong>Name:</strong> {formatCertificateInfo(selectedCert).name}</div>
              <div><strong>Issuer:</strong> {formatCertificateInfo(selectedCert).issuer}</div>
              <div><strong>Expires:</strong> {formatCertificateInfo(selectedCert).expiry}</div>
            </div>
          </div>
        )}

        {/* Signature Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Signature Reason</Label>
            <Input
              id="reason"
              value={signatureReason}
              onChange={(e) => setSignatureReason(e.target.value)}
              placeholder={`${stepType.replace('_', ' ')} approval`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              value={signatureLocation}
              onChange={(e) => setSignatureLocation(e.target.value)}
              placeholder="Geographic location"
            />
          </div>
        </div>

        {/* Data Being Signed Preview */}
        <div className="space-y-2">
          <Label>Data Being Signed (Preview)</Label>
          <Textarea
            value={dataToSign.substring(0, 200) + (dataToSign.length > 200 ? '...' : '')}
            readOnly
            rows={3}
            className="font-mono text-xs"
          />
        </div>

        {/* Sign Button */}
        <div className="flex gap-3">
          <Button
            onClick={handleSign}
            disabled={!selectedCert || isSigning || disabled}
            className="flex-1"
          >
            {isSigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Signature...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Apply Digital Signature
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={checkCACAvailability}
            disabled={isSigning}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Refresh CAC
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          Your digital signature will be cryptographically bound to this request and cannot be repudiated.
        </div>
      </CardContent>
    </Card>
  );
}