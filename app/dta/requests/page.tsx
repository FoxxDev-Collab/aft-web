'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Search, 
  Calendar,
  User,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Database
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

interface User {
  id: number;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function DTARequestsPage() {
  const [requests, setRequests] = useState<AFTRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<AFTRequest[]>([]);
  const [, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classificationFilter, setClassificationFilter] = useState('all');
  const [transferTypeFilter, setTransferTypeFilter] = useState('all');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      const [requestsResponse, userResponse] = await Promise.all([
        fetch('/api/aft-requests'),
        fetch('/api/auth/me')
      ]);
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }
      
      if (requestsResponse.ok) {
        const data = await requestsResponse.json();
        const allRequests = data.requests || [];
        
        // Filter for DTA-relevant requests
        const dtaRequests = allRequests.filter((r: AFTRequest) => 
          ['pending_dta', 'pending_sme', 'pending_media_custodian', 'completed', 'disposed'].includes(r.status)
        );
        
        setRequests(dtaRequests);
        setFilteredRequests(dtaRequests);
      } else {
        toast.error('Failed to fetch requests');
      }
    } catch (error) {
      toast.error('Error loading requests');
      console.error('Fetch requests error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Filter requests based on search and filters
  useEffect(() => {
    let filtered = requests;

    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requestorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requestorOrg.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.transferPurpose.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    if (classificationFilter !== 'all') {
      filtered = filtered.filter(request => request.classification.toLowerCase() === classificationFilter);
    }

    if (transferTypeFilter !== 'all') {
      filtered = filtered.filter(request => request.transferType === transferTypeFilter);
    }

    setFilteredRequests(filtered);
  }, [requests, searchTerm, statusFilter, classificationFilter, transferTypeFilter]);

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

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending_dta': return <Clock className="w-4 h-4" />;
      case 'pending_sme': return <User className="w-4 h-4" />;
      case 'pending_media_custodian': return <AlertCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'disposed': return <Database className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
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

  const getPriorityLevel = (classification: string, createdDate: string) => {
    const daysSinceCreated = Math.floor((Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24));
    
    if (['secret', 'top-secret'].includes(classification.toLowerCase())) {
      if (daysSinceCreated >= 3) return 'high';
      if (daysSinceCreated >= 2) return 'medium';
    } else if (classification.toLowerCase() === 'confidential') {
      if (daysSinceCreated >= 7) return 'high';
      if (daysSinceCreated >= 5) return 'medium';
    } else {
      if (daysSinceCreated >= 10) return 'high';
      if (daysSinceCreated >= 7) return 'medium';
    }
    
    return 'normal';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">Loading transfer requests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transfer Requests</h1>
          <p className="text-muted-foreground">Manage AFT requests in the DTA workflow</p>
        </div>
        <Button variant="outline" onClick={fetchRequests} className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters & Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by request number, requestor, or purpose..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_dta">Pending DTA</SelectItem>
                  <SelectItem value="pending_sme">Pending SME</SelectItem>
                  <SelectItem value="pending_media_custodian">Pending Media Custodian</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="classification-filter">Classification</Label>
              <Select value={classificationFilter} onValueChange={setClassificationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All classifications" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classifications</SelectItem>
                  <SelectItem value="unclassified">Unclassified</SelectItem>
                  <SelectItem value="cui">CUI</SelectItem>
                  <SelectItem value="confidential">Confidential</SelectItem>
                  <SelectItem value="secret">Secret</SelectItem>
                  <SelectItem value="top-secret">Top Secret</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="transfer-type-filter">Transfer Type</Label>
              <Select value={transferTypeFilter} onValueChange={setTransferTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="high-to-low">High to Low</SelectItem>
                  <SelectItem value="low-to-high">Low to High</SelectItem>
                  <SelectItem value="same-level">Same Level</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredRequests.length} of {requests.length} requests
        </p>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>High Priority</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>Medium Priority</span>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No requests found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || classificationFilter !== 'all' || transferTypeFilter !== 'all'
                  ? 'Try adjusting your search criteria or filters.'
                  : 'No transfer requests are currently available for DTA processing.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => {
            const priority = getPriorityLevel(request.classification, request.createdAt);
            return (
              <Card key={request.id} className={`
                ${priority === 'high' ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20' : ''}
                ${priority === 'medium' ? 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20' : ''}
              `}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Link 
                          href={`/dta/requests/${request.id}`}
                          className="font-mono text-lg font-semibold text-primary hover:text-primary/80 hover:underline"
                        >
                          {request.requestNumber}
                        </Link>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(request.status)}
                          <Badge className={getStatusColor(request.status)}>
                            {getStatusText(request.status)}
                          </Badge>
                        </div>
                        <Badge className={getClassificationColor(request.classification)} variant="outline">
                          {request.classification.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {request.transferType.replace('-', ' to ')}
                        </Badge>
                        {priority !== 'normal' && (
                          <Badge variant="outline" className={
                            priority === 'high' ? 'border-red-500 text-red-700' : 'border-yellow-500 text-yellow-700'
                          }>
                            {priority.toUpperCase()} PRIORITY
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-foreground font-medium mb-3" title={request.transferPurpose}>
                        {request.transferPurpose}
                      </p>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span>{request.requestorName} ({request.requestorOrg})</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>Requested: {formatDate(request.requestedStartDate)}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-start space-x-2">
                            <Database className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                              <div>{request.sourceSystem} → {request.destSystem}</div>
                              {request.dataSize && (
                                <div className="text-xs">Size: {request.dataSize}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <Link href={`/dta/requests/${request.id}`}>
                        <Button size="sm" className={
                          request.status === 'pending_dta' 
                            ? "bg-blue-600 hover:bg-blue-700" 
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        }>
                          {request.status === 'pending_dta' ? 'Review for Processing' : 'View Details'}
                        </Button>
                      </Link>
                      <div className="text-xs text-muted-foreground text-right">
                        <div>Submitted</div>
                        <div>{formatDate(request.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}