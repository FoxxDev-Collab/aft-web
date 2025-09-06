'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  Search,
  Activity,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download
} from 'lucide-react';
// import { DatePickerWithRange } from '@/components/ui/date-range-picker';
// import { DateRange } from 'react-day-picker';

interface AuditLogEntry {
  id: number;
  action: string;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  requestId?: number;
  requestNumber?: string;
  oldStatus?: string;
  newStatus?: string;
  changes?: string;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

interface AuditFilters {
  search: string;
  action: string;
  userId: string;
  requestId: string;
  // dateRange?: DateRange;
}

export function AuditTrail() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Array<{id: number, name: string}>>([]);
  const [actions, setActions] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<AuditFilters>({
    search: '',
    action: 'all',
    userId: 'all',
    requestId: ''
  });

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.action !== 'all') params.append('action', filters.action);
      if (filters.userId !== 'all') params.append('userId', filters.userId);
      if (filters.requestId) params.append('requestId', filters.requestId);
      // if (filters.dateRange?.from) params.append('startDate', filters.dateRange.from.toISOString());
      // if (filters.dateRange?.to) params.append('endDate', filters.dateRange.to.toISOString());

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
        setUsers(data.users || []);
        setActions(data.actions || []);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  useEffect(() => {
    // Apply client-side filtering
    let filtered = auditLogs;

    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(log =>
        log.userName.toLowerCase().includes(searchTerm) ||
        log.userEmail.toLowerCase().includes(searchTerm) ||
        (log.requestNumber && log.requestNumber.toLowerCase().includes(searchTerm)) ||
        log.action.toLowerCase().includes(searchTerm) ||
        (log.notes && log.notes.toLowerCase().includes(searchTerm))
      );
    }

    setFilteredLogs(filtered);
  }, [auditLogs, filters.search]);

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created': return <FileText className="w-4 h-4 text-blue-600" />;
      case 'updated': return <Activity className="w-4 h-4 text-orange-600" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'submitted': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'assigned': return <Users className="w-4 h-4 text-purple-600" />;
      case 'login': return <Users className="w-4 h-4 text-green-600" />;
      case 'logout': return <Users className="w-4 h-4 text-gray-600" />;
      case 'file_uploaded': return <FileText className="w-4 h-4 text-indigo-600" />;
      case 'file_downloaded': return <Download className="w-4 h-4 text-teal-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'updated': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'assigned': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'login': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'logout': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'file_uploaded': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'file_downloaded': return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'text-gray-600';
      case 'submitted': case 'pending_dao': case 'pending_approver': case 'pending_cpso': 
        return 'text-yellow-600';
      case 'approved': case 'active_transfer': case 'pending_dta': case 'pending_sme': 
        return 'text-blue-600';
      case 'completed': case 'disposed': return 'text-green-600';
      case 'rejected': case 'cancelled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const exportAuditLog = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.action !== 'all') params.append('action', filters.action);
      if (filters.userId !== 'all') params.append('userId', filters.userId);
      if (filters.requestId) params.append('requestId', filters.requestId);
      // if (filters.dateRange?.from) params.append('startDate', filters.dateRange.from.toISOString());
      // if (filters.dateRange?.to) params.append('endDate', filters.dateRange.to.toISOString());
      params.append('export', 'true');

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting audit log:', error);
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Audit Trail</h2>
          <p className="text-muted-foreground">Complete system activity and change log</p>
        </div>
        <Button onClick={exportAuditLog} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Advanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Audit Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users, requests, actions..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select 
                value={filters.action} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map(action => (
                    <SelectItem key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1).replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Select 
                value={filters.userId} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, userId: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Request ID</label>
              <Input
                placeholder="Request number..."
                value={filters.requestId}
                onChange={(e) => setFilters(prev => ({ ...prev, requestId: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="text-sm text-muted-foreground">
                Date filtering coming soon
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {filteredLogs.length} of {auditLogs.length} audit entries
            </div>
            <Button onClick={fetchAuditLogs} variant="outline" size="sm">
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Status Change</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="text-sm font-mono">
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <Badge className={getActionColor(log.action)}>
                        {log.action.replace('_', ' ')}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{log.userName}</div>
                      <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                      <div className="text-xs text-muted-foreground/70">{log.userRole}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.requestNumber ? (
                      <span className="font-mono text-sm text-primary">
                        {log.requestNumber}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.oldStatus && log.newStatus ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className={getStatusColor(log.oldStatus)}>
                          {log.oldStatus.replace('_', ' ')}
                        </span>
                        <span>→</span>
                        <span className={getStatusColor(log.newStatus)}>
                          {log.newStatus.replace('_', ' ')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {log.notes && (
                        <p className="text-sm text-muted-foreground truncate" title={log.notes}>
                          {log.notes}
                        </p>
                      )}
                      {log.changes && (
                        <details className="text-xs text-muted-foreground/70">
                          <summary className="cursor-pointer hover:text-muted-foreground">
                            View changes
                          </summary>
                          <pre className="mt-2 whitespace-pre-wrap text-xs">
                            {JSON.stringify(JSON.parse(log.changes), null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No audit entries found</h3>
              <p className="text-muted-foreground">
                {auditLogs.length === 0 
                  ? 'No system activity has been logged yet.' 
                  : 'Try adjusting your search criteria.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}