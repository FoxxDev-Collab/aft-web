'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, UserCheck, UserX, Shield, Archive, RotateCcw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { UserRoleManager } from '@/app/admin/user-role-manager';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roles?: string[]; // Multiple roles
  organization?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  primaryRole: z.enum(['admin', 'requestor', 'dao', 'approver', 'cpso', 'dta', 'sme', 'media_custodian'], {
    message: 'Primary role is required',
  }),
  additionalRoles: z.array(z.enum(['admin', 'requestor', 'dao', 'approver', 'cpso', 'dta', 'sme', 'media_custodian'])).optional(),
  organization: z.string().optional(),
  phone: z.string().optional(),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

const editUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().optional().or(z.string().min(8, 'Password must be at least 8 characters')),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  primaryRole: z.enum(['admin', 'requestor', 'dao', 'approver', 'cpso', 'dta', 'sme', 'media_custodian'], {
    message: 'Primary role is required',
  }),
  additionalRoles: z.array(z.enum(['admin', 'requestor', 'dao', 'approver', 'cpso', 'dta', 'sme', 'media_custodian'])).optional(),
  organization: z.string().optional(),
  phone: z.string().optional(),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [archivedUsers, setArchivedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roleManagerOpen, setRoleManagerOpen] = useState(false);
  const [roleManagerUser, setRoleManagerUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      primaryRole: 'requestor',
      organization: '',
      phone: '',
    },
  });

  const editForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      primaryRole: 'requestor',
      organization: '',
      phone: '',
    },
  });

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const userData = await response.json();
        // Separate active and archived users
        const activeUsers = userData.filter((user: User) => user.isActive);
        const inactiveUsers = userData.filter((user: User) => !user.isActive);
        setUsers(activeUsers);
        setArchivedUsers(inactiveUsers);
      } else {
        toast.error('Failed to fetch users');
      }
    } catch {
      toast.error('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Create user
  const onSubmit = async (data: CreateUserFormValues) => {
    try {
      setActionLoading(-1); // Special loading state for create
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('User created successfully');
        setCreateDialogOpen(false);
        form.reset();
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create user');
      }
    } catch {
      toast.error('Error creating user');
    } finally {
      setActionLoading(null);
    }
  };

  // Edit user
  const onEditSubmit = async (data: EditUserFormValues) => {
    if (!editingUser) return;
    
    try {
      setActionLoading(editingUser.id);
      
      // Only send password if it's not empty
      const updateData = { ...data };
      if (!data.password || data.password.trim() === '') {
        delete updateData.password;
      }
      
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast.success('User updated successfully');
        setEditDialogOpen(false);
        setEditingUser(null);
        editForm.reset();
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update user');
      }
    } catch {
      toast.error('Error updating user');
    } finally {
      setActionLoading(null);
    }
  };

  // Open edit dialog
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      email: user.email,
      password: '', // Always start with empty password
      firstName: user.firstName,
      lastName: user.lastName,
      primaryRole: user.role as EditUserFormValues['primaryRole'],
      organization: user.organization || '',
      phone: user.phone || '',
    });
    setEditDialogOpen(true);
  };

  // Open role manager
  const handleManageRoles = (user: User) => {
    setRoleManagerUser(user);
    setRoleManagerOpen(true);
  };

  // Toggle user status
  const toggleUserStatus = async (userId: number, newStatus: boolean) => {
    try {
      setActionLoading(userId);
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (response.ok) {
        toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update user status');
      }
    } catch {
      toast.error('Error updating user status');
    } finally {
      setActionLoading(null);
    }
  };

  // Archive user (soft delete)
  const archiveUser = async (userId: number) => {
    try {
      setActionLoading(userId);
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('User archived successfully');
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to archive user');
      }
    } catch {
      toast.error('Error archiving user');
    } finally {
      setActionLoading(null);
    }
  };

  // Reactivate user
  const reactivateUser = async (userId: number) => {
    try {
      setActionLoading(userId);
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: true }),
      });

      if (response.ok) {
        toast.success('User reactivated successfully');
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to reactivate user');
      }
    } catch {
      toast.error('Error reactivating user');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Active Users</CardTitle>
              <CardDescription>Manage active system users and their permissions</CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the AFT system
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="user@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="primaryRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select primary role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="requestor">Requestor</SelectItem>
                              <SelectItem value="dao">DAO</SelectItem>
                              <SelectItem value="approver">Approver</SelectItem>
                              <SelectItem value="cpso">CPSO</SelectItem>
                              <SelectItem value="dta">DTA</SelectItem>
                              <SelectItem value="sme">SME</SelectItem>
                              <SelectItem value="media_custodian">Media Custodian</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="organization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Corp" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="555-0123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        disabled={actionLoading === -1}
                      >
                        {actionLoading === -1 ? 'Creating...' : 'Create User'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                  <DialogDescription>
                    Update user information. Leave password blank to keep current password.
                  </DialogDescription>
                </DialogHeader>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="user@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password (optional)</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Leave blank to keep current" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={editForm.control}
                      name="primaryRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select primary role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="requestor">Requestor</SelectItem>
                              <SelectItem value="dao">DAO</SelectItem>
                              <SelectItem value="approver">Approver</SelectItem>
                              <SelectItem value="cpso">CPSO</SelectItem>
                              <SelectItem value="dta">DTA</SelectItem>
                              <SelectItem value="sme">SME</SelectItem>
                              <SelectItem value="media_custodian">Media Custodian</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="organization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Corp" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="555-0123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        disabled={actionLoading === editingUser?.id}
                      >
                        {actionLoading === editingUser?.id ? 'Updating...' : 'Update User'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge className={getRoleBadgeColor(user.role)} variant="default">
                        {user.role.toUpperCase().replace('_', ' ')} (Primary)
                      </Badge>
                      {user.roles?.filter(role => role !== user.role).map((role) => (
                        <Badge key={role} className={getRoleBadgeColor(role)} variant="outline">
                          {role.toUpperCase().replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{user.organization || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                        disabled={actionLoading === user.id}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageRoles(user)}
                        disabled={actionLoading === user.id}
                        title="Manage Roles"
                      >
                        <Shield className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleUserStatus(user.id, !user.isActive)}
                        disabled={actionLoading === user.id}
                      >
                        {user.isActive ? (
                          <UserX className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === user.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Archive User?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will archive {user.firstName} {user.lastName}&apos;s account.
                              They will no longer be able to access the system, but the account
                              can be reactivated later if needed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => archiveUser(user.id)}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              Archive User
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {users.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              No users found.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Archived Users Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Archived Users</CardTitle>
              <CardDescription>Users who have been archived but can be reactivated</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Archived Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archivedUsers.map((user) => (
                <TableRow key={user.id} className="opacity-75">
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge className={getRoleBadgeColor(user.role)} variant="outline">
                        {user.role.toUpperCase().replace('_', ' ')} (Primary)
                      </Badge>
                      {user.roles?.filter(role => role !== user.role).map((role) => (
                        <Badge key={role} className={getRoleBadgeColor(role)} variant="outline">
                          {role.toUpperCase().replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{user.organization || '-'}</TableCell>
                  <TableCell>
                    {new Date(user.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === user.id}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reactivate User?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will reactivate {user.firstName} {user.lastName}&apos;s account.
                              They will be able to access the system again with their previous permissions.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => reactivateUser(user.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Reactivate User
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {archivedUsers.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              No archived users found.
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Role Manager Dialog */}
      {roleManagerUser && (
        <Dialog open={roleManagerOpen} onOpenChange={setRoleManagerOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <UserRoleManager 
              user={roleManagerUser} 
              onUpdate={fetchUsers}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}