'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRightLeft,
  RefreshCw,
  User,
  Calendar,
  Database,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface AFTRequest {
  id: number;
  requestNumber: string;
  status: string;
  transferType: string;
  classification: string;
  requestorName: string;
  requestorOrg: string;
  transferPurpose: string;
  requestedStartDate: string;
  createdAt: string;
  dataSize: string;
  sourceSystem: string;
  destSystem: string;
}

export default function DTATransfersPage() {
  const [transfers, setTransfers] = useState<AFTRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/aft-requests');
      
      if (response.ok) {
        const data = await response.json();
        const allRequests = data.requests || [];
        
        // Filter for active transfers (Section IV processing, SME signature, SME, and Media Custodian stages)
        const activeTransfers = allRequests.filter((r: AFTRequest) => 
          ['active_transfer', 'pending_sme_signature', 'pending_sme', 'pending_media_custodian'].includes(r.status)
        );
        
        setTransfers(activeTransfers);
      } else {
        toast.error('Failed to fetch active transfers');
      }
    } catch (error) {
      toast.error('Error loading active transfers');
      console.error('Fetch transfers error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active_transfer': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending_sme_signature': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending_sme': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'pending_media_custodian': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active_transfer': return 'Section IV Processing';
      case 'pending_sme_signature': return 'Awaiting SME Signature';
      case 'pending_sme': return 'SME Review';
      case 'pending_media_custodian': return 'Media Custodian Review';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active_transfer': return <ArrowRightLeft className="w-4 h-4" />;
      case 'pending_sme_signature': return <CheckCircle className="w-4 h-4" />;
      case 'pending_sme': return <User className="w-4 h-4" />;
      case 'pending_media_custodian': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getClassificationColor = (classification: string) => {
    switch (classification.toLowerCase()) {
      case 'unclassified': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cui': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'confidential': return 'bg-yellow-100/80 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'secret': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'top-secret': return 'bg-red-100 text-destructive dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">Loading active transfers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center space-x-2">
            <ArrowRightLeft className="w-6 h-6 text-primary" />
            <span>Active Transfers</span>
          </h1>
          <p className="text-muted-foreground">Monitor transfers in progress</p>
        </div>
        <Button variant="outline" onClick={fetchTransfers} className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <ArrowRightLeft className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">
                {transfers.filter(t => t.status === 'active_transfer').length}
              </div>
              <div className="text-sm text-muted-foreground">Section IV Processing</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20">
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">
                {transfers.filter(t => t.status === 'pending_sme_signature').length}
              </div>
              <div className="text-sm text-muted-foreground">Awaiting SME Signature</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <User className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">
                {transfers.filter(t => t.status === 'pending_sme').length}
              </div>
              <div className="text-sm text-muted-foreground">SME Reviews</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">
                {transfers.filter(t => t.status === 'pending_media_custodian').length}
              </div>
              <div className="text-sm text-muted-foreground">Media Custodian Reviews</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <Database className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">{transfers.length}</div>
              <div className="text-sm text-muted-foreground">Total Active</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Transfers List */}
      <div className="space-y-4">
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No active transfers</h3>
              <p className="text-muted-foreground">
                All transfers have been completed or are awaiting DTA coordination.
              </p>
            </CardContent>
          </Card>
        ) : (
          transfers.map((transfer) => (
            <Card key={transfer.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Link 
                        href={transfer.status === 'active_transfer' ? `/dta/transfers/${transfer.id}` : `/dta/requests/${transfer.id}`}
                        className="font-mono text-lg font-semibold text-primary hover:text-primary/80 hover:underline"
                      >
                        {transfer.requestNumber}
                      </Link>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(transfer.status)}
                        <Badge className={getStatusColor(transfer.status)}>
                          {getStatusText(transfer.status)}
                        </Badge>
                      </div>
                      <Badge className={getClassificationColor(transfer.classification)} variant="outline">
                        {transfer.classification.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {transfer.transferType.replace('-', ' to ')}
                      </Badge>
                    </div>
                    
                    <p className="text-foreground font-medium mb-3" title={transfer.transferPurpose}>
                      {transfer.transferPurpose}
                    </p>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>{transfer.requestorName} ({transfer.requestorOrg})</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>Requested: {formatDate(transfer.requestedStartDate)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-start space-x-2">
                          <Database className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div className="space-y-1">
                            <div>{transfer.sourceSystem} → {transfer.destSystem}</div>
                            {transfer.dataSize && (
                              <div className="text-xs">Size: {transfer.dataSize}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <Link href={`/dta/requests/${transfer.id}`}>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </Link>
                    <div className="text-xs text-muted-foreground text-right">
                      <div>Submitted</div>
                      <div>{formatDate(transfer.createdAt)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}