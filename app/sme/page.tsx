'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  UserCheck,
  RefreshCw,
  Database,
  CheckCircle,
  Clock,
  History,
  FileText
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

export default function SMEDashboard() {
  const [pendingRequests, setPendingRequests] = useState<AFTRequest[]>([]);
  const [recentSigned, setRecentSigned] = useState<AFTRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/aft-requests');
      
      if (response.ok) {
        const data = await response.json();
        const allRequests = data.requests || [];
        
        // Filter for SME pending signature requests
        const pending = allRequests.filter((r: AFTRequest) => 
          ['pending_sme_signature', 'pending_sme'].includes(r.status)
        );
        
        // Filter for recently signed requests
        const signed = allRequests.filter((r: AFTRequest) => 
          ['pending_media_custodian', 'completed'].includes(r.status)
        ).slice(0, 5); // Show only recent 5
        
        setPendingRequests(pending);
        setRecentSigned(signed);
      } else {
        toast.error('Failed to fetch dashboard data');
      }
    } catch (error) {
      toast.error('Error loading dashboard data');
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending_sme_signature': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'pending_sme': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'pending_media_custodian': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending_sme_signature': return 'Awaiting Signature';
      case 'pending_sme': return 'SME Review';
      case 'pending_media_custodian': return 'With Media Custodian';
      case 'completed': return 'Completed';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
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
          <span className="text-lg text-muted-foreground">Loading dashboard...</span>
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
            <UserCheck className="w-6 h-6 text-primary" />
            <span>SME Dashboard</span>
          </h1>
          <p className="text-muted-foreground">Subject Matter Expert transfer signature portal</p>
        </div>
        <Button variant="outline" onClick={fetchDashboardData} className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/20">
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <UserCheck className="w-8 h-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">
                {pendingRequests.length}
              </div>
              <div className="text-sm text-muted-foreground">Pending Signatures</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">
                {recentSigned.length}
              </div>
              <div className="text-sm text-muted-foreground">Recently Signed</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">
                {pendingRequests.filter(r => {
                  const days = Math.floor((Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                  return days > 2;
                }).length}
              </div>
              <div className="text-sm text-muted-foreground">Overdue (2+ days)</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <Database className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">
                {pendingRequests.length + recentSigned.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Active</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5" />
              <span>Pending Signature Requests</span>
            </CardTitle>
            <CardDescription>
              Transfers awaiting your signature for completion
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No pending signature requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.slice(0, 3).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Link 
                        href={`/sme/requests/${request.id}`}
                        className="font-mono text-sm font-semibold text-primary hover:underline"
                      >
                        {request.requestNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate" title={request.transferPurpose}>
                        {request.transferPurpose}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getClassificationColor(request.classification)} variant="outline">
                        {request.classification.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
                {pendingRequests.length > 3 && (
                  <div className="text-center pt-2">
                    <Link href="/sme/requests">
                      <Button variant="outline" size="sm">
                        View All ({pendingRequests.length})
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="w-5 h-5" />
              <span>Recently Signed</span>
            </CardTitle>
            <CardDescription>
              Your recent signature activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentSigned.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No recent signatures</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSigned.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Link 
                        href={`/sme/history/${request.id}`}
                        className="font-mono text-sm font-semibold text-primary hover:underline"
                      >
                        {request.requestNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate" title={request.transferPurpose}>
                        {request.transferPurpose}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(request.status)}>
                        {getStatusText(request.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
                <div className="text-center pt-2">
                  <Link href="/sme/history">
                    <Button variant="outline" size="sm">
                      View History
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}