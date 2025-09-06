'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { WorkflowProgress } from '@/components/workflow-progress';
import { 
  ArrowLeft, 
  FileText, 
  User, 
  AlertTriangle, 
  Edit, 
  Calendar,
  Shield,
  RefreshCw,
  Database,
  HardDrive,
  Server,
} from 'lucide-react';
import { toast } from 'sonner';

interface RequestData {
  id: number;
  requestNumber: string;
  status: string;
  requestorName: string;
  requestorOrg: string;
  requestorEmail: string;
  requestorPhone: string;
  transferPurpose: string;
  transferType: string;
  classification: string;
  dataDescription: string;
  sourceSystem: string;
  destSystem: string;
  destLocation: string;
  dataFormat: string;
  dataSize: string;
  encryption: string;
  transferMethod: string;
  requestedStartDate: string; // ISO date string
  requestedEndDate: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  rejectionReason?: string;
  approvalData?: string;
  transferData?: string;
  caveatInfo?: string;
  urgencyLevel?: string;
  approvalDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  // Additional fields that might exist
  approverId?: number | null;
  dtaId?: number | null;
  smeId?: number | null;
  mediaCustodianId?: number | null;
}

interface User {
  id: number;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function RequestorRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<RequestData | null>(null);
  const [, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState(false);

  const fetchRequest = useCallback(async () => {
    try {
      setLoading(true);
      const [response, userResponse] = await Promise.all([
        fetch(`/api/aft-requests/${params.id}`),
        fetch('/api/auth/me')
      ]);
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }

      if (response.ok) {
        const data = await response.json();
        setRequest(data.request);
      } else {
        toast.error('Failed to fetch request details');
        router.push('/requestor/requests');
      }
    } catch {
      toast.error('Error fetching request details');
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

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'pending_dao': return 'bg-yellow-100 text-yellow-800';
      case 'pending_approver': return 'bg-purple-100 text-purple-800';
      case 'pending_cpso': return 'bg-indigo-100 text-indigo-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'pending_dta': return 'bg-cyan-100 text-cyan-800';
      case 'pending_sme': return 'bg-orange-100 text-orange-800';
      case 'pending_media_custodian': return 'bg-amber-100 text-amber-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'disposed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    if (!status) return 'Unknown';
    switch (status.toLowerCase()) {
      case 'draft': return 'Draft';
      case 'submitted': return 'Awaiting Approval';
      case 'pending_dao': return 'Pending DAO';
      case 'pending_approver': return 'Pending Approver';
      case 'pending_cpso': return 'Pending CPSO';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'pending_dta': return 'With DTA';
      case 'pending_sme': return 'With SME';
      case 'pending_media_custodian': return 'Media Custodian';
      case 'completed': return 'Completed';
      case 'disposed': return 'Disposed';
      case 'cancelled': return 'Cancelled';
      default: return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
    }
  };

  const getClassificationColor = (classification: string) => {
    if (!classification) return 'bg-gray-100 text-gray-800';
    switch (classification.toLowerCase()) {
      case 'unclassified': return 'bg-green-100 text-green-800';
      case 'cui': return 'bg-blue-100 text-blue-800';
      case 'confidential': return 'bg-yellow-100 text-yellow-800';
      case 'secret': return 'bg-orange-100 text-orange-800';
      case 'top-secret': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canReturnForEdit = () => {
    if (!request) return false;
    return ['submitted', 'pending_dao', 'pending_approver', 'pending_cpso'].includes(request.status);
  };

  const canEdit = () => {
    if (!request) return false;
    return request.status === 'rejected';
  };

  const handleReturnForEdit = async () => {
    if (!request) return;
    
    setReturning(true);
    try {
      const response = await fetch(`/api/aft-requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' })
      });
      
      if (response.ok) {
        toast.success('Request returned for editing');
        fetchRequest();
      } else {
        toast.error('Failed to return request for editing');
      }
    } catch {
      toast.error('Error returning request for editing');
    } finally {
      setReturning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading request details...</span>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Request not found</h3>
        <Link href="/requestor/requests">
          <Button variant="outline">Back to Requests</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/requestor/requests">
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to My Requests</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-mono">
              {request.requestNumber}
            </h1>
            <p className="text-gray-600">AFT Request Details</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={getStatusColor(request.status)}>
            {getStatusText(request.status)}
          </Badge>
          <Badge className={getClassificationColor(request.classification)} variant="outline">
            {request.classification?.toUpperCase() || 'UNKNOWN'}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-3">
        {canEdit() && (
          <Link href={`/requestor/request/edit/${request.id}`}>
            <Button className="flex items-center space-x-2 bg-red-600 hover:bg-red-700">
              <Edit className="w-4 h-4" />
              <span>Fix & Resubmit</span>
            </Button>
          </Link>
        )}
        {canReturnForEdit() && (
          <Button 
            variant="outline" 
            className="flex items-center space-x-2"
            onClick={handleReturnForEdit}
            disabled={returning}
          >
            <Edit className="w-4 h-4" />
            <span>{returning ? 'Returning...' : 'Return to Edit'}</span>
          </Button>
        )}
      </div>

      {/* Rejection Notice */}
      {request.status === 'rejected' && request.rejectionReason && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start p-4">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800 mb-1">Request Rejected</p>
              <p className="text-sm text-red-700">{request.rejectionReason}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Request Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Transfer Type</Label>
                <p className="text-sm font-medium">{request.transferType?.toUpperCase().replace('-TO-', ' → ') || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Classification</Label>
                <p className="text-sm">
                  <Badge className={getClassificationColor(request.classification)} variant="outline">
                    {request.classification?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Created</Label>
                <p className="text-sm">{formatDate(request.createdAt)}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Last Updated</Label>
                <p className="text-sm">{formatDate(request.updatedAt)}</p>
              </div>
              {request.urgencyLevel && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Urgency</Label>
                  <p className="text-sm font-medium text-orange-600">{request.urgencyLevel.toUpperCase()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Requestor Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Name</Label>
                <p className="text-sm font-medium">{request.requestorName}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Organization</Label>
                <p className="text-sm">{request.requestorOrg || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                <p className="text-sm">{request.requestorEmail}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
                <p className="text-sm">{request.requestorPhone || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Timeline</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Requested Start</Label>
                <p className="text-sm">{request.requestedStartDate ? formatDate(request.requestedStartDate) : 'N/A'}</p>
              </div>
              {request.requestedEndDate && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Requested End</Label>
                  <p className="text-sm">{formatDate(request.requestedEndDate)}</p>
                </div>
              )}
              {request.approvalDate && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Approved</Label>
                  <p className="text-sm text-green-600">{formatDate(request.approvalDate)}</p>
                </div>
              )}
              {request.actualEndDate && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Completed</Label>
                  <p className="text-sm text-green-600">{formatDate(request.actualEndDate)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Transfer Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Transfer Purpose</Label>
              <p className="text-sm text-foreground mt-1">{request.transferPurpose || 'N/A'}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Data Description</Label>
              <p className="text-sm text-foreground mt-1">{request.dataDescription || 'N/A'}</p>
            </div>

            {request.caveatInfo && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Caveat Information</Label>
                <p className="text-sm text-foreground mt-1 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  {request.caveatInfo}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="w-5 h-5" />
              <span>Source Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Source System</Label>
                <p className="text-sm text-foreground">{request.sourceSystem || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <HardDrive className="w-5 h-5" />
              <span>Destination Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Destination System</Label>
                <p className="text-sm text-foreground">{request.destSystem || 'N/A'}</p>
              </div>
              {request.destLocation && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Location</Label>
                  <p className="text-sm text-foreground">{request.destLocation}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technical Specifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Technical Specifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Data Format</Label>
              <p className="text-sm text-foreground">{request.dataFormat || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Data Size</Label>
              <p className="text-sm text-foreground">{request.dataSize || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Transfer Method</Label>
              <p className="text-sm text-foreground">{request.transferMethod || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Encryption</Label>
              <p className="text-sm text-foreground">{request.encryption || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Progress Section */}
      <WorkflowProgress
        currentStatus={request.status}
        approvalData={request.approvalData}
        transferData={request.transferData}
        requestorName={request.requestorName}
        createdAt={request.createdAt}
        approvalDate={request.approvalDate}
        actualEndDate={request.actualEndDate}
        className="mt-6"
      />
    </div>
  );
}