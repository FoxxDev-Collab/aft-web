'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  History,
  ArrowLeft,
  User,
  Calendar,
  Database,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Package,
  Trash2
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
  requestorPhone: string;
  requestorEmail: string;
  transferPurpose: string;
  dataDescription: string;
  sourceSystem: string;
  destSystem: string;
  dataSize: string;
  transferMethod: string;
  requestedStartDate: string;
  createdAt: string;
  updatedAt: string;
  transferData?: string;
}

export default function CustodianHistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<AFTRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRequest = useCallback(async () => {
    try {
      const response = await fetch(`/api/aft-requests/${params.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setRequest(data.request);
      } else if (response.status === 404) {
        toast.error('Transfer request not found');
        router.push('/custodian/history');
      } else {
        toast.error('Failed to load transfer request');
      }
    } catch (error) {
      toast.error('Error loading transfer request');
      console.error('Fetch request error:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (params.id) {
      fetchRequest();
    }
  }, [params.id, fetchRequest]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'disposed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'Completed';
      case 'disposed': return 'Disposed';
      default: return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'disposed': return <Trash2 className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getClassificationColor = (classification: string) => {
    switch (classification?.toLowerCase()) {
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
          <Clock className="w-8 h-8 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">Loading transfer details...</span>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Request Not Found</h3>
          <p className="text-muted-foreground mb-4">The requested transfer could not be found or you don&apos;t have permission to view it.</p>
          <Link href="/custodian/history">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to History
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  let transferCompletion = null;
  let smeSignature = null;
  let mediaDisposition = null;
  
  if (request.transferData) {
    try {
      const transferData = JSON.parse(request.transferData);
      transferCompletion = transferData.transferCompletion;
      smeSignature = transferData.smeSignature;
      mediaDisposition = transferData.mediaDisposition;
    } catch (error) {
      console.warn('Failed to parse transfer data:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/custodian/history">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to History
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center space-x-2">
              <History className="w-6 h-6 text-primary" />
              <span>Transfer Details</span>
            </h1>
            <p className="text-muted-foreground">Complete disposition history</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(request.status)}>
            <div className="flex items-center space-x-1">
              {getStatusIcon(request.status)}
              <span>{getStatusText(request.status)}</span>
            </div>
          </Badge>
        </div>
      </div>

      {/* Request Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="font-mono text-xl">{request.requestNumber}</CardTitle>
              <CardDescription className="mt-2 text-base">{request.transferPurpose}</CardDescription>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge className={getClassificationColor(request.classification)} variant="outline">
                {request.classification.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {request.transferType.replace('-', ' to ')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground flex items-center space-x-2 mb-3">
                  <User className="w-4 h-4" />
                  <span>Requestor Information</span>
                </h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Name:</span> {request.requestorName}</div>
                  <div><span className="font-medium">Organization:</span> {request.requestorOrg}</div>
                  <div><span className="font-medium">Email:</span> {request.requestorEmail}</div>
                  <div><span className="font-medium">Phone:</span> {request.requestorPhone}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground flex items-center space-x-2 mb-3">
                  <Calendar className="w-4 h-4" />
                  <span>Timeline</span>
                </h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Requested:</span> {formatDate(request.requestedStartDate)}</div>
                  <div><span className="font-medium">Submitted:</span> {formatDate(request.createdAt)}</div>
                  <div><span className="font-medium">Completed:</span> {formatDate(request.updatedAt)}</div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold text-foreground flex items-center space-x-2 mb-3">
              <Database className="w-4 h-4" />
              <span>Transfer Details</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-2">
                <div><span className="font-medium">Source System:</span> {request.sourceSystem}</div>
                <div><span className="font-medium">Destination System:</span> {request.destSystem}</div>
                <div><span className="font-medium">Data Size:</span> {request.dataSize}</div>
              </div>
              <div className="space-y-2">
                <div><span className="font-medium">Transfer Method:</span> {request.transferMethod}</div>
                <div><span className="font-medium">Data Description:</span> {request.dataDescription}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Completion Details */}
      {transferCompletion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>DTA Transfer Completion</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div><span className="font-medium">Completed by:</span> {transferCompletion.dtaName}</div>
                  <div><span className="font-medium">Completion Date:</span> {formatDate(transferCompletion.transferDate)}</div>
                  <div><span className="font-medium">Files Transferred:</span> {transferCompletion.filesTransferred}</div>
                </div>
                <div className="space-y-2">
                  <div><span className="font-medium">Two-Person Integrity:</span> 
                    <Badge className={transferCompletion.tpiMaintained ? 'bg-green-100 text-green-800 ml-2' : 'bg-red-100 text-red-800 ml-2'}>
                      {transferCompletion.tpiMaintained ? 'Maintained' : 'Not Maintained'}
                    </Badge>
                  </div>
                  <div><span className="font-medium">DTA Signature:</span> {transferCompletion.dtaSignature}</div>
                </div>
              </div>
              {transferCompletion.comments && (
                <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                  <div><span className="font-medium">Comments:</span> {transferCompletion.comments}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SME Signature Details */}
      {smeSignature && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span>SME Signature</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div><span className="font-medium">Signed by:</span> {smeSignature.signature}</div>
                  <div><span className="font-medium">Date Signed:</span> {formatDate(smeSignature.date)}</div>
                </div>
              </div>
              {smeSignature.comments && (
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                  <div><span className="font-medium">Comments:</span> {smeSignature.comments}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Disposition Details */}
      {mediaDisposition && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-orange-600" />
              <span>Media Disposition</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg ${
              mediaDisposition.dispositionType === 'disposed' 
                ? 'bg-gray-50 dark:bg-gray-900/20' 
                : 'bg-orange-50 dark:bg-orange-900/20'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div><span className="font-medium">Disposition Type:</span> 
                    <Badge className={
                      mediaDisposition.dispositionType === 'disposed'
                        ? 'bg-gray-100 text-gray-800 ml-2'
                        : 'bg-green-100 text-green-800 ml-2'
                    }>
                      {mediaDisposition.dispositionType === 'disposed' ? 'Media Disposed' : 'Transfer Completed'}
                    </Badge>
                  </div>
                  <div><span className="font-medium">Processed by:</span> {mediaDisposition.custodianName}</div>
                  <div><span className="font-medium">Date Processed:</span> {formatDate(mediaDisposition.date)}</div>
                </div>
                <div className="space-y-2">
                  {mediaDisposition.dispositionMethod && (
                    <div><span className="font-medium">Method:</span> {mediaDisposition.dispositionMethod}</div>
                  )}
                </div>
              </div>
              
              {mediaDisposition.mediaDetails && (
                <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
                  <div><span className="font-medium">Media Details:</span> {mediaDisposition.mediaDetails}</div>
                </div>
              )}
              
              {mediaDisposition.comments && (
                <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
                  <div><span className="font-medium">Comments:</span> {mediaDisposition.comments}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!mediaDisposition && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Disposition Details</h3>
            <p className="text-muted-foreground">
              Media disposition details are not available for this transfer.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}