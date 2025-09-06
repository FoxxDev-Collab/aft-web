'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Shield,
  CheckCircle,
  RefreshCw,
  Upload,
  Download,
  PenTool,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface RequestData {
  id: number;
  requestNumber: string;
  status: string;
  transferData?: string;
}

interface User {
  id: number;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface SectionIVProps {
  requestId: number;
  requestData: RequestData;
  onRefresh: () => Promise<void>;
  user: User | null;
}

export default function SectionIVComponent({ requestId, requestData, onRefresh, user }: SectionIVProps) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);
  const [showAntiVirusScanDialog, setShowAntiVirusScanDialog] = useState(false);
  const [showTransferCompleteDialog, setShowTransferCompleteDialog] = useState(false);
  
  // Anti-virus scan state
  const [originationScanPerformed, setOriginationScanPerformed] = useState(false);
  const [originationFilesScanned, setOriginationFilesScanned] = useState('');
  const [originationThreatsFound, setOriginationThreatsFound] = useState('');
  const [destinationScanPerformed, setDestinationScanPerformed] = useState(false);
  const [destinationFilesScanned, setDestinationFilesScanned] = useState('');
  const [destinationThreatsFound, setDestinationThreatsFound] = useState('');

  // Transfer completion state
  const [filesTransferred, setFilesTransferred] = useState('');
  const [dtaName, setDtaName] = useState('');
  const [dtaSignature, setDtaSignature] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [tpiMaintained, setTpiMaintained] = useState(false);

  // Parse existing transfer data to check completion status
  const [transferState, setTransferState] = useState<{
    antivirusScanCompleted: boolean;
    transferCompleted: boolean;
  }>({ antivirusScanCompleted: false, transferCompleted: false });

  useEffect(() => {
    // Parse transfer data to determine current state
    if (requestData.transferData) {
      try {
        const transferData = JSON.parse(requestData.transferData);
        setTransferState({
          antivirusScanCompleted: !!transferData.antivirusScan,
          transferCompleted: !!transferData.transferCompletion,
        });
        
        // Pre-populate DTA name if user info available
        if (user) {
          setDtaName(`${user.firstName} ${user.lastName}`);
        }
      } catch (error) {
        console.warn('Failed to parse transfer data:', error);
      }
    }
  }, [requestData.transferData, user]);

  const canPerformAntiVirusScan = () => {
    return user?.role === 'dta' && requestData.status === 'active_transfer' && !transferState.antivirusScanCompleted;
  };

  const canCompleteTransfer = () => {
    return user?.role === 'dta' && requestData.status === 'active_transfer' && transferState.antivirusScanCompleted && !transferState.transferCompleted;
  };

  const handleAntiVirusScan = async () => {
    if (!originationFilesScanned.trim() || !originationThreatsFound.trim() || 
        !destinationFilesScanned.trim() || !destinationThreatsFound.trim()) {
      toast.error('Please fill in all scan results');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/aft-requests/${requestId}/antivirus-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originationScan: {
            performed: originationScanPerformed,
            filesScanned: parseInt(originationFilesScanned),
            threatsFound: parseInt(originationThreatsFound)
          },
          destinationScan: {
            performed: destinationScanPerformed,
            filesScanned: parseInt(destinationFilesScanned),
            threatsFound: parseInt(destinationThreatsFound)
          },
          date: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast.success('Anti-virus scan results recorded successfully');
        setShowAntiVirusScanDialog(false);
        await onRefresh();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to record scan results');
      }
    } catch (error) {
      toast.error('Error recording scan results');
      console.error('Anti-virus scan error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferComplete = async () => {
    if (!filesTransferred.trim() || !dtaName.trim() || 
        !dtaSignature.trim() || !transferDate.trim() || !tpiMaintained) {
      toast.error('Please fill in all required fields and confirm Two-Person Integrity');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/aft-requests/${requestId}/transfer-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filesTransferred: parseInt(filesTransferred),
          dtaName: dtaName.trim(),
          dtaSignature: dtaSignature.trim(),
          transferDate: transferDate,
          transferNotes: transferNotes.trim(),
          tpiMaintained,
          completedDate: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast.success('Transfer completed successfully, awaiting SME signature');
        setShowTransferCompleteDialog(false);
        // Redirect to transfer history page
        router.push('/dta/history');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to complete transfer');
      }
    } catch (error) {
      toast.error('Error completing transfer');
      console.error('Transfer complete error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section IV Header */}
      <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-orange-700 dark:text-orange-300">
            <Shield className="w-5 h-5" />
            <span>Section IV - Anti-Virus Scan & Transfer Completion</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete anti-virus scans and transfer process according to ACDS procedures
          </p>
        </CardHeader>
      </Card>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Anti-Virus Scan Card */}
        <Card className={`${transferState.antivirusScanCompleted ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20' : canPerformAntiVirusScan() ? 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/20' : 'opacity-50'}`}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Anti-Virus Scan</span>
              {transferState.antivirusScanCompleted && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {transferState.antivirusScanCompleted 
                ? 'Anti-virus scans have been completed and recorded' 
                : 'Perform origination and destination media scans'}
            </p>
          </CardHeader>
          <CardContent>
            {canPerformAntiVirusScan() ? (
              <Button 
                onClick={() => setShowAntiVirusScanDialog(true)}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <Shield className="w-4 h-4 mr-2" />
                Record Anti-Virus Scan
              </Button>
            ) : transferState.antivirusScanCompleted ? (
              <div className="text-center py-4">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Scan results recorded</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Waiting for transfer initiation</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Completion Card */}
        <Card className={`${transferState.transferCompleted ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20' : canCompleteTransfer() ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20' : 'opacity-50'}`}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PenTool className="w-5 h-5" />
              <span>Transfer Completion</span>
              {transferState.transferCompleted && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {transferState.transferCompleted 
                ? 'Transfer has been completed and signed by DTA' 
                : 'Complete transfer with DTA signature and TPI verification'}
            </p>
          </CardHeader>
          <CardContent>
            {canCompleteTransfer() ? (
              <Button 
                onClick={() => setShowTransferCompleteDialog(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Complete Transfer
              </Button>
            ) : transferState.transferCompleted ? (
              <div className="text-center py-4">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Transfer completed</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Complete anti-virus scan first</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Anti-Virus Scan Dialog */}
      <Dialog open={showAntiVirusScanDialog} onOpenChange={setShowAntiVirusScanDialog}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-orange-600" />
              <span>Section IV - Anti-Virus Scan</span>
            </DialogTitle>
            <DialogDescription>
              Perform two virus/malware scans as required by AFT procedures. Use different vendor products when possible.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Origination Media Scan */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Download className="w-5 h-5 text-blue-600" />
                <span>Origination Media Scan</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Scan Performed</Label>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="origination-yes"
                        checked={originationScanPerformed}
                        onCheckedChange={(checked) => setOriginationScanPerformed(checked as boolean)}
                      />
                      <Label htmlFor="origination-yes" className="text-sm">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="origination-no"
                        checked={!originationScanPerformed}
                        onCheckedChange={(checked) => setOriginationScanPerformed(!(checked as boolean))}
                      />
                      <Label htmlFor="origination-no" className="text-sm">No</Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="origination-files">Files Scanned</Label>
                  <Input
                    id="origination-files"
                    type="number"
                    value={originationFilesScanned}
                    onChange={(e) => setOriginationFilesScanned(e.target.value)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="origination-threats">Threats Found</Label>
                  <Input
                    id="origination-threats"
                    type="number"
                    value={originationThreatsFound}
                    onChange={(e) => setOriginationThreatsFound(e.target.value)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Destination Media Scan */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Upload className="w-5 h-5 text-green-600" />
                <span>Destination Media Scan</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Scan Performed</Label>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="destination-yes"
                        checked={destinationScanPerformed}
                        onCheckedChange={(checked) => setDestinationScanPerformed(checked as boolean)}
                      />
                      <Label htmlFor="destination-yes" className="text-sm">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="destination-no"
                        checked={!destinationScanPerformed}
                        onCheckedChange={(checked) => setDestinationScanPerformed(!(checked as boolean))}
                      />
                      <Label htmlFor="destination-no" className="text-sm">No</Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="destination-files">Files Scanned</Label>
                  <Input
                    id="destination-files"
                    type="number"
                    value={destinationFilesScanned}
                    onChange={(e) => setDestinationFilesScanned(e.target.value)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="destination-threats">Threats Found</Label>
                  <Input
                    id="destination-threats"
                    type="number"
                    value={destinationThreatsFound}
                    onChange={(e) => setDestinationThreatsFound(e.target.value)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAntiVirusScanDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAntiVirusScan} 
              disabled={actionLoading || !originationFilesScanned.trim() || !originationThreatsFound.trim() || !destinationFilesScanned.trim() || !destinationThreatsFound.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {actionLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              {actionLoading ? 'Recording...' : 'Record Scan Results'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Complete Dialog */}
      <Dialog open={showTransferCompleteDialog} onOpenChange={setShowTransferCompleteDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-green-600" />
              <span>Complete AFT Transfer</span>
            </DialogTitle>
            <DialogDescription>
              Complete the AFT transfer process with DTA signature and Two-Person Integrity (TPI) verification.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="files-transferred">Files Transferred *</Label>
                <Input
                  id="files-transferred"
                  type="number"
                  value={filesTransferred}
                  onChange={(e) => setFilesTransferred(e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="transfer-date">Transfer Date *</Label>
                <Input
                  id="transfer-date"
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="dta-name">DTA Name *</Label>
              <Input
                id="dta-name"
                value={dtaName}
                onChange={(e) => setDtaName(e.target.value)}
                placeholder="Enter DTA full name"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="dta-signature">DTA Digital Signature *</Label>
              <Input
                id="dta-signature"
                value={dtaSignature}
                onChange={(e) => setDtaSignature(e.target.value)}
                placeholder="Enter DTA digital signature"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="transfer-notes">Transfer Notes (Optional)</Label>
              <Textarea
                id="transfer-notes"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Add any notes about the transfer process..."
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 dark:bg-amber-900/20 dark:border-amber-800">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tpi-maintained"
                  checked={tpiMaintained}
                  onCheckedChange={(checked) => setTpiMaintained(checked as boolean)}
                />
                <Label htmlFor="tpi-maintained" className="text-sm font-medium">
                  I confirm that Two-Person Integrity (TPI) was maintained during the AFT process as required, and the transfer has been completed following approved procedures contained in the ACDS Assured File Transfer Standard Operating Procedures.
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferCompleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransferComplete} 
              disabled={actionLoading || !filesTransferred.trim() || !dtaName.trim() || !dtaSignature.trim() || !transferDate.trim() || !tpiMaintained}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {actionLoading ? 'Completing...' : 'Complete Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}