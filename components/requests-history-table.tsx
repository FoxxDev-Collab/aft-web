'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

export interface HistoricalRequest {
  id: number;
  requestNumber: string;
  status: string;
  requestorName: string;
  transferType: string;
  classification: string;
  createdAt: string;
  approvalData?: string;
  transferData?: string;
  approvalDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  rejectionReason?: string;
}

interface RequestsHistoryTableProps {
  requests: HistoricalRequest[];
  userRole: string;
  loading?: boolean;
  emptyMessage?: string;
}

export function RequestsHistoryTable({
  requests,
  userRole,
  loading = false,
  emptyMessage = "No requests found"
}: RequestsHistoryTableProps) {

  const getStepStatus = (request: HistoricalRequest, step: string): 'completed' | 'in_progress' | 'rejected' | 'pending' => {
    const statusOrder = [
      'draft', 'submitted', 'pending_dao', 'pending_approver', 'pending_cpso', 
      'approved', 'pending_dta', 'pending_sme', 'pending_media_custodian', 
      'completed', 'disposed'
    ];

    const currentIndex = statusOrder.indexOf(request.status);
    const stepIndex = statusOrder.indexOf(step);

    if (request.status === 'rejected') {
      if (step === 'submitted') return 'completed';
      if (currentIndex >= 2 && step === 'pending_dao') return 'rejected';
      if (currentIndex >= 3 && step === 'pending_approver') return 'rejected';
      if (currentIndex >= 4 && step === 'pending_cpso') return 'rejected';
      return 'pending';
    }

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'in_progress';
    return 'pending';
  };

  const getStepIcon = (status: 'completed' | 'in_progress' | 'rejected' | 'pending') => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification?.toLowerCase()) {
      case 'unclassified':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cui':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'confidential':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'secret':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'top-secret':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getOverallStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'disposed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending_dta':
      case 'pending_sme':
      case 'pending_media_custodian':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    });
  };

  const getViewLink = (requestId: number) => {
    switch (userRole.toLowerCase()) {
      case 'requestor':
        return `/requestor/requests/${requestId}`;
      case 'dao':
      case 'approver':
      case 'issm':
      case 'cpso':
        return `/approver/requests/${requestId}`;
      case 'dta':
        return `/dta/requests/${requestId}`;
      case 'sme':
        return `/sme/requests/${requestId}`;
      case 'media_custodian':
      case 'custodian':
        return `/custodian/disposition/${requestId}`;
      default:
        return `/requests/${requestId}`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Request History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-muted-foreground">Loading requests...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Request History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>Request History</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Track the complete AFT workflow progress for all requests
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Request #</TableHead>
                <TableHead className="w-[120px]">Requestor</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead className="w-[90px]">Classification</TableHead>
                <TableHead className="w-[60px] text-center">Submit</TableHead>
                <TableHead className="w-[60px] text-center">DAO</TableHead>
                <TableHead className="w-[60px] text-center">ISSM</TableHead>
                <TableHead className="w-[60px] text-center">CPSO</TableHead>
                <TableHead className="w-[60px] text-center">DTA</TableHead>
                <TableHead className="w-[60px] text-center">SME</TableHead>
                <TableHead className="w-[60px] text-center">Custodian</TableHead>
                <TableHead className="w-[80px] text-center">Complete</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[80px]">Created</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">
                    {request.requestNumber}
                  </TableCell>
                  <TableCell className="font-medium">
                    {request.requestorName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {request.transferType?.toUpperCase().replace('-TO-', ' → ') || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getClassificationColor(request.classification)} variant="outline">
                      {request.classification?.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                  </TableCell>

                  {/* Step Status Icons */}
                  <TableCell className="text-center">
                    {getStepIcon(getStepStatus(request, 'submitted'))}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStepIcon(getStepStatus(request, 'pending_dao'))}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStepIcon(getStepStatus(request, 'pending_approver'))}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStepIcon(getStepStatus(request, 'pending_cpso'))}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStepIcon(getStepStatus(request, 'pending_dta'))}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStepIcon(getStepStatus(request, 'pending_sme'))}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStepIcon(getStepStatus(request, 'pending_media_custodian'))}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStepIcon(getStepStatus(request, 'completed'))}
                  </TableCell>

                  <TableCell>
                    <Badge className={getOverallStatusColor(request.status)}>
                      {request.status === 'pending_dao' ? 'Pending DAO' :
                       request.status === 'pending_approver' ? 'Pending ISSM' :
                       request.status === 'pending_cpso' ? 'Pending CPSO' :
                       request.status === 'pending_dta' ? 'With DTA' :
                       request.status === 'pending_sme' ? 'With SME' :
                       request.status === 'pending_media_custodian' ? 'Custodian' :
                       request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(request.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Link href={getViewLink(request.id)}>
                      <Button variant="outline" size="sm" className="flex items-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span className="text-xs">View</span>
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h4 className="text-sm font-medium mb-3">Step Status Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span>Rejected</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
              <span>Pending</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}