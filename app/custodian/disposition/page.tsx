'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Archive,
  RefreshCw,
  Search,
  User,
  Calendar,
  Database,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Filter
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

export default function CustodianDispositionPage() {
  const [requests, setRequests] = useState<AFTRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchRequests = async () => {
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
        
        setRequests(pending);
      } else {
        toast.error('Failed to fetch disposition requests');
      }
    } catch (error) {
      toast.error('Error loading disposition requests');
      console.error('Fetch requests error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = requests.filter((request) => {
    const matchesSearch = !searchTerm || 
      request.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requestorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.transferPurpose.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'overdue' && isOverdue(request)) ||
      (statusFilter === 'normal' && !isOverdue(request));
    
    return matchesSearch && matchesStatus;
  });

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (request: AFTRequest) => {
    const days = Math.floor((Date.now() - new Date(request.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    return days > 3;
  };

  const getDaysOld = (request: AFTRequest) => {
    return Math.floor((Date.now() - new Date(request.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
  };

  const overdueCount = requests.filter(isOverdue).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">Loading disposition requests...</span>
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
            <span>Media Disposition</span>
          </h1>
          <p className="text-muted-foreground">Process final media disposition for completed transfers</p>
        </div>
        <Button variant="outline" onClick={fetchRequests} className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <Archive className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-foreground">
                {requests.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Pending</div>
            </div>
          </CardContent>
        </Card>

        <Card className={overdueCount > 0 ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20" : ""}>
          <CardContent className="flex items-center p-6">
            <div className="flex-shrink-0">
              <AlertCircle className={`w-8 h-8 ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <div className="ml-4">
              <div className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-foreground'}`}>
                {overdueCount}
              </div>
              <div className="text-sm text-muted-foreground">Overdue (3+ days)</div>
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
                {requests.filter(r => !isOverdue(r)).length}
              </div>
              <div className="text-sm text-muted-foreground">On Time</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by request number, requestor, or purpose..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-3 py-2 bg-background text-foreground"
              >
                <option value="all">All Status</option>
                <option value="overdue">Overdue</option>
                <option value="normal">On Time</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Disposition Requests</CardTitle>
          <CardDescription>
            {filteredRequests.length} of {requests.length} requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Pending Dispositions</h3>
              <p className="text-muted-foreground">
                {requests.length === 0 
                  ? "There are currently no transfers awaiting media disposition."
                  : "No requests match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div 
                  key={request.id} 
                  className={`border rounded-lg p-4 hover:bg-accent/50 transition-colors ${
                    isOverdue(request) ? 'border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-900/10' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <Link 
                          href={`/custodian/disposition/${request.id}`}
                          className="font-mono text-lg font-semibold text-primary hover:underline"
                        >
                          {request.requestNumber}
                        </Link>
                        <Badge className={getClassificationColor(request.classification)} variant="outline">
                          {request.classification.toUpperCase()}
                        </Badge>
                        {isOverdue(request) && (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            OVERDUE ({getDaysOld(request)} days)
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-muted-foreground mb-3 line-clamp-2">{request.transferPurpose}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span><span className="font-medium">Requestor:</span> {request.requestorName}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Database className="w-4 h-4 text-muted-foreground" />
                          <span><span className="font-medium">Transfer:</span> {request.transferType.replace('-', ' to ')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span><span className="font-medium">Updated:</span> {formatDate(request.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 flex-shrink-0">
                      <Link href={`/custodian/disposition/${request.id}`}>
                        <Button size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          Process
                        </Button>
                      </Link>
                    </div>
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