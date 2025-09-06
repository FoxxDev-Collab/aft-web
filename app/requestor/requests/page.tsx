'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RequestsHistoryTable } from '@/components/requests-history-table';
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
  Plus, 
  FileText, 
  Search, 
  Filter, 
  Calendar,
  Eye,
  RefreshCw,
  Edit,
  AlertTriangle,
  Send,
  List,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

interface AFTRequest {
  id: number;
  requestNumber: string;
  status: string;
  transferType: string;
  classification: string;
  requestorId: number;
  requestorName: string;
  requestorOrg: string;
  transferPurpose: string;
  requestedStartDate: string;
  rejectionReason?: string;
  approvalData?: string;
  transferData?: string;
  approvalDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

export default function RequestorRequestsPage() {
  const [requests, setRequests] = useState<AFTRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<AFTRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitRequestId, setSubmitRequestId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signature, setSignature] = useState('');
  const [acknowledgeTerms, setAcknowledgeTerms] = useState(false);
  const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/aft-requests?scope=my-requests');
      
      if (response.ok) {
        const data = await response.json();
        // Filter to only show user's own requests
        setRequests(data.requests || []);
        setFilteredRequests(data.requests || []);
      } else {
        toast.error('Failed to fetch requests');
      }
    } catch (error) {
      toast.error('Error fetching requests');
      console.error('Fetch requests error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Filter requests based on search term and status
  useEffect(() => {
    let filtered = requests;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(request => 
        request.requestNumber.toLowerCase().includes(searchLower) ||
        request.transferPurpose.toLowerCase().includes(searchLower)
      );
    }

    setFilteredRequests(filtered);
  }, [requests, searchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending_dao': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'pending_approver': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'pending_cpso': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700';
      case 'pending_dta': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'pending_sme': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'pending_media_custodian': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'disposed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification.toLowerCase()) {
      case 'unclassified': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cui': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'confidential': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'secret': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'top-secret': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
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
      case 'draft': return 'Draft';
      case 'submitted': return 'Awaiting Approval';
      case 'pending_dao': return 'Pending DAO';
      case 'pending_approver': return 'Pending Approver';
      case 'pending_cpso': return 'Pending CPSO';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'pending_dta': return 'With DTA';
      case 'pending_sme': return 'With SME';
      case 'pending_media_custodian': return 'Media Custodian';
      case 'completed': return 'Completed';
      case 'disposed': return 'Disposed';
      case 'cancelled': return 'Cancelled';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Simplified permission checks - only for requestor actions
  const canReturnForEdit = (status: string) => {
    return ['submitted', 'pending_dao', 'pending_approver', 'pending_cpso'].includes(status);
  };

  const canEditRejected = (status: string) => {
    return status === 'rejected';
  };

  const handleReturnRequest = async (requestId: number) => {
    try {
      const response = await fetch(`/api/aft-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' })
      });
      
      if (response.ok) {
        toast.success('Request returned for editing');
        fetchRequests();
      } else {
        toast.error('Failed to return request');
      }
    } catch {
      toast.error('Error returning request');
    }
  };

  const handleSubmitRequest = (requestId: number) => {
    setSubmitRequestId(requestId);
    setShowSubmitDialog(true);
    setSignature('');
    setAcknowledgeTerms(false);
  };

  const submitRequest = async () => {
    if (!submitRequestId || !signature.trim() || !acknowledgeTerms) {
      toast.error('Please fill in all required fields and acknowledge the terms');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/aft-requests/${submitRequestId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          signature: signature.trim(),
          acknowledgeTerms 
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(`Request submitted successfully! Requires ${result.requiresApproval} approval.`);
        setShowSubmitDialog(false);
        fetchRequests();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to submit request');
      }
    } catch {
      toast.error('Error submitting request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading your requests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My AFT Requests</h1>
          <p className="text-muted-foreground mt-1">View and manage your Assured File Transfer requests</p>
        </div>
        <Link href="/requestor/request/new">
          <Button className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>New Request</span>
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search by request number or purpose..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Pending Review</SelectItem>
                  <SelectItem value="pending_dao">Pending DAO</SelectItem>
                  <SelectItem value="pending_approver">Pending Approver</SelectItem>
                  <SelectItem value="pending_cpso">Pending CPSO</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="pending_dta">With DTA</SelectItem>
                  <SelectItem value="pending_sme">With SME</SelectItem>
                  <SelectItem value="pending_media_custodian">Media Custodian</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'simple' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('simple')}
                className="rounded-r-none"
              >
                <List className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Simple</span>
              </Button>
              <Button
                variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('detailed')}
                className="rounded-l-none"
              >
                <BarChart3 className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Workflow</span>
              </Button>
            </div>
            
            <Button variant="outline" onClick={fetchRequests} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requests Display */}
      {viewMode === 'detailed' ? (
        <RequestsHistoryTable
          requests={filteredRequests}
          userRole="requestor"
          loading={false}
          emptyMessage={filteredRequests.length === 0 && requests.length > 0 
            ? 'No requests match your current filters' 
            : 'No requests found. Create your first AFT request to get started.'}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>My Requests ({filteredRequests.length})</span>
            </CardTitle>
            <CardDescription>
              {filteredRequests.length === 0 && requests.length > 0
                ? 'No requests match your current filters'
                : 'Your submitted AFT requests and their current status'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {requests.length === 0 ? 'No requests yet' : 'No matching requests'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {requests.length === 0 
                  ? "You haven't submitted any AFT requests yet."
                  : 'Try adjusting your search or filters.'
                }
              </p>
              {requests.length === 0 && (
                <Link href="/requestor/request/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Request
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-sm">
                        <Link 
                          href={`/requestor/requests/${request.id}`}
                          className="text-primary hover:text-primary/80 hover:underline"
                        >
                          {request.requestNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(request.status)}>
                            {getStatusText(request.status)}
                          </Badge>
                          {request.status === 'rejected' && (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.transferType?.toUpperCase().replace('-TO-', ' → ') || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getClassificationColor(request.classification)} variant="outline">
                          {request.classification.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={request.transferPurpose}>
                        {request.transferPurpose}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(request.requestedStartDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(request.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Link href={`/requestor/requests/${request.id}`}>
                            <Button variant="outline" size="sm" className="flex items-center space-x-1">
                              <Eye className="w-3 h-3" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </Link>
                          {request.status === 'draft' && (
                            <Button 
                              size="sm" 
                              className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleSubmitRequest(request.id)}
                            >
                              <Send className="w-3 h-3" />
                              <span className="hidden sm:inline">Submit</span>
                            </Button>
                          )}
                          {request.status === 'draft' && (
                            <Link href={`/requestor/request/edit/${request.id}`}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center space-x-1"
                              >
                                <Edit className="w-3 h-3" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            </Link>
                          )}
                          {canReturnForEdit(request.status) && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center space-x-1"
                              onClick={() => handleReturnRequest(request.id)}
                            >
                              <Edit className="w-3 h-3" />
                              <span className="hidden sm:inline">Return to Edit</span>
                            </Button>
                          )}
                          {canEditRejected(request.status) && (
                            <Link href={`/requestor/request/edit/${request.id}`}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center space-x-1 border-red-300 text-red-700 hover:bg-red-50"
                              >
                                <Edit className="w-3 h-3" />
                                <span className="hidden sm:inline">Fix & Resubmit</span>
                              </Button>
                            </Link>
                          )}
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
      )}

      {/* Submit Request Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Send className="w-5 h-5" />
              <span>Submit Request for Approval</span>
            </DialogTitle>
            <DialogDescription>
              By submitting this request, it will enter the approval process and cannot be edited until returned or rejected.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="signature">Digital Signature *</Label>
              <Input
                id="signature"
                placeholder="Type your full name as digital signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Your typed name will serve as your digital signature for this request.
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                checked={acknowledgeTerms}
                onCheckedChange={(checked) => setAcknowledgeTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm">
                I acknowledge that I have reviewed all information in this request and certify that it is accurate and complete. *
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubmitDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={submitRequest}
              disabled={submitting || !signature.trim() || !acknowledgeTerms}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}