'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Archive,
  RefreshCw,
  CheckCircle,
  Clock,
  Trash2,
  FileText,
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
  updatedAt: string;
  dataSize: string;
  sourceSystem: string;
  destSystem: string;
}

export default function CustodianDashboard() {
  const [pendingDisposition, setPendingDisposition] = useState<AFTRequest[]>([]);
  const [recentCompleted, setRecentCompleted] = useState<AFTRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/aft-requests');
      
      if (response.ok) {
        const data = await response.json();
        const allRequests = data.requests || [];
        
        // Filter for media custodian pending disposition requests
        const pending = allRequests.filter((r: AFTRequest) => 
          r.status === 'pending_media_custodian'
        );
        
        // Filter for recently completed dispositions
        const completed = allRequests.filter((r: AFTRequest) => 
          ['completed', 'disposed'].includes(r.status)
        ).slice(0, 5); // Show only recent 5
        
        setPendingDisposition(pending);
        setRecentCompleted(completed);
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
      case 'pending_media_custodian': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'disposed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending_media_custodian': return 'Pending Disposition';
      case 'completed': return 'Completed';
      case 'disposed': return 'Disposed';
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
            <Archive className="w-6 h-6 text-primary" />
            <span>Media Custodian Dashboard</span>
          </h1>
          <p className="text-muted-foreground">Manage final media disposition and archive completion</p>
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
              <Archive className="w-8 h-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">
                {pendingDisposition.length}
              </div>
              <div className="text-sm text-muted-foreground">Pending Disposition</div>
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
                {recentCompleted.filter(r => r.status === 'completed').length}
              </div>
              <div className="text-sm text-muted-foreground">Recently Completed</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <Trash2 className="w-8 h-8 text-gray-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">
                {recentCompleted.filter(r => r.status === 'disposed').length}
              </div>
              <div className="text-sm text-muted-foreground">Recently Disposed</div>
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
                {pendingDisposition.filter(r => {
                  const days = Math.floor((Date.now() - new Date(r.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
                  return days > 3;
                }).length}
              </div>
              <div className="text-sm text-muted-foreground">Overdue (3+ days)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Archive className="w-5 h-5" />
              <span>Pending Media Disposition</span>
            </CardTitle>
            <CardDescription>
              Transfers awaiting final media disposition processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingDisposition.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No pending disposition requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingDisposition.slice(0, 3).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Link 
                        href={`/custodian/disposition/${request.id}`}
                        className="font-mono text-sm font-semibold text-primary hover:underline"
                      >
                        {request.requestNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate" title={request.transferPurpose}>
                        {request.transferPurpose}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getClassificationColor(request.classification)} variant="outline">
                          {request.classification.toUpperCase()}
                        </Badge>
                        {(() => {
                          const days = Math.floor((Date.now() - new Date(request.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
                          return days > 3 ? (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              OVERDUE
                            </Badge>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
                {pendingDisposition.length > 3 && (
                  <div className="text-center pt-2">
                    <Link href="/custodian/disposition">
                      <Button variant="outline" size="sm">
                        View All ({pendingDisposition.length})
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
              <CheckCircle className="w-5 h-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>
              Recently processed dispositions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentCompleted.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCompleted.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Link 
                        href={`/custodian/history/${request.id}`}
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
                  <Link href="/custodian/history">
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

      {/* Priority Alerts */}
      {pendingDisposition.some(r => {
        const days = Math.floor((Date.now() - new Date(r.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        return days > 3;
      }) && (
        <Card className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-800 dark:text-red-200">
              <AlertCircle className="w-5 h-5" />
              <span>Priority Alert</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 dark:text-red-300 mb-4">
              You have overdue disposition requests that require immediate attention.
            </p>
            <Link href="/custodian/disposition">
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                Review Overdue Items
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}