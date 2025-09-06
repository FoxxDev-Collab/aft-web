'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  ArrowRightLeft, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Calendar,
  User,
  Database,
  Activity,
  TrendingUp,
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
}

interface User {
  id: number;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface DashboardStats {
  pendingDTA: number;
  activeSME: number;
  activeMediaCustodian: number;
  completedToday: number;
  totalActive: number;
  totalCompleted: number;
}

export default function DTADashboard() {
  const [pendingRequests, setPendingRequests] = useState<AFTRequest[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    pendingDTA: 0,
    activeSME: 0,
    activeMediaCustodian: 0,
    completedToday: 0,
    totalActive: 0,
    totalCompleted: 0
  });
  const [loading, setLoading] = useState(true);

  const getRoleTitle = (role: string | undefined) => {
    if (!role) return 'DTA';
    switch (role.toLowerCase()) {
      case 'dta': return 'Data Transfer Agent';
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
        
        
        // Calculate stats
        const pendingDTA = allRequests.filter((r: AFTRequest) => r.status === 'pending_dta').length;
        const activeSME = allRequests.filter((r: AFTRequest) => r.status === 'pending_sme').length;
        const activeMediaCustodian = allRequests.filter((r: AFTRequest) => r.status === 'pending_media_custodian').length;
        const completed = allRequests.filter((r: AFTRequest) => r.status === 'completed').length;
        const totalActive = allRequests.filter((r: AFTRequest) => 
          ['pending_dta', 'pending_sme', 'pending_media_custodian'].includes(r.status)
        ).length;
        
        // Calculate completed today
        const today = new Date().toDateString();
        const completedToday = allRequests.filter((r: AFTRequest) => 
          r.status === 'completed' && new Date(r.createdAt).toDateString() === today
        ).length;
        
        const newStats = {
          pendingDTA,
          activeSME,
          activeMediaCustodian,
          completedToday,
          totalActive,
          totalCompleted: completed
        };
        
        setStats(newStats);
        
        // Get recent pending DTA requests (last 5)
        const recentPendingDTA = allRequests
          .filter((r: AFTRequest) => r.status === 'pending_dta')
          .sort((a: AFTRequest, b: AFTRequest) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
        setPendingRequests(recentPendingDTA);
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
      case 'pending_dta': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending_sme': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'pending_media_custodian': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'disposed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending_dta': return 'Pending DTA';
      case 'pending_sme': return 'Pending SME';
      case 'pending_media_custodian': return 'Pending Media Custodian';
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
          {user?.role ? getRoleTitle(user.role) : 'DTA'} Dashboard
        </h1>
        <p className="text-primary-foreground/90">Manage data transfers and coordinate workflow</p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dta/requests" className="col-span-1">
          <Card className="transition-shadow cursor-pointer border-primary/20 bg-primary/5">
            <CardContent className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-foreground">Transfer Requests</h3>
                <p className="text-sm text-muted-foreground">Process pending requests</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dta/transfers" className="col-span-1">
          <Card className="transition-shadow cursor-pointer">
            <CardContent className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <ArrowRightLeft className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-foreground">Active Transfers</h3>
                <p className="text-sm text-muted-foreground">Monitor in-progress transfers</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dta/history" className="col-span-1">
          <Card className="transition-shadow cursor-pointer">
            <CardContent className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <Database className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-foreground">Transfer History</h3>
                <p className="text-sm text-muted-foreground">Review completed transfers</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">{stats.pendingDTA}</div>
              <div className="text-sm text-muted-foreground">Pending DTA Review</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <User className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">{stats.activeSME}</div>
              <div className="text-sm text-muted-foreground">Active SME Review</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <Activity className="w-8 h-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">{stats.activeMediaCustodian}</div>
              <div className="text-sm text-muted-foreground">Media Custodian Review</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">{stats.totalCompleted}</div>
              <div className="text-sm text-muted-foreground">Completed Transfers</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <span>Requests Pending DTA Processing</span>
            </CardTitle>
            <CardDescription>
              AFT requests requiring Data Transfer Agent coordination
            </CardDescription>
          </div>
          <Link href="/dta/requests">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No pending requests</h3>
              <p className="text-muted-foreground">
                All transfer requests have been processed or assigned.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100/80 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Link 
                          href={`/dta/requests/${request.id}`}
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
                          <span>Requested: {formatDate(request.requestedStartDate)}</span>
                        </div>
                        {request.dataSize && (
                          <>
                            <span>•</span>
                            <span>{request.dataSize}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Link href={`/dta/requests/${request.id}`}>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        Review for Processing
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Transfer Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Active</span>
              <span className="text-lg font-bold">{stats.totalActive}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Completed Today</span>
              <span className="text-lg font-bold text-green-600">{stats.completedToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Completed</span>
              <span className="text-lg font-bold">{stats.totalCompleted}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Workflow Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span className="text-sm">Pending DTA</span>
              </div>
              <span className="font-bold">{stats.pendingDTA}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                <span className="text-sm">SME Review</span>
              </div>
              <span className="font-bold">{stats.activeSME}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                <span className="text-sm">Media Custodian</span>
              </div>
              <span className="font-bold">{stats.activeMediaCustodian}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}