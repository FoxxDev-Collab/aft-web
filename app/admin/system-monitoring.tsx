'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Database,
  HardDrive,
  Cpu,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Shield
} from 'lucide-react';

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  database: {
    status: 'connected' | 'disconnected' | 'slow';
    connectionCount: number;
    responseTime: number;
    lastBackup?: string;
  };
  storage: {
    totalSpace: number;
    usedSpace: number;
    availableSpace: number;
    filesCount: number;
  };
  performance: {
    averageResponseTime: number;
    requestsPerMinute: number;
    errorRate: number;
    uptime: number;
  };
  security: {
    activeUsers: number;
    failedLogins: number;
    suspiciousActivity: number;
    lastSecurityScan?: string;
  };
  alerts: SystemAlert[];
}

interface SystemAlert {
  id: number;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
  resolved: boolean;
}

// interface RealtimeStats {
//   timestamp: string;
//   activeUsers: number;
//   requestsPerSecond: number;
//   responseTime: number;
//   memoryUsage: number;
// }

export function SystemMonitoring() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/admin/system-health');
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data);
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtimeStats = async () => {
    try {
      const response = await fetch('/api/admin/realtime-stats');
      if (response.ok) {
        // const data = await response.json();
        // For now, we don't need to store realtime stats
      }
    } catch (error) {
      console.error('Error fetching realtime stats:', error);
    }
  };

  useEffect(() => {
    fetchSystemHealth();
    fetchRealtimeStats();
    
    // Update system health every 30 seconds
    const healthInterval = setInterval(fetchSystemHealth, 30000);
    // Update realtime stats every 5 seconds
    const statsInterval = setInterval(fetchRealtimeStats, 5000);
    
    return () => {
      clearInterval(healthInterval);
      clearInterval(statsInterval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!systemHealth) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Failed to load system health data</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': case 'connected': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': case 'slow': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'critical': case 'disconnected': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': case 'connected': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'warning': case 'slow': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'critical': case 'disconnected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System Monitoring</h2>
          <p className="text-muted-foreground">Real-time system health and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(systemHealth.overall)}
          <Badge className={getStatusColor(systemHealth.overall)}>
            System {systemHealth.overall}
          </Badge>
        </div>
      </div>

      {/* Critical Alerts */}
      {systemHealth.alerts.filter(alert => !alert.resolved && alert.type === 'error').length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Critical Issues Detected:</strong>
            <ul className="mt-2 list-disc list-inside">
              {systemHealth.alerts
                .filter(alert => !alert.resolved && alert.type === 'error')
                .map(alert => (
                  <li key={alert.id}>{alert.message}</li>
                ))
              }
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Status</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getStatusIcon(systemHealth.database.status)}
                  <div className="text-2xl font-bold capitalize">
                    {systemHealth.database.status}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {systemHealth.database.responseTime}ms response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round((systemHealth.storage.usedSpace / systemHealth.storage.totalSpace) * 100)}%
                </div>
                <Progress 
                  value={(systemHealth.storage.usedSpace / systemHealth.storage.totalSpace) * 100} 
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formatBytes(systemHealth.storage.availableSpace)} available
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemHealth.security.activeUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently online
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatUptime(systemHealth.performance.uptime)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  System running
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Real-time Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span>Response Time</span>
                  <span>{systemHealth.performance.averageResponseTime}ms avg</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Requests/min</span>
                  <span>{systemHealth.performance.requestsPerMinute}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Error Rate</span>
                  <span>{systemHealth.performance.errorRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(systemHealth.database.status)}
                    <span className="font-medium">Connection Status</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {systemHealth.database.connectionCount} active connections
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="font-medium">Response Time</div>
                  <p className="text-2xl font-bold">
                    {systemHealth.database.responseTime}ms
                  </p>
                  <Progress 
                    value={Math.min(systemHealth.database.responseTime / 10, 100)} 
                    className="mt-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="font-medium">Last Backup</div>
                  <p className="text-sm text-muted-foreground">
                    {systemHealth.database.lastBackup 
                      ? new Date(systemHealth.database.lastBackup).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="w-5 h-5" />
                Storage Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Disk Usage</span>
                    <span className="text-sm text-muted-foreground">
                      {formatBytes(systemHealth.storage.usedSpace)} / {formatBytes(systemHealth.storage.totalSpace)}
                    </span>
                  </div>
                  <Progress 
                    value={(systemHealth.storage.usedSpace / systemHealth.storage.totalSpace) * 100}
                    className="h-3"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-green-600">
                      {formatBytes(systemHealth.storage.availableSpace)}
                    </div>
                    <div className="text-sm text-muted-foreground">Available</div>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatBytes(systemHealth.storage.usedSpace)}
                    </div>
                    <div className="text-sm text-muted-foreground">Used</div>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-purple-600">
                      {systemHealth.storage.filesCount.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Files</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-4 rounded-lg border">
                  <div className="text-2xl font-bold">
                    {systemHealth.performance.averageResponseTime}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Response Time</div>
                </div>
                
                <div className="text-center p-4 rounded-lg border">
                  <div className="text-2xl font-bold">
                    {systemHealth.performance.requestsPerMinute}
                  </div>
                  <div className="text-sm text-muted-foreground">Requests/min</div>
                </div>
                
                <div className="text-center p-4 rounded-lg border">
                  <div className="text-2xl font-bold text-red-600">
                    {systemHealth.performance.errorRate}%
                  </div>
                  <div className="text-sm text-muted-foreground">Error Rate</div>
                </div>
                
                <div className="text-center p-4 rounded-lg border">
                  <div className="text-2xl font-bold text-green-600">
                    {formatUptime(systemHealth.performance.uptime)}
                  </div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 rounded-lg border">
                  <div className="text-2xl font-bold text-green-600">
                    {systemHealth.security.activeUsers}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Users</div>
                </div>
                
                <div className="text-center p-4 rounded-lg border">
                  <div className="text-2xl font-bold text-red-600">
                    {systemHealth.security.failedLogins}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed Logins (24h)</div>
                </div>
                
                <div className="text-center p-4 rounded-lg border">
                  <div className="text-2xl font-bold text-yellow-600">
                    {systemHealth.security.suspiciousActivity}
                  </div>
                  <div className="text-sm text-muted-foreground">Suspicious Events</div>
                </div>
              </div>
              
              {systemHealth.security.lastSecurityScan && (
                <div className="mt-6 p-4 rounded-lg bg-muted">
                  <div className="font-medium">Last Security Scan</div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(systemHealth.security.lastSecurityScan).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {systemHealth.alerts.map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                    alert.type === 'error' ? 'border-red-500 bg-red-50' :
                    alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                    alert.type === 'success' ? 'border-green-500 bg-green-50' :
                    'border-blue-500 bg-blue-50'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{alert.message}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant={alert.resolved ? "secondary" : "destructive"}>
                        {alert.resolved ? "Resolved" : "Active"}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {systemHealth.alerts.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Active Alerts</h3>
                    <p className="text-muted-foreground">
                      All systems are operating normally.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}