'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  HardDrive
} from 'lucide-react';
import { DriveInventory, DriveTracking, User as UserType } from '@/lib/db/schema';

interface DriveTrackingWithDetails extends DriveTracking {
  drive: DriveInventory;
  user: UserType;
  custodian: UserType;
  isOverdue?: boolean;
}

interface IssueFormData {
  driveId: number;
  userId: number;
  sourceIS: string;
  destinationIS: string;
  expectedReturnAt?: string;
  issueNotes: string;
}

export default function DriveTrackingPage() {
  const [activeIssues, setActiveIssues] = useState<DriveTrackingWithDetails[]>([]);
  const [completedIssues, setCompletedIssues] = useState<DriveTrackingWithDetails[]>([]);
  const [availableDrives, setAvailableDrives] = useState<DriveInventory[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returningIssue, setReturningIssue] = useState<DriveTrackingWithDetails | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  
  const [issueForm, setIssueForm] = useState<IssueFormData>({
    driveId: 0,
    userId: 0,
    sourceIS: '',
    destinationIS: '',
    expectedReturnAt: '',
    issueNotes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [trackingResponse, drivesResponse, usersResponse] = await Promise.all([
        fetch('/api/custodian/drive-tracking'),
        fetch('/api/custodian/drives/available'),
        fetch('/api/users')
      ]);

      if (trackingResponse.ok) {
        const trackingData = await trackingResponse.json();
        setActiveIssues(trackingData.active || []);
        setCompletedIssues(trackingData.completed || []);
      }

      if (drivesResponse.ok) {
        const drivesData = await drivesResponse.json();
        setAvailableDrives(drivesData);
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueDrive = async () => {
    try {
      const response = await fetch('/api/custodian/drive-tracking/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...issueForm,
          expectedReturnAt: issueForm.expectedReturnAt ? new Date(issueForm.expectedReturnAt).toISOString() : null
        }),
      });

      if (response.ok) {
        setShowIssueForm(false);
        setIssueForm({
          driveId: 0,
          userId: 0,
          sourceIS: '',
          destinationIS: '',
          expectedReturnAt: '',
          issueNotes: ''
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error issuing drive:', error);
    }
  };

  const handleReturnDrive = async () => {
    if (!returningIssue) return;

    try {
      const response = await fetch(`/api/custodian/drive-tracking/${returningIssue.id}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnNotes
        }),
      });

      if (response.ok) {
        setReturnDialogOpen(false);
        setReturningIssue(null);
        setReturnNotes('');
        fetchData();
      }
    } catch (error) {
      console.error('Error returning drive:', error);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  const isOverdue = (expectedReturnAt: Date | string | null) => {
    if (!expectedReturnAt) return false;
    return new Date(expectedReturnAt) < new Date();
  };

  const getDaysOverdue = (expectedReturnAt: Date | string | null) => {
    if (!expectedReturnAt) return 0;
    const expected = new Date(expectedReturnAt);
    const now = new Date();
    return Math.ceil((now.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
  };

  const stats = {
    totalActive: activeIssues.length,
    overdue: activeIssues.filter(issue => isOverdue(issue.expectedReturnAt)).length,
    dueToday: activeIssues.filter(issue => {
      if (!issue.expectedReturnAt) return false;
      const expected = new Date(issue.expectedReturnAt);
      const today = new Date();
      return expected.toDateString() === today.toDateString();
    }).length,
    totalCompleted: completedIssues.length
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
          <h1 className="text-3xl font-bold">Drive Tracking</h1>
          <p className="text-muted-foreground">Track drive issues and returns</p>
        </div>
        <Button onClick={() => setShowIssueForm(!showIssueForm)}>
          <Upload className="w-4 h-4 mr-2" />
          {showIssueForm ? 'Cancel Issue' : 'Issue Drive'}
        </Button>
      </div>

      {/* Issue Form */}
      {showIssueForm && (
        <Card>
          <CardHeader>
            <CardTitle>Issue Drive</CardTitle>
            <CardDescription>
              Issue a drive to a user for data transfer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="driveId">Select Drive</Label>
                  <Select value={issueForm.driveId.toString()} onValueChange={(value) => setIssueForm(prev => ({ ...prev, driveId: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a drive" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDrives.map((drive) => (
                        <SelectItem key={drive.id} value={drive.id.toString()}>
                          {drive.serialNumber} - {drive.model} ({drive.capacity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userId">Select User</Label>
                  <Select value={issueForm.userId.toString()} onValueChange={(value) => setIssueForm(prev => ({ ...prev, userId: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.firstName} {user.lastName} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sourceIS">Source IS</Label>
                  <Input
                    id="sourceIS"
                    value={issueForm.sourceIS}
                    onChange={(e) => setIssueForm(prev => ({ ...prev, sourceIS: e.target.value }))}
                    placeholder="Source Information System"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destinationIS">Destination IS</Label>
                  <Input
                    id="destinationIS"
                    value={issueForm.destinationIS}
                    onChange={(e) => setIssueForm(prev => ({ ...prev, destinationIS: e.target.value }))}
                    placeholder="Destination Information System"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expectedReturnAt">Expected Return Date (Optional)</Label>
                  <Input
                    id="expectedReturnAt"
                    type="datetime-local"
                    value={issueForm.expectedReturnAt}
                    onChange={(e) => setIssueForm(prev => ({ ...prev, expectedReturnAt: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issueNotes">Issue Notes</Label>
                  <Textarea
                    id="issueNotes"
                    value={issueForm.issueNotes}
                    onChange={(e) => setIssueForm(prev => ({ ...prev, issueNotes: e.target.value }))}
                    placeholder="Notes about this drive issue..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleIssueDrive} disabled={!issueForm.driveId || !issueForm.userId}>
                  Issue Drive
                </Button>
                <Button variant="outline" onClick={() => setShowIssueForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Issues</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActive}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Today</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.dueToday}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalCompleted}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Issues ({stats.totalActive})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({stats.totalCompleted})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Drive Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drive</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Source IS</TableHead>
                    <TableHead>Destination IS</TableHead>
                    <TableHead>Issued Date</TableHead>
                    <TableHead>Expected Return</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeIssues.map((issue) => (
                    <TableRow key={issue.id} className={isOverdue(issue.expectedReturnAt) ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                      <TableCell>
                        <div>
                          <div className="font-mono text-sm">{issue.drive.serialNumber}</div>
                          <div className="text-xs text-muted-foreground">{issue.drive.model}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{issue.user.firstName} {issue.user.lastName}</div>
                          <div className="text-xs text-muted-foreground">{issue.user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{issue.sourceIS}</TableCell>
                      <TableCell>{issue.destinationIS}</TableCell>
                      <TableCell>{formatDate(issue.issuedAt)}</TableCell>
                      <TableCell>
                        {issue.expectedReturnAt ? (
                          <div>
                            <div>{formatDate(issue.expectedReturnAt)}</div>
                            {isOverdue(issue.expectedReturnAt) && (
                              <Badge variant="destructive" className="text-xs">
                                {getDaysOverdue(issue.expectedReturnAt)} days overdue
                              </Badge>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={isOverdue(issue.expectedReturnAt) ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}>
                          {isOverdue(issue.expectedReturnAt) ? 'Overdue' : 'Issued'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReturningIssue(issue);
                            setReturnDialogOpen(true);
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Return
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Drive Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drive</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Source IS</TableHead>
                    <TableHead>Destination IS</TableHead>
                    <TableHead>Issued Date</TableHead>
                    <TableHead>Return Date</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedIssues.map((issue) => {
                    const duration = issue.returnedAt && issue.issuedAt ?
                      Math.ceil((new Date(issue.returnedAt).getTime() - new Date(issue.issuedAt).getTime()) / (1000 * 60 * 60 * 24)) :
                      0;
                    
                    return (
                      <TableRow key={issue.id}>
                        <TableCell>
                          <div>
                            <div className="font-mono text-sm">{issue.drive.serialNumber}</div>
                            <div className="text-xs text-muted-foreground">{issue.drive.model}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{issue.user.firstName} {issue.user.lastName}</div>
                            <div className="text-xs text-muted-foreground">{issue.user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{issue.sourceIS}</TableCell>
                        <TableCell>{issue.destinationIS}</TableCell>
                        <TableCell>{formatDate(issue.issuedAt)}</TableCell>
                        <TableCell>{formatDate(issue.returnedAt)}</TableCell>
                        <TableCell>{duration} day{duration !== 1 ? 's' : ''}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Drive</DialogTitle>
            <DialogDescription>
              Confirm the return of this drive
            </DialogDescription>
          </DialogHeader>
          {returningIssue && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Drive:</strong> {returningIssue.drive.serialNumber} - {returningIssue.drive.model}
                </div>
                <div>
                  <strong>User:</strong> {returningIssue.user.firstName} {returningIssue.user.lastName}
                </div>
                <div>
                  <strong>Source IS:</strong> {returningIssue.sourceIS}
                </div>
                <div>
                  <strong>Destination IS:</strong> {returningIssue.destinationIS}
                </div>
                <div>
                  <strong>Issued:</strong> {formatDate(returningIssue.issuedAt)}
                </div>
                <div>
                  <strong>Expected Return:</strong> {formatDate(returningIssue.expectedReturnAt)}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="returnNotes">Return Notes</Label>
                <Textarea
                  id="returnNotes"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Notes about the drive return..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReturnDrive}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}