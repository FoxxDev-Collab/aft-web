'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Calendar,
  User,
  Shield
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
}

interface User {
  id: number;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface DashboardStats {
  pending: number;
  approved: number;
  total: number;
}

export default function ApproverDashboard() {
  const [pendingRequests, setPendingRequests] = useState<AFTRequest[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    pending: 0,
    approved: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  const getRoleTitle = (role: string | undefined) => {
    if (!role) return 'Approver';
    switch (role.toLowerCase()) {
      case 'dao': return 'Designated Authorizing Official';
      case 'approver': return 'Information System Security Manager';
      case 'cpso': return 'Cyber Physical Security Officer';
      case 'admin': return 'Administrator';
      default: return role.toUpperCase();
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch both requests and user data
      const [requestsResponse, userResponse] = await Promise.all([
        fetch('/api/aft-requests'),
        fetch('/api/auth/me')
      ]);
      
      let userData = null;
      if (userResponse.ok) {
        userData = await userResponse.json();
        setUser(userData);
      }
      
      if (requestsResponse.ok) {
        const data = await requestsResponse.json();
        const allRequests = data.requests || [];
        
        // Filter requests based on user role and status
        let relevantRequests = allRequests;
        
        if (userData) {
          const userRole = userData.role;
          
          // Filter based on role and what they can approve
          if (userRole === 'dao') {
            relevantRequests = allRequests.filter((r: AFTRequest) => 
              ['submitted', 'pending_dao'].includes(r.status)
            );
          } else if (userRole === 'approver') {
            relevantRequests = allRequests.filter((r: AFTRequest) => 
              r.status === 'pending_approver'
            );
          } else if (userRole === 'cpso') {
            relevantRequests = allRequests.filter((r: AFTRequest) => 
              r.status === 'pending_cpso'
            );
          } else if (userRole === 'admin') {
            relevantRequests = allRequests.filter((r: AFTRequest) => 
              ['submitted', 'pending_dao', 'pending_approver', 'pending_cpso'].includes(r.status)
            );
          }
        }
        
        // Calculate stats
        const newStats = {
          pending: relevantRequests.length,
          approved: allRequests.filter((r: AFTRequest) => r.status === 'approved').length,
          total: allRequests.length
        };
        
        setStats(newStats);
        
        // Get recent pending requests (last 5)
        const recentPending = relevantRequests
          .sort((a: AFTRequest, b: AFTRequest) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .slice(0, 5);
        setPendingRequests(recentPending);
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
      case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending_dao': return 'bg-yellow-100/80 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'pending_approver': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'pending_cpso': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted': return 'New Submission';
      case 'pending_dao': return 'Pending DAO';
      case 'pending_approver': return 'Pending Approver';
      case 'pending_cpso': return 'Pending CPSO';
      case 'approved': return 'Approved';
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-lg p-6 text-primary-foreground">
        <h1 className="text-3xl font-bold mb-2">
          {user?.role ? getRoleTitle(user.role) : 'Approver'} Dashboard
        </h1>
        <p className="text-primary-foreground/90">Review and approve AFT requests</p>
        {user && (
          <div className="mt-2 flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span className="text-primary-foreground/90">
              {user.firstName} {user.lastName} ({user.email})
            </span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/approver/requests" className="flex-1">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-primary/20 bg-primary/5">
            <CardContent className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-foreground">Review Requests</h3>
                <p className="text-sm text-muted-foreground">View pending AFT requests</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/approver/history" className="flex-1">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-foreground">Approval History</h3>
                <p className="text-sm text-muted-foreground">View signed requests</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">
                Pending {user?.role ? getRoleTitle(user.role).split(' ')[0] : 'Approver'} Review
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">{stats.approved}</div>
              <div className="text-sm text-muted-foreground">Approved Requests</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Requests</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span>Requests Awaiting Your Review</span>
            </CardTitle>
            <CardDescription>
              {user?.role && `AFT requests that require ${getRoleTitle(user.role)} approval`}
            </CardDescription>
          </div>
          <Link href="/approver/requests">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No pending requests</h3>
              <p className="text-muted-foreground">
                All requests requiring your approval have been processed.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-yellow-100/80 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Link 
                          href={`/approver/requests/${request.id}`}
                          className="font-mono text-sm font-semibold text-primary hover:text-primary/80 hover:underline"
                        >
                          {request.requestNumber}
                        </Link>
                        <Badge className={getStatusColor(request.status)}>
                          {getStatusText(request.status)}
                        </Badge>
                        <Badge className={getClassificationColor(request.classification)} variant="outline">
                          {request.classification.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground font-medium truncate max-w-md" title={request.transferPurpose}>
                        {request.transferPurpose}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{request.requestorName} ({request.requestorOrg})</span>
                        </div>
                        <span>•</span>
                        <span>{request.transferType.charAt(0).toUpperCase() + request.transferType.slice(1)}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Start: {formatDate(request.requestedStartDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Link href={`/approver/requests/${request.id}`}>
                      <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                        Review
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority Notice for High Classifications */}
      {pendingRequests.some(r => ['secret', 'top-secret'].includes(r.classification.toLowerCase())) && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex items-center p-4">
            <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0" />
            <div className="ml-3">
              <p className="text-sm font-medium text-destructive">
                High Classification Requests Pending
              </p>
              <p className="text-xs text-destructive/80">
                You have Secret or Top Secret requests requiring immediate attention.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}