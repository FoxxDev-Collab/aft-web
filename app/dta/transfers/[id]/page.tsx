'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  FileText, 
  Database,
  Shield,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import SectionIVComponent from '@/components/section-iv';

interface RequestData {
  id: number;
  requestNumber: string;
  status: string;
  requestorName: string;
  requestorOrg: string;
  requestorEmail: string;
  transferPurpose: string;
  transferType: string;
  classification: string;
  dataDescription: string;
  sourceSystem: string;
  destSystem: string;
  dataSize: string;
  createdAt: string;
  updatedAt: string;
  transferData?: string;
}

interface User {
  id: number;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function ActiveTransferPage() {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<RequestData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRequest = useCallback(async () => {
    try {
      setLoading(true);
      
      const [requestResponse, userResponse] = await Promise.all([
        fetch(`/api/aft-requests/${params.id}`),
        fetch('/api/auth/me')
      ]);

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }

      if (!requestResponse.ok) {
        if (requestResponse.status === 404) {
          toast.error(`Transfer not found (ID: ${params.id})`);
        } else if (requestResponse.status === 403) {
          toast.error('You do not have permission to view this transfer');
        } else {
          toast.error(`Failed to fetch transfer details (${requestResponse.status})`);
        }
        router.push('/dta/transfers');
        return;
      }

      const requestData = await requestResponse.json();
      setRequest(requestData.request || requestData);
    } catch (error) {
      console.error('Error fetching transfer details:', error);
      toast.error('Error fetching transfer details');
      router.push('/dta/transfers');
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
      case 'active_transfer': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending_sme_signature': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
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
      case 'active_transfer': return 'Active Transfer';
      case 'pending_sme_signature': return 'Awaiting SME Signature';
      case 'completed': return 'Completed';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">Loading Active Transfer...</span>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Transfer Not Found</h3>
          <p className="text-muted-foreground mb-4">The requested transfer could not be found or you don&apos;t have permission to view it.</p>
          <Link href="/dta/transfers">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Transfers
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dta/transfers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Transfers
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center space-x-2">
              <Database className="w-6 h-6 text-primary" />
              <span>Active AFT Transfer</span>
            </h1>
            <p className="text-muted-foreground">Section IV Processing & Transfer Completion</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchRequest} className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Transfer Overview */}
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
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Transfer Started</div>
              <div className="text-sm font-medium">{formatDate(request.updatedAt)}</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Transfer Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">From</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{request.sourceSystem}</p>
            <Badge className={`${getClassificationColor(request.classification)} mt-2`} variant="outline">
              {request.classification?.toUpperCase()}
            </Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">To</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{request.destSystem}</p>
            <Badge className={`${getClassificationColor(request.classification)} mt-2`} variant="outline">
              {request.classification?.toUpperCase()}
            </Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Data Size</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{request.dataSize || 'N/A'}</p>
            <p className="text-sm text-muted-foreground mt-1">Requestor: {request.requestorName}</p>
          </CardContent>
        </Card>
      </div>

      {/* Section IV Component */}
      <SectionIVComponent 
        requestId={request.id}
        requestData={request}
        onRefresh={fetchRequest}
        user={user}
      />

      {/* Transfer Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Transfer Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Transfer Initiated</p>
                <p className="text-xs text-muted-foreground">DTA has begun transfer process</p>
              </div>
            </div>
            
            <div className={`flex items-center space-x-3 ${request.status === 'active_transfer' ? 'opacity-100' : 'opacity-50'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                request.status === 'active_transfer' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <Shield className={`w-4 h-4 ${request.status === 'active_transfer' ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm font-medium">Section IV Processing</p>
                <p className="text-xs text-muted-foreground">
                  {request.status === 'active_transfer' ? 'In progress' : 'Pending'}
                </p>
              </div>
            </div>

            <div className={`flex items-center space-x-3 ${request.status === 'pending_sme_signature' || request.status === 'completed' ? 'opacity-100' : 'opacity-50'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                request.status === 'pending_sme_signature' || request.status === 'completed' ? 'bg-orange-100' : 'bg-gray-100'
              }`}>
                <FileText className={`w-4 h-4 ${request.status === 'pending_sme_signature' || request.status === 'completed' ? 'text-orange-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm font-medium">SME Signature</p>
                <p className="text-xs text-muted-foreground">
                  {request.status === 'pending_sme_signature' ? 'Awaiting SME signature' : request.status === 'completed' ? 'Completed' : 'Pending transfer completion'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}