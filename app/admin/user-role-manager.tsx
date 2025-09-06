'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roles?: string[];
  organization?: string;
}

interface UserRole {
  id: number;
  userId: number;
  role: string;
  isActive: boolean;
  assignedBy: number;
  createdAt: string;
}

const roleLabels = {
  admin: 'Administrator',
  requestor: 'Requestor',
  dao: 'DAO',
  approver: 'Approver',
  cpso: 'CPSO',
  dta: 'Data Transfer Agent',
  sme: 'Subject Matter Expert',
  media_custodian: 'Media Custodian',
};

const roleOptions = [
  { value: 'admin', label: 'Administrator' },
  { value: 'requestor', label: 'Requestor' },
  { value: 'dao', label: 'DAO' },
  { value: 'approver', label: 'Approver' },
  { value: 'cpso', label: 'CPSO' },
  { value: 'dta', label: 'Data Transfer Agent' },
  { value: 'sme', label: 'Subject Matter Expert' },
  { value: 'media_custodian', label: 'Media Custodian' },
];

interface UserRoleManagerProps {
  user: User;
  onUpdate: () => void;
}

export function UserRoleManager({ user, onUpdate }: UserRoleManagerProps) {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [addRoleDialogOpen, setAddRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');

  const fetchUserRoles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${user.id}/roles`);
      if (response.ok) {
        const roles = await response.json();
        setUserRoles(roles);
      } else {
        toast.error('Failed to fetch user roles');
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
      toast.error('Error fetching user roles');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchUserRoles();
  }, [fetchUserRoles]);

  const addRole = async () => {
    if (!selectedRole) {
      toast.error('Please select a role');
      return;
    }

    try {
      setActionLoading('add');
      const response = await fetch(`/api/users/${user.id}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (response.ok) {
        toast.success('Role added successfully');
        setAddRoleDialogOpen(false);
        setSelectedRole('');
        fetchUserRoles();
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add role');
      }
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error('Error adding role');
    } finally {
      setActionLoading(null);
    }
  };

  const removeRole = async (role: string) => {
    try {
      setActionLoading(role);
      const response = await fetch(`/api/users/${user.id}/roles`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        toast.success('Role removed successfully');
        fetchUserRoles();
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove role');
      }
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Error removing role');
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'dao': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'approver': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'cpso': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'requestor': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'dta': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'sme': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'media_custodian': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const availableRoles = roleOptions.filter(role => 
    !userRoles.some(userRole => userRole.role === role.value && userRole.isActive)
  );

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Roles for {user.firstName} {user.lastName}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Primary Role: <Badge className={getRoleBadgeColor(user.role)}>{roleLabels[user.role as keyof typeof roleLabels]}</Badge>
          </p>
        </div>
        <Dialog open={addRoleDialogOpen} onOpenChange={setAddRoleDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={availableRoles.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Role</DialogTitle>
              <DialogDescription>
                Select an additional role to assign to this user.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button 
                onClick={addRole}
                disabled={actionLoading === 'add' || !selectedRole}
              >
                {actionLoading === 'add' ? 'Adding...' : 'Add Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {userRoles.filter(r => r.isActive).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No additional roles assigned</p>
                <p className="text-sm">User only has their primary role: {roleLabels[user.role as keyof typeof roleLabels]}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {userRoles
                  .filter(userRole => userRole.isActive)
                  .map((userRole) => (
                    <div
                      key={userRole.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Badge className={getRoleBadgeColor(userRole.role)}>
                          {roleLabels[userRole.role as keyof typeof roleLabels]}
                        </Badge>
                        {userRole.role === user.role && (
                          <Badge variant="outline" className="text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">
                          Added {new Date(userRole.createdAt).toLocaleDateString()}
                        </span>
                        {userRole.role !== user.role && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-red-600 hover:text-red-700"
                                disabled={actionLoading === userRole.role}
                              >
                                {actionLoading === userRole.role ? (
                                  <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Role</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove the &ldquo;{roleLabels[userRole.role as keyof typeof roleLabels]}&rdquo; role from this user?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeRole(userRole.role)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Remove Role
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
            
            {availableRoles.length === 0 && userRoles.filter(r => r.isActive).length > 0 && (
              <div className="text-center py-2 text-sm text-muted-foreground">
                All available roles have been assigned
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}