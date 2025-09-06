'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
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
  approvedAt?: string;
  approvedBy?: string;
}

interface User {
  id: number;
  role: string;
  firstName: string;
  lastName: string;
}

export default function ApproverHistoryPage() {
  const [requests, setRequests] = useState<AFTRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<AFTRequest[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classificationFilter, setClassificationFilter] = useState('all');

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

  const fetchApprovalHistory = async () => {
    try {
      setLoading(true);
      
      const [requestsResponse, userResponse] = await Promise.all([
        fetch('/api/aft-requests?status=all'),
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
        
        // For debugging - let's first show all requests and then gradually add filtering
        let historyRequests = allRequests;
        
        console.log('All requests from API:', allRequests);
        console.log('User role:', userData?.role);
        
        if (userData) {
          const userRole = userData.role;
          
          // For now, let's be less restrictive and show more requests for testing
          if (userRole === 'dao') {
            // DAO: Show requests that aren't just drafts
            historyRequests = allRequests.filter((r: AFTRequest) => 
              !['draft'].includes(r.status)
            );
          } else if (userRole === 'approver') {
            // Approver: Show requests that have moved beyond initial submission
            historyRequests = allRequests.filter((r: AFTRequest) => 
              !['draft'].includes(r.status)
            );
          } else if (userRole === 'cpso') {
            // CPSO: Show requests that have moved beyond initial stages
            historyRequests = allRequests.filter((r: AFTRequest) => 
              !['draft'].includes(r.status)
            );
          } else if (userRole === 'admin') {
            // Admin can see all non-draft requests
            historyRequests = allRequests.filter((r: AFTRequest) => 
              !['draft'].includes(r.status)
            );
          }
        }
        
        console.log('Filtered history requests:', historyRequests);
        
        setRequests(historyRequests);
        setFilteredRequests(historyRequests);
      } else {
        toast.error('Failed to fetch approval history');
      }
    } catch (error) {
      toast.error('Error fetching approval history');
      console.error('Fetch history error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovalHistory();
  }, []);

  // Filter requests based on search term, status, and classification
  useEffect(() => {
    let filtered = requests;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Filter by classification
    if (classificationFilter !== 'all') {
      filtered = filtered.filter(request => request.classification === classificationFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(request => 
        request.requestNumber.toLowerCase().includes(searchLower) ||
        request.transferPurpose.toLowerCase().includes(searchLower) ||
        request.requestorName.toLowerCase().includes(searchLower) ||
        request.requestorOrg.toLowerCase().includes(searchLower)
      );
    }

    setFilteredRequests(filtered);
  }, [requests, searchTerm, statusFilter, classificationFilter]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending_approver': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'pending_cpso': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'pending_dta': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending_sme': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'pending_media_custodian': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'disposed': return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification.toLowerCase()) {
      case 'unclassified': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cui': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'confidential': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'secret': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'top-secret': return 'bg-red-100 text-destructive dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'pending_approver': return 'Pending Approver';
      case 'pending_cpso': return 'Pending CPSO';
      case 'pending_dta': return 'With DTA';
      case 'pending_sme': return 'With SME';
      case 'pending_media_custodian': return 'Media Custodian';
      case 'completed': return 'Completed';
      case 'disposed': return 'Disposed';
      default: return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <div className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading approval history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Approval History
          </h1>
          <p className="text-muted-foreground mt-1">
            View requests you have reviewed and processed as {user?.role ? getRoleTitle(user.role) : 'Approver'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-primary">
            {user && `${user.firstName} ${user.lastName}`}
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search by request number, purpose, or requestor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="pending_approver">Pending Approver</SelectItem>
                  <SelectItem value="pending_cpso">Pending CPSO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={classificationFilter} onValueChange={setClassificationFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classifications</SelectItem>
                  <SelectItem value="unclassified">UNCLASSIFIED</SelectItem>
                  <SelectItem value="cui">CUI</SelectItem>
                  <SelectItem value="confidential">CONFIDENTIAL</SelectItem>
                  <SelectItem value="secret">SECRET</SelectItem>
                  <SelectItem value="top-secret">TOP SECRET</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={fetchApprovalHistory} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Approval History ({filteredRequests.length})</span>
          </CardTitle>
          <CardDescription>
            {filteredRequests.length === 0 && requests.length > 0
              ? 'No requests match your current filters'
              : `AFT requests you have processed as ${user?.role ? getRoleTitle(user.role) : 'Approver'}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {requests.length === 0 ? 'No approval history' : 'No matching requests'}
              </h3>
              <p className="text-muted-foreground">
                {requests.length === 0 
                  ? "You haven't processed any requests yet."
                  : 'Try adjusting your search or filters.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Request #</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Transfer Type</TableHead>
                    <TableHead>Requestor</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(request.status)}
                          <Badge className={getStatusColor(request.status)}>
                            {getStatusText(request.status)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <Link 
                          href={`/approver/requests/${request.id}`}
                          className="text-primary hover:text-primary/80 hover:underline font-semibold"
                        >
                          {request.requestNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge className={getClassificationColor(request.classification)} variant="outline">
                          {request.classification?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.transferType?.toUpperCase().replace('-TO-', ' → ') || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{request.requestorName}</div>
                            <div className="text-xs text-muted-foreground">{request.requestorOrg}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={request.transferPurpose}>
                          {request.transferPurpose}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(request.requestedStartDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {request.approvedAt ? formatDate(request.approvedAt) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Link href={`/approver/requests/${request.id}`}>
                            <Button variant="outline" size="sm" className="flex items-center space-x-1">
                              <Eye className="w-3 h-3" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}