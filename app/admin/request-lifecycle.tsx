'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineHeader,
  TimelineTitle,
  TimelineIcon,
  TimelineDescription,
  TimelineContent,
} from '@/components/ui/timeline';
import {
  Search,
  FileText,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Upload,
  Download,
  Activity,
  Eye,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface RequestLifecycleEntry {
  id: number;
  requestId: number;
  requestNumber: string;
  action: string;
  oldStatus?: string;
  newStatus?: string;
  userId: number;
  userName: string;
  userRole: string;
  timestamp: string;
  notes?: string;
  duration?: number; // Time spent in previous status
  files?: Array<{
    id: number;
    fileName: string;
    fileSize: number;
    action: 'uploaded' | 'downloaded' | 'deleted';
  }>;
}

interface RequestSummary {
  id: number;
  requestNumber: string;
  status: string;
  transferType: string;
  classification: string;
  createdAt: string;
  createdBy: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  assignedUsers: Array<{
    role: string;
    userId?: number;
    userName?: string;
  }>;
  timeline: RequestLifecycleEntry[];
  totalDuration: number; // Total time from creation to current status
  averageStageTime: number;
}

export function RequestLifecycle() {
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchRequestLifecycle = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const response = await fetch(`/api/admin/request-lifecycle?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching request lifecycle:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    fetchRequestLifecycle();
  }, [fetchRequestLifecycle]);

  const getStatusIcon = (status: string, action?: string) => {
    if (action === 'created') return <FileText className="w-4 h-4 text-blue-600" />;
    if (action === 'approved') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (action === 'rejected') return <XCircle className="w-4 h-4 text-red-600" />;
    if (action === 'submitted') return <Upload className="w-4 h-4 text-blue-600" />;
    if (action === 'assigned') return <Users className="w-4 h-4 text-purple-600" />;
    if (action?.includes('file')) return <Download className="w-4 h-4 text-teal-600" />;

    switch (status?.toLowerCase()) {
      case 'draft': return <FileText className="w-4 h-4 text-gray-600" />;
      case 'submitted': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'pending_dao': case 'pending_approver': case 'pending_cpso': 
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'active_transfer': return <Activity className="w-4 h-4 text-blue-600" />;
      case 'completed': case 'disposed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'submitted': case 'pending_dao': case 'pending_approver': case 'pending_cpso': 
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'approved': case 'active_transfer': case 'pending_dta': case 'pending_sme': 
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed': case 'disposed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionDescription = (entry: RequestLifecycleEntry) => {
    if (entry.oldStatus && entry.newStatus) {
      return `Changed status from ${entry.oldStatus.replace('_', ' ')} to ${entry.newStatus.replace('_', ' ')}`;
    }
    
    switch (entry.action.toLowerCase()) {
      case 'created': return 'Created new AFT request';
      case 'updated': return 'Updated request details';
      case 'submitted': return 'Submitted request for review';
      case 'approved': return 'Approved request';
      case 'rejected': return 'Rejected request';
      case 'assigned': return 'Assigned to user';
      case 'file_uploaded': return 'Uploaded file attachment';
      case 'file_downloaded': return 'Downloaded file attachment';
      default: return entry.action.replace('_', ' ').charAt(0).toUpperCase() + entry.action.slice(1);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = !searchTerm || 
      request.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.createdBy.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesType = typeFilter === 'all' || request.transferType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Request Lifecycle Tracking</h2>
          <p className="text-muted-foreground">Detailed journey of each AFT request through the system</p>
        </div>
        <Button onClick={fetchRequestLifecycle} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Request Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Request number or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="pending_dao">Pending DAO</SelectItem>
                  <SelectItem value="pending_approver">Pending Approver</SelectItem>
                  <SelectItem value="pending_cpso">Pending CPSO</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Transfer Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="upload">Upload</SelectItem>
                  <SelectItem value="download">Download</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Results</label>
              <div className="text-sm text-muted-foreground pt-2">
                {filteredRequests.length} of {requests.length} requests
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredRequests.map((request) => (
                <div 
                  key={request.id}
                  className={`p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedRequest?.id === request.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedRequest(request)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-mono text-sm font-medium text-primary">
                        {request.requestNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        by {request.createdBy.name}
                      </div>
                    </div>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        {request.transferType.toUpperCase()}
                      </span>
                      <span className="text-muted-foreground">
                        {request.classification}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDuration(request.totalDuration)}
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-muted-foreground">
                    {request.timeline.length} lifecycle events
                  </div>
                </div>
              ))}
              
              {filteredRequests.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No requests found matching your criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Request Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Request Timeline</span>
              {selectedRequest && (
                <Link href={`/admin/requests/${selectedRequest.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </Link>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedRequest ? (
              <div className="space-y-4">
                {/* Request Summary */}
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-mono font-medium text-primary">
                        {selectedRequest.requestNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Created by {selectedRequest.createdBy.name}
                      </div>
                    </div>
                    <Badge className={getStatusColor(selectedRequest.status)}>
                      {selectedRequest.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Type:</span> {selectedRequest.transferType.toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium">Classification:</span> {selectedRequest.classification}
                    </div>
                    <div>
                      <span className="font-medium">Total Duration:</span> {formatDuration(selectedRequest.totalDuration)}
                    </div>
                    <div>
                      <span className="font-medium">Avg Stage Time:</span> {formatDuration(selectedRequest.averageStageTime)}
                    </div>
                  </div>
                  
                  {/* Assigned Users */}
                  {selectedRequest.assignedUsers.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-medium mb-2">Assigned Users:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedRequest.assignedUsers.map((assignment, idx) => (
                          <Badge key={idx} variant="outline">
                            {assignment.role.toUpperCase()}: {assignment.userName || 'Unassigned'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div className="max-h-96 overflow-y-auto">
                  <Timeline>
                    {selectedRequest.timeline.map((entry, index) => (
                      <TimelineItem key={entry.id}>
                        <TimelineIcon>
                          {getStatusIcon(entry.newStatus || entry.oldStatus || '', entry.action)}
                        </TimelineIcon>
                        <TimelineContent>
                          <TimelineHeader>
                            <TimelineTitle className="text-sm">
                              {getActionDescription(entry)}
                            </TimelineTitle>
                            <div className="text-xs text-muted-foreground">
                              {formatTimestamp(entry.timestamp)}
                              {entry.duration && (
                                <span className="ml-2">
                                  (after {formatDuration(entry.duration)})
                                </span>
                              )}
                            </div>
                          </TimelineHeader>
                          <TimelineDescription>
                            <div className="flex items-center gap-2 text-xs">
                              <User className="w-3 h-3" />
                              <span>{entry.userName} ({entry.userRole})</span>
                            </div>
                            {entry.notes && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {entry.notes}
                              </div>
                            )}
                            {entry.files && entry.files.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {entry.files.map((file, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <FileText className="w-3 h-3" />
                                    <span>{file.fileName} ({(file.fileSize / 1024).toFixed(1)} KB)</span>
                                    <Badge variant="outline" className="text-xs">
                                      {file.action}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TimelineDescription>
                        </TimelineContent>
                        {index < selectedRequest.timeline.length - 1 && <TimelineConnector />}
                      </TimelineItem>
                    ))}
                  </Timeline>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a Request</h3>
                <p className="text-muted-foreground">
                  Choose a request from the list to view its complete lifecycle timeline.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}