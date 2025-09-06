'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Archive,
  ArrowLeft,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Package,
  RefreshCw,
  FileText,
  AlertCircle,
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
  transferMethod?: string;
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

export default function CustodianDispositionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<RequestData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [, setShowDispositionDialog] = useState(false);
  const [dispositionType, setDispositionType] = useState('');
  const [custodianName, setCustodianName] = useState('');
  const [dispositionMethod, setDispositionMethod] = useState('');
  const [comments, setComments] = useState('');
  const [mediaDetails, setMediaDetails] = useState('');
  const [acknowledgeTerms] = useState(false);

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
        router.push('/custodian/disposition');
        return;
      }

      const requestData = await requestResponse.json();
      // Handle the API response structure { request: aftRequest }
      setRequest(requestData.request || requestData);
    } catch (error) {
      console.error('Error fetching request details:', error); // Debug log
      toast.error('Error fetching request details');
      router.push('/custodian/disposition');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (params.id) {
      fetchRequest();
    }
  }, [params.id, fetchRequest]);

  const handleProcessDisposition = async () => {
    if (!dispositionType || !custodianName.trim() || !acknowledgeTerms) {
      toast.error('Please fill in all required fields and acknowledge the terms');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/aft-requests/${request?.id}/disposition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispositionType,
          custodianName: custodianName.trim(),
          dispositionMethod: dispositionMethod.trim(),
          comments: comments.trim(),
          mediaDetails: mediaDetails.trim(),
          date: new Date().toISOString(),
          acknowledgeTerms
        })
      });

      if (response.ok) {
        toast.success('Media disposition processed successfully');
        setShowDispositionDialog(false);
        await fetchRequest(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to process disposition');
      }
    } catch (error) {
      toast.error('Error processing disposition');
      console.error('Process disposition error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    switch (status.toLowerCase()) {
      case 'pending_media_custodian': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'disposed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
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
      case 'top-secret-sci': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string | undefined) => {
    if (!status) return 'Unknown';
    switch (status.toLowerCase()) {
      case 'pending_media_custodian': return 'Pending Media Disposition';
      case 'completed': return 'Completed';
      case 'disposed': return 'Disposed';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getRoleTitle = (role: string) => {
    switch (role.toLowerCase()) {
      case 'media_custodian': return 'Media Custodian';
      case 'admin': return 'Administrator';
      default: return role.toUpperCase();
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
    
    if (['secret', 'top-secret', 'top-secret-sci'].includes(classification.toLowerCase())) {
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

  const isOverdue = (request: RequestData) => {
    const days = Math.floor((Date.now() - new Date(request.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    return days > 3;
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
          <p className="text-muted-foreground mb-4">The requested transfer could not be found or you don&apos;t have permission to view it.</p>
          <Link href="/custodian/disposition">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Disposition
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const canProcess = request.status === 'pending_media_custodian';
  const urgency = getUrgencyLevel(request.classification, request.createdAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/custodian/disposition">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Disposition
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center space-x-2">
              <Archive className="w-6 h-6 text-primary" />
              <span>Media Disposition</span>
            </h1>
            <p className="text-muted-foreground">{user ? getRoleTitle(user.role) : 'Media Custodian'} Processing Required</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchRequest} className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Urgency Alert */}
      {(urgency === 'high' || isOverdue(request)) && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center p-4">
            <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0" />
            <div className="ml-3">
              <p className="text-sm font-medium text-destructive">
                {urgency === 'high' ? 'High Priority Request' : 'Overdue Request'}
              </p>
              <p className="text-xs text-destructive/80">
                {urgency === 'high' 
                  ? 'This request requires immediate attention due to classification level and age.' 
                  : 'This request is overdue for media disposition processing.'
                }
              </p>
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
                {isOverdue(request) && (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    OVERDUE
                  </Badge>
                )}
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

      {/* Media Disposition Processing */}
      {canProcess && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Media Disposition Processing</span>
            </CardTitle>
            <CardDescription>
              Complete the final disposition of physical media used in this transfer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Disposition Type *</Label>
                <RadioGroup value={dispositionType} onValueChange={setDispositionType} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="completed" id="completed" />
                    <Label htmlFor="completed">Transfer Completed - Media Archived</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="disposed" id="disposed" />
                    <Label htmlFor="disposed">Media Disposed/Destroyed</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custodianName">Media Custodian Name *</Label>
                <Input
                  id="custodianName"
                  placeholder="Enter your full name"
                  value={custodianName}
                  onChange={(e) => setCustodianName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dispositionMethod">Disposition Method</Label>
                <Input
                  id="dispositionMethod"
                  placeholder="e.g., Secure archive storage, DoD 5220.22-M wipe, Physical destruction"
                  value={dispositionMethod}
                  onChange={(e) => setDispositionMethod(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mediaDetails">Media Details</Label>
                <Textarea
                  id="mediaDetails"
                  placeholder="Describe the media type, serial numbers, storage location, or destruction details..."
                  value={mediaDetails}
                  onChange={(e) => setMediaDetails(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comments</Label>
                <Textarea
                  id="comments"
                  placeholder="Add any additional comments about the disposition process..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                By processing this disposition, you confirm that all media has been properly handled according to security policies.
              </div>
              <Button 
                onClick={handleProcessDisposition}
                disabled={actionLoading || !dispositionType || !custodianName.trim()}
                className={`${
                  dispositionType === 'disposed' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {process ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {dispositionType === 'disposed' ? (
                      <Trash2 className="w-4 h-4 mr-2" />
                    ) : (
                      <Archive className="w-4 h-4 mr-2" />
                    )}
                    Process Disposition
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!canProcess && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Disposition Already Processed</h3>
            <p className="text-muted-foreground">
              This transfer has already been processed or is not ready for media disposition.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}