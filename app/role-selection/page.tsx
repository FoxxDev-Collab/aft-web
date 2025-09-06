'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User,
  Shield,
  Server,
  FileCheck,
  Archive,
  Users,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  primaryRole: string;
  roles: string[];
}

const roleConfig = {
  admin: {
    icon: Users,
    title: 'Administrator',
    description: 'Full system access, user management, and audit capabilities',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    redirectPath: '/admin'
  },
  requestor: {
    icon: User,
    title: 'Requestor',
    description: 'Create and manage AFT requests',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    redirectPath: '/requestor'
  },
  dao: {
    icon: Shield,
    title: 'Designated Authorizing Official (DAO)',
    description: 'Review and approve AFT requests',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    redirectPath: '/approver'
  },
  approver: {
    icon: Shield,
    title: 'ISSM/ISSO Approver',
    description: 'Security review and approval of transfer requests',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    redirectPath: '/approver'
  },
  cpso: {
    icon: Shield,
    title: 'Cyber Physical Security Officer',
    description: 'Final security approval for transfers',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    redirectPath: '/approver'
  },
  dta: {
    icon: Server,
    title: 'Data Transfer Agent',
    description: 'Execute file transfers and conduct security scans',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    redirectPath: '/dta'
  },
  sme: {
    icon: FileCheck,
    title: 'Subject Matter Expert',
    description: 'Verify and sign off on completed transfers',
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    redirectPath: '/sme'
  },
  media_custodian: {
    icon: Archive,
    title: 'Media Custodian',
    description: 'Handle final disposition of transfer media',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    redirectPath: '/custodian'
  }
};

export default function RoleSelectionPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    const fetchUserRoles = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
          
          // If user has only one role, auto-redirect
          const userRoles = userData.user.roles || [];
          if (userRoles.length === 1) {
            const role = userRoles[0];
            await setCurrentRole(role);
            const redirectPath = roleConfig[role as keyof typeof roleConfig]?.redirectPath || '/dashboard';
            router.push(redirectPath);
            return;
          }
        } else {
          // User not authenticated, redirect to login
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('Failed to fetch user roles:', error);
        toast.error('Failed to load user information');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRoles();
  }, [router]);

  const setCurrentRole = async (role: string) => {
    try {
      const response = await fetch('/api/auth/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });

      if (!response.ok) {
        throw new Error('Failed to set role');
      }

      return true;
    } catch (error) {
      console.error('Failed to set current role:', error);
      toast.error('Failed to set role');
      return false;
    }
  };

  const handleRoleSelection = async (role: string) => {
    setSelecting(true);
    try {
      const success = await setCurrentRole(role);
      if (success) {
        const redirectPath = roleConfig[role as keyof typeof roleConfig]?.redirectPath || '/dashboard';
        toast.success(`Switched to ${roleConfig[role as keyof typeof roleConfig]?.title} role`);
        router.push(redirectPath);
      }
    } catch (error) {
      console.error('Role selection error:', error);
      toast.error('Failed to select role');
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your roles...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const activeRoles = user.roles || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Welcome, {user.firstName} {user.lastName}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
            You have multiple roles available. Please select the role you&apos;d like to use for this session.
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span>Primary Role: {user.primaryRole.toUpperCase()}</span>
          </div>
        </div>

        {activeRoles.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Active Roles
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You don&apos;t have any active roles assigned. Please contact your administrator.
              </p>
              <Button variant="outline" onClick={() => router.push('/login')}>
                Return to Login
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeRoles.map((role) => {
              const config = roleConfig[role as keyof typeof roleConfig];
              if (!config) return null;

              const Icon = config.icon;
              const isPrimary = role === user.primaryRole;

              return (
                <Card 
                  key={role}
                  className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
                  onClick={() => handleRoleSelection(role)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <Icon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-medium">
                            {config.title}
                          </CardTitle>
                          {isPrimary && (
                            <Badge className="mt-1" variant="outline">
                              Primary Role
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm leading-relaxed">
                      {config.description}
                    </CardDescription>
                    <div className="mt-4">
                      <Badge className={config.color} variant="secondary">
                        {role.toUpperCase().replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            You can switch roles at any time from the application header.
          </p>
          <Button 
            variant="outline" 
            onClick={() => router.push('/login')}
            disabled={selecting}
          >
            {selecting ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                Switching Role...
              </>
            ) : (
              'Return to Login'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}