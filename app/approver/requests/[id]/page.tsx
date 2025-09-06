'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { WorkflowProgress } from '@/components/workflow-progress';
import { 
  ArrowLeft, 
  FileText, 
  User, 
  AlertTriangle, 
  Calendar,
  Shield,
  CheckCircle,
  RefreshCw,
  XCircle,
  Building2,
  Mail,
  Phone,
  Database,
  HardDrive,
  Server,
  FileCheck,
  Users,
  AlertCircle
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
  dataFormat: string;
  dataSize: string;
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

export default function ApproverRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<RequestData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [signature, setSignature] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [acknowledgeTerms, setAcknowledgeTerms] = useState(false);

  const fetchRequest = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching request ID:', params.id); // Debug log
      
      // Fetch both request data and user data
      const [requestResponse, userResponse] = await Promise.all([
        fetch(`/api/aft-requests/${params.id}`),
        fetch('/api/auth/me')
      ]);

      console.log('Request response status:', requestResponse.status); // Debug log

      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('User data:', userData); // Debug log
        setUser(userData);
      }

      if (!requestResponse.ok) {
        console.error('Request fetch failed:', requestResponse.status); // Debug log
        const errorData = await requestResponse.text();
        console.error('Error response:', errorData);
        
        if (requestResponse.status === 404) {
          toast.error(`Request not found (ID: ${params.id})`);
        } else if (requestResponse.status === 403) {
          toast.error('You do not have permission to view this request');
        } else {
          toast.error(`Failed to fetch request details (${requestResponse.status})`);
        }
        router.push('/approver/requests');
        return;
      }

      const requestData = await requestResponse.json();
      // Handle the API response structure { request: aftRequest }
      setRequest(requestData.request || requestData);
    } catch (error) {
      console.error('Error fetching request details:', error); // Debug log
      toast.error('Error fetching request details');
      router.push('/approver/requests');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (params.id) {
      fetchRequest();
    }
  }, [params.id, fetchRequest]);

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    switch (status.toLowerCase()) {
      case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending_dao': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'pending_approver': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'pending_cpso': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getClassificationColor = (classification: string | undefined) => {
    if (!classification) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    switch (classification.toLowerCase()) {
      case 'unclassified': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cui': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'confidential': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'secret': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'top-secret': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string | undefined) => {
    if (!status) return 'Unknown';
    switch (status.toLowerCase()) {
      case 'submitted': return 'New Submission';
      case 'pending_dao': return 'Pending DAO';
      case 'pending_approver': return 'Pending Approver';
      case 'pending_cpso': return 'Pending CPSO';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getRoleTitle = (role: string) => {
    switch (role.toLowerCase()) {
      case 'dao': return 'Designated Authorizing Official';
      case 'approver': return 'Information System Security Manager';
      case 'cpso': return 'Cyber Physical Security Officer';
      case 'admin': return 'Administrator';
      default: return role.toUpperCase();
    }
  };

  const canApproveRequest = (status: string | undefined, userRole: string) => {
    if (!userRole || !status) return false;
    
    switch (userRole.toLowerCase()) {
      case 'dao':
        return ['submitted', 'pending_dao'].includes(status);
      case 'approver':
        return status === 'pending_approver';
      case 'cpso':
        return status === 'pending_cpso';
      case 'admin':
        return ['submitted', 'pending_dao', 'pending_approver', 'pending_cpso'].includes(status);
      default:
        return false;
    }
  };

  const handleApprove = async () => {
    if (!signature.trim() || !acknowledgeTerms) {
      toast.error('Please fill in all required fields and acknowledge the terms');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/aft-requests/${request?.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          signature: signature.trim(),
          date: new Date().toISOString(),
          acknowledgeTerms,
          approverRole: user?.role
        })
      });

      if (response.ok) {
        toast.success('Request approved successfully');
        setShowApproveDialog(false);
        await fetchRequest(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to approve request');
      }
    } catch (error) {
      toast.error('Error approving request');
      console.error('Approve error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/aft-requests/${request?.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() })
      });

      if (response.ok) {
        toast.success('Request rejected successfully');
        setShowRejectDialog(false);
        await fetchRequest(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to reject request');
      }
    } catch (error) {
      toast.error('Error rejecting request');
      console.error('Reject error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUrgencyLevel = (classification: string | undefined, createdDate: string | undefined) => {
    if (!classification || !createdDate) return 'normal';
    const daysSinceCreated = Math.floor((Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24));
    
    if (['secret', 'top-secret'].includes(classification.toLowerCase())) {
      if (daysSinceCreated >= 2) return 'high';
      if (daysSinceCreated >= 1) return 'medium';
    } else if (classification.toLowerCase() === 'confidential') {
      if (daysSinceCreated >= 5) return 'high';
      if (daysSinceCreated >= 3) return 'medium';
    } else {
      if (daysSinceCreated >= 7) return 'high';
      if (daysSinceCreated >= 5) return 'medium';
    }
    
    return 'normal';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">Loading AFT Request Details...</span>
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
          <p className="text-muted-foreground mb-4">The requested AFT form could not be found or you don&apos;t have permission to view it.</p>
          <Link href="/approver/requests">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Requests
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const canTakeAction = canApproveRequest(request.status, user?.role || '');
  const urgency = getUrgencyLevel(request.classification, request.createdAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/approver/requests">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Requests
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center space-x-2">
              <Shield className="w-6 h-6 text-primary" />
              <span>AFT Request Review</span>
            </h1>
            <p className="text-muted-foreground">{user ? getRoleTitle(user.role) : 'Approver'} Assessment Required</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchRequest} className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Urgency Alert */}
      {urgency === 'high' && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center p-4">
            <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0" />
            <div className="ml-3">
              <p className="text-sm font-medium text-destructive">High Priority Request</p>
              <p className="text-xs text-destructive/80">This request requires immediate attention due to classification level and age.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Overview */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span className="font-mono">{request.requestNumber || 'N/A'}</span>
              </CardTitle>
              <div className="flex items-center space-x-2 mt-2">
                <Badge className={getStatusColor(request.status)}>
                  {getStatusText(request.status)}
                </Badge>
                <Badge className={getClassificationColor(request.classification)} variant="outline">
                  {request.classification?.toUpperCase() || 'UNKNOWN'}
                </Badge>
                <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50 dark:border-blue-400 dark:text-blue-300 dark:bg-blue-950">
                  {request.transferType?.toUpperCase().replace('-TO-', ' → ') || 'N/A'}
                </Badge>
                {urgency !== 'normal' && (
                  <Badge variant="outline" className={urgency === 'high' ? 'border-red-500 text-red-700' : 'border-yellow-500 text-yellow-700'}>
                    {urgency.toUpperCase()} PRIORITY
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Submitted</div>
              <div className="text-sm font-medium">{formatDate(request.createdAt)}</div>
              {request.updatedAt !== request.createdAt && (
                <>
                  <div className="text-sm text-muted-foreground mt-1">Last Updated</div>
                  <div className="text-sm font-medium">{formatDate(request.updatedAt)}</div>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Rejection Notice */}
      {request.status === 'rejected' && request.rejectionReason && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <XCircle className="w-5 h-5" />
              <span>Request Rejected</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive/80">{request.rejectionReason}</p>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Primary Information */}
        <div className="xl:col-span-2 space-y-6">
          {/* Requestor & Transfer Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Requestor Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <p className="text-foreground font-medium">{request.requestorName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Organization</Label>
                  <p className="text-foreground flex items-center space-x-1">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span>{request.requestorOrg || 'N/A'}</span>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-foreground flex items-center space-x-1">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{request.requestorEmail || 'N/A'}</span>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p className="text-foreground flex items-center space-x-1">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{request.requestorPhone || 'N/A'}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Transfer Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Transfer Type</Label>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-sm font-medium">
                      {request.transferType?.toUpperCase().replace('-TO-', ' → ') || 'N/A'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Purpose</Label>
                  <p className="text-foreground">{request.transferPurpose || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Requested Start Date</Label>
                  <p className="text-foreground flex items-center space-x-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{formatDate(request.requestedStartDate)}</span>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Requested End Date</Label>
                  <p className="text-foreground flex items-center space-x-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{formatDate(request.requestedEndDate)}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Server className="w-5 h-5" />
                  <span>Source System</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Information System</Label>
                  <p className="text-foreground font-medium">{request.sourceSystem || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Classification</Label>
                  <Badge className={getClassificationColor(request.classification)} variant="outline">
                    {request.classification?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data Size</Label>
                  <p className="text-foreground font-medium">{request.dataSize || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data Format</Label>
                  <p className="text-foreground font-medium">{request.dataFormat || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HardDrive className="w-5 h-5" />
                  <span>Destination System</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Information System</Label>
                  <p className="text-foreground font-medium">{request.destSystem || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Classification</Label>
                  <Badge className={getClassificationColor(request.classification)} variant="outline">
                    {request.classification?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Urgency Level</Label>
                  <Badge variant="outline" className={
                    urgency === 'high' ? 'border-red-500 text-red-700' : 
                    urgency === 'medium' ? 'border-yellow-500 text-yellow-700' : 
                    'border-gray-500 text-gray-700'
                  }>
                    {(request.urgencyLevel || urgency).toUpperCase()}
                  </Badge>
                </div>
                {request.caveatInfo && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Caveat Information</Label>
                    <p className="text-foreground text-sm">{request.caveatInfo}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5" />
                <span>Data Description & Files</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Data Description</Label>
                <p className="text-foreground">{request.dataDescription || 'N/A'}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">File Details</Label>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">File Name</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Classification</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        // Try to parse file details from transferData first
                        let fileDetails = null;
                        try {
                          if (request.transferData) {
                            fileDetails = JSON.parse(request.transferData);
                          }
                        } catch (error) {
                          console.warn('Failed to parse transferData:', error);
                        }

                        // If we have structured file data, use it
                        if (fileDetails && fileDetails.files && fileDetails.files.length > 0) {
                          return fileDetails.files.slice(0, 3).map((file: { name?: string; fileType?: string; size?: number; lastModified?: number; classification?: string }, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="text-sm font-medium">
                                {file.name || `File ${index + 1}`}
                              </TableCell>
                              <TableCell className="text-sm">
                                <Badge variant="outline" className="text-xs">
                                  {file.fileType ? file.fileType.charAt(0).toUpperCase() + file.fileType.slice(1).replace(/[._-]/g, ' ') : 'Unknown'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                <Badge className={getClassificationColor(file.classification || request.classification)} variant="outline">
                                  {(file.classification || request.classification)?.toUpperCase() || 'UNKNOWN'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ));
                        }

                        // Fallback: parse from dataDescription (legacy requests)
                        if (request.dataDescription && request.dataDescription.includes('files:')) {
                          return request.dataDescription
                            .split('files:')[1]
                            .split(',')
                            .slice(0, 3)
                            .map((fileName, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-sm font-medium">
                                  {fileName.trim() || `File ${index + 1}`}
                                </TableCell>
                                <TableCell className="text-sm">
                                  <Badge variant="outline" className="text-xs">
                                    Unknown
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">
                                  <Badge className={getClassificationColor(request.classification)} variant="outline">
                                    {request.classification?.toUpperCase() || 'UNKNOWN'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ));
                        }

                        // No file data found
                        return (
                          <TableRow>
                            <TableCell className="text-sm text-center py-4" colSpan={3}>
                              <div className="text-muted-foreground">
                                No file details available
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Media Control & Actions */}
        <div className="space-y-6">
          {/* Action Buttons - Move to top for prominence */}
          {canTakeAction && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-primary">
                  <Users className="w-5 h-5" />
                  <span>Decision Required</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {getRoleTitle(user?.role || '')} approval needed
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => setShowApproveDialog(true)}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Request
                </Button>
                <Button 
                  onClick={() => setShowRejectDialog(true)}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Request
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Media Control & Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HardDrive className="w-5 h-5" />
                <span>Media Control Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                // Parse transferData to get extended form information
                let formData = null;
                try {
                  if (request.transferData) {
                    formData = JSON.parse(request.transferData);
                  }
                } catch (error) {
                  console.warn('Failed to parse transferData:', error);
                }

                return (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Media Control Number</Label>
                      <p className="text-foreground font-mono text-sm">{formData?.mediaControlNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Media Type</Label>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{formData?.mediaType?.includes('SSD') ? '💾' : '💿'}</span>
                        <Badge variant="outline" className="text-xs">
                          {formData?.mediaType || request.dataFormat || 'N/A'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Source Classification</Label>
                        <Badge className={getClassificationColor(formData?.sourceISClassification || request.classification)} variant="outline">
                          {formData?.sourceISClassification?.toUpperCase() || request.classification?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Destination Classification</Label>
                        <Badge className={getClassificationColor(formData?.destinationISClassification || request.classification)} variant="outline">
                          {formData?.destinationISClassification?.toUpperCase() || request.classification?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </div>
                    </div>

                    {formData?.isNonHumanReadable && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Process Name</Label>
                        <p className="text-foreground font-mono text-sm">{formData.processName || 'N/A'}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">File Type</Label>
                        <Badge variant="outline" className="text-xs capitalize">
                          {formData?.destinationFile || 'N/A'}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Encrypted</Label>
                        <Badge variant={formData?.mediaEncrypted ? "default" : "secondary"} className="text-xs">
                          {formData?.mediaEncrypted ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>

                    {formData?.mediaTransportedOutside && (
                      <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-900/20 dark:border-amber-800">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <Label className="text-sm font-medium text-amber-800 dark:text-amber-200">External Transport</Label>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Destination</Label>
                            <p className="text-sm text-foreground">{formData.mediaDestination || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Point of Contact</Label>
                            <p className="text-sm text-foreground">{formData.destinationPOC || 'N/A'}</p>
                          </div>
                          {formData.destinationAddress && (
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Address</Label>
                              <p className="text-sm text-foreground">{formData.destinationAddress}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approval Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Approve AFT Request</span>
            </DialogTitle>
            <DialogDescription>
              You are about to approve AFT Request {request.requestNumber} as {getRoleTitle(user?.role || '')}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="signature">Digital Signature *</Label>
              <Input
                id="signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Enter your full name as digital signature"
                className="mt-1"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="acknowledge"
                checked={acknowledgeTerms}
                onCheckedChange={(checked) => setAcknowledgeTerms(checked as boolean)}
              />
              <Label htmlFor="acknowledge" className="text-sm">
                I acknowledge that I have reviewed this request thoroughly and approve it under my authority as {getRoleTitle(user?.role || '')}.
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprove} 
              disabled={actionLoading || !signature.trim() || !acknowledgeTerms}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {actionLoading ? 'Processing...' : 'Approve Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span>Reject AFT Request</span>
            </DialogTitle>
            <DialogDescription>
              You are about to reject AFT Request {request.requestNumber}. Please provide a detailed reason.
            </DialogDescription>
          </DialogHeader>
          
          <div>
            <Label htmlFor="reject-reason">Reason for Rejection *</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a detailed explanation for why this request is being rejected..."
              rows={4}
              className="mt-1"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject} 
              disabled={actionLoading || !rejectReason.trim()}
            >
              {actionLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              {actionLoading ? 'Processing...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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