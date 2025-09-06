'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  UserCheck, 
  Shield, 
  Users, 
  Server, 
  CheckCircle, 
  Clock,
  FileCheck,
  Trash2,
  AlertCircle,
  User
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'skipped';
  assignee?: string;
  completedAt?: string;
  notes?: string;
}

interface WorkflowProgressProps {
  currentStatus: string;
  approvalData?: string;
  transferData?: string;
  requestorName?: string;
  dtaName?: string;
  smeName?: string;
  mediaCustodianName?: string;
  createdAt?: string;
  approvalDate?: string;
  actualEndDate?: string;
  className?: string;
}

export function WorkflowProgress({
  currentStatus,
  approvalData,
  transferData,
  requestorName,
  dtaName,
  smeName,
  mediaCustodianName,
  createdAt,
  approvalDate,
  actualEndDate,
  className = ''
}: WorkflowProgressProps) {

  // Parse approval data to get individual approver signatures
  let approvals: Record<string, { signature?: string; date?: string }> = {};
  try {
    if (approvalData) {
      approvals = JSON.parse(approvalData);
    }
  } catch (error) {
    console.warn('Failed to parse approval data:', error);
  }

  // Parse transfer data for additional info
  let transferInfo: Record<string, unknown> = {};
  try {
    if (transferData) {
      transferInfo = JSON.parse(transferData);
    }
  } catch (error) {
    console.warn('Failed to parse transfer data:', error);
  }

  const getStepStatus = (stepId: string): WorkflowStep['status'] => {
    const statusOrder = [
      'draft', 'submitted', 'pending_dao', 'pending_approver', 'pending_cpso', 
      'approved', 'pending_dta', 'pending_sme', 'pending_media_custodian', 
      'completed', 'disposed'
    ];

    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepId);

    if (currentStatus === 'rejected') {
      // If rejected, show which step it was rejected at
      if (stepId === 'submitted') return 'completed';
      if (stepId === 'pending_dao' && currentIndex >= 2) return 'rejected';
      if (stepId === 'pending_approver' && currentIndex >= 3) return 'rejected';
      if (stepId === 'pending_cpso' && currentIndex >= 4) return 'rejected';
      return 'pending';
    }

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'in_progress';
    return 'pending';
  };

  const steps: WorkflowStep[] = [
    {
      id: 'submitted',
      title: 'Request Submitted',
      description: 'AFT request created and submitted for review',
      icon: FileText,
      status: getStepStatus('submitted'),
      assignee: requestorName,
      completedAt: createdAt,
    },
    {
      id: 'pending_dao',
      title: 'DAO Review',
      description: 'Designated Authorizing Official review',
      icon: UserCheck,
      status: getStepStatus('pending_dao'),
      assignee: approvals.dao?.signature || 'Pending assignment',
      completedAt: approvals.dao?.date,
      notes: approvals.dao ? 'Approved by DAO' : undefined,
    },
    {
      id: 'pending_approver',
      title: 'ISSM/ISSO Review',
      description: 'Information System Security Manager review',
      icon: Shield,
      status: getStepStatus('pending_approver'),
      assignee: approvals.issm?.signature || approvals.approver?.signature || 'Pending assignment',
      completedAt: approvals.issm?.date || approvals.approver?.date,
      notes: approvals.issm || approvals.approver ? 'Security review completed' : undefined,
    },
    {
      id: 'pending_cpso',
      title: 'CPSO Review',
      description: 'Cyber Physical Security Officer review',
      icon: Users,
      status: getStepStatus('pending_cpso'),
      assignee: approvals.cpso?.signature || 'Pending assignment',
      completedAt: approvals.cpso?.date,
      notes: approvals.cpso ? 'Final approval granted' : undefined,
    },
    {
      id: 'approved',
      title: 'All Approvals Complete',
      description: 'Request approved and ready for transfer',
      icon: CheckCircle,
      status: getStepStatus('approved'),
      completedAt: approvalDate,
      notes: 'Ready for DTA processing',
    },
    {
      id: 'pending_dta',
      title: 'DTA Processing',
      description: 'Data Transfer Agent conducting virus scan and transfer',
      icon: Server,
      status: getStepStatus('pending_dta'),
      assignee: dtaName || 'Awaiting DTA assignment',
      completedAt: transferInfo.dtaCompletedAt as string,
      notes: transferInfo.virusScanResults ? 'Virus scan completed' : undefined,
    },
    {
      id: 'pending_sme',
      title: 'SME Signature',
      description: 'Subject Matter Expert verification and sign-off',
      icon: User,
      status: getStepStatus('pending_sme'),
      assignee: smeName || 'Awaiting SME assignment',
      completedAt: transferInfo.smeSignedAt as string,
      notes: transferInfo.smeNotes as string,
    },
    {
      id: 'pending_media_custodian',
      title: 'Media Disposition',
      description: 'Media custodian handles final disposition',
      icon: Trash2,
      status: getStepStatus('pending_media_custodian'),
      assignee: mediaCustodianName || 'Awaiting custodian assignment',
      completedAt: transferInfo.disposedAt as string,
      notes: transferInfo.dispositionMethod as string,
    },
    {
      id: 'completed',
      title: 'Transfer Complete',
      description: 'AFT process successfully completed',
      icon: FileCheck,
      status: getStepStatus('completed'),
      completedAt: actualEndDate,
      notes: 'Process completed successfully',
    }
  ];

  const getStatusIcon = (status: WorkflowStep['status'], Icon: React.ComponentType<{ className?: string }>) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'rejected':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Icon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">In Progress</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Rejected</Badge>;
      case 'skipped':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">Skipped</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-500">Pending</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">AFT Process Progress</h3>
        <p className="text-sm text-muted-foreground">
          Track the complete Authorized File Transfer workflow from submission to completion
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isPending = step.status === 'pending';
          const isCompleted = step.status === 'completed';
          
          return (
            <Card 
              key={step.id} 
              className={`
                transition-all duration-200 
                ${step.status === 'in_progress' ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
                ${step.status === 'completed' ? 'bg-green-50 dark:bg-green-950' : ''}
                ${step.status === 'rejected' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' : ''}
                ${isPending ? 'bg-gray-50 dark:bg-gray-900' : ''}
              `}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(step.status, Icon)}
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {isPending && !isCompleted ? (
                          <Skeleton className="h-4 w-24" />
                        ) : (
                          step.title
                        )}
                      </CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">Step {index + 1}</span>
                        {getStatusBadge(step.status)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {isPending && !isCompleted ? (
                      <Skeleton className="h-3 w-full" />
                    ) : (
                      step.description
                    )}
                  </div>
                  
                  {step.assignee && (
                    <div className="text-xs">
                      <span className="font-medium text-muted-foreground">Assignee: </span>
                      {isPending && !isCompleted ? (
                        <Skeleton className="inline-block h-3 w-20 ml-1" />
                      ) : (
                        <span className="text-foreground">{step.assignee}</span>
                      )}
                    </div>
                  )}
                  
                  {step.completedAt && isCompleted && (
                    <div className="text-xs">
                      <span className="font-medium text-muted-foreground">Completed: </span>
                      <span className="text-green-600">{formatDate(step.completedAt)}</span>
                    </div>
                  )}
                  
                  {step.notes && isCompleted && (
                    <div className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                      <span className="font-medium text-muted-foreground">Notes: </span>
                      <span className="text-foreground">{step.notes}</span>
                    </div>
                  )}

                  {isPending && !isCompleted && (
                    <div className="mt-2 space-y-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Overall Progress</span>
          <span className="text-sm text-muted-foreground">
            {steps.filter(s => s.status === 'completed').length} of {steps.length} steps completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-800">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
}