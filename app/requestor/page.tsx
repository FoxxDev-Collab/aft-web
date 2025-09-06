'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface AFTRequest {
  id: number;
  requestNumber: string;
  status: string;
  transferType: string;
  classification: string;
  transferPurpose: string;
  requestedStartDate: string;
  createdAt: string;
}

interface DashboardStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
}

export default function RequestorDashboard() {
  const [recentRequests, setRecentRequests] = useState<AFTRequest[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/aft-requests?scope=my-requests');
      
      if (response.ok) {
        const data = await response.json();
        const requests = data.requests || [];
        
        // Calculate stats
        const newStats = {
          total: requests.length,
          draft: requests.filter((r: AFTRequest) => r.status === 'draft').length,
          pending: requests.filter((r: AFTRequest) => 
            ['submitted', 'pending_dao', 'pending_approver', 'pending_cpso'].includes(r.status)
          ).length,
          approved: requests.filter((r: AFTRequest) => r.status === 'approved').length,
          rejected: requests.filter((r: AFTRequest) => r.status === 'rejected').length,
          completed: requests.filter((r: AFTRequest) => 
            ['completed', 'disposed'].includes(r.status)
          ).length,
        };
        
        setStats(newStats);
        
        // Get recent requests (last 5)
        const recent = requests
          .sort((a: AFTRequest, b: AFTRequest) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
        setRecentRequests(recent);
      } else {
        toast.error('Failed to fetch dashboard data');
      }
    } catch (error) {
      toast.error('Error loading dashboard');
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
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending_dao': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'pending_approver': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'pending_cpso': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'disposed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'Draft';
      case 'submitted': return 'Awaiting Approval';
      case 'pending_dao': return 'Pending DAO';
      case 'pending_approver': return 'Pending Approver';
      case 'pending_cpso': return 'Pending CPSO';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'completed': return 'Completed';
      case 'disposed': return 'Disposed';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/requestor/request/new" className="flex-1">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-primary/20 bg-primary/5">
            <CardContent className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-foreground">New Request</h3>
                <p className="text-sm text-muted-foreground">Create a new AFT request</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/requestor/requests" className="flex-1">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-foreground">View All Requests</h3>
                <p className="text-sm text-muted-foreground">Manage your requests</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <div className="flex-shrink-0">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <div className="ml-3">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="ml-3">
              <div className="text-2xl font-bold text-foreground">{stats.draft}</div>
              <div className="text-xs text-muted-foreground">Draft</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="ml-3">
              <div className="text-2xl font-bold text-foreground">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <div className="flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-3">
              <div className="text-2xl font-bold text-foreground">{stats.approved}</div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <div className="flex-shrink-0">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="ml-3">
              <div className="text-2xl font-bold text-foreground">{stats.rejected}</div>
              <div className="text-xs text-muted-foreground">Rejected</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <div className="flex-shrink-0">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <div className="ml-3">
              <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Recent Requests</span>
            </CardTitle>
            <CardDescription>Your latest AFT requests</CardDescription>
          </div>
          <Link href="/requestor/requests">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No requests yet</h3>
              <p className="text-muted-foreground mb-4">Create your first AFT request to get started.</p>
              <Link href="/requestor/request/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Request
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <Link 
                          href={`/requestor/requests/${request.id}`}
                          className="font-mono text-sm text-primary hover:text-primary/80 hover:underline"
                        >
                          {request.requestNumber}
                        </Link>
                        <Badge className={getStatusColor(request.status)}>
                          {getStatusText(request.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate max-w-md" title={request.transferPurpose}>
                        {request.transferPurpose}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                        <span>{request.transferType.charAt(0).toUpperCase() + request.transferType.slice(1)}</span>
                        <span>•</span>
                        <span>{request.classification.toUpperCase()}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Created {formatDate(request.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {request.status === 'rejected' && (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}