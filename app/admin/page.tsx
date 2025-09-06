'use client';

import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, Settings } from 'lucide-react';
import { UserManagement } from '@/app/admin/user-management';
import { AdminRequestsView } from '@/app/admin/admin-requests-view';
import { AdminDashboard } from '@/app/admin/admin-dashboard';
import { AuditTrail } from '@/app/admin/audit-trail';
import { RequestLifecycle } from '@/app/admin/request-lifecycle';
import { SystemMonitoring } from '@/app/admin/system-monitoring';
import { UserGuidesManagement } from '@/app/admin/user-guides-management';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AdminContent() {
  const searchParams = useSearchParams();
  const section = searchParams.get('section') || 'overview';

  const renderContent = () => {
    switch (section) {
      case 'user-management':
        return <UserManagement />;
      case 'user-guides':
        return <UserGuidesManagement />;
      case 'admin-requests':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  All AFT Requests
                </CardTitle>
                <CardDescription>
                  View and manage all Assured File Transfer requests in the system
                </CardDescription>
              </CardHeader>
            </Card>
            <AdminRequestsView />
          </div>
        );
      case 'audit-trail':
        return <AuditTrail />;
      case 'request-lifecycle':
        return <RequestLifecycle />;
      case 'system-monitoring':
        return <SystemMonitoring />;
      case 'system':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure system-wide settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">System settings functionality coming soon.</p>
            </CardContent>
          </Card>
        );
      default:
        return <AdminDashboard />;
    }
  };

  return <div className="space-y-6">{renderContent()}</div>;
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <AdminContent />
    </Suspense>
  );
}