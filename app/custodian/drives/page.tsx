'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  HardDrive,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings
} from 'lucide-react';
import { DriveInventory, NewDriveInventory } from '@/lib/db/schema';

interface DriveInventoryWithStatus extends DriveInventory {
  issuedTo?: string;
  issuedDate?: string;
  expectedReturn?: string;
}

export default function DrivesPage() {
  const [drives, setDrives] = useState<DriveInventoryWithStatus[]>([]);
  const [filteredDrives, setFilteredDrives] = useState<DriveInventoryWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDrive, setEditingDrive] = useState<DriveInventory | null>(null);
  const [newDrive, setNewDrive] = useState<Partial<NewDriveInventory>>({
    serialNumber: '',
    model: '',
    capacity: '',
    mediaController: '',
    mediaType: 'SSD',
    classification: 'UNCLASSIFIED',
    status: 'available',
    notes: ''
  });

  const fetchDrives = async () => {
    try {
      const response = await fetch('/api/custodian/drives');
      if (response.ok) {
        const data = await response.json();
        setDrives(data);
      }
    } catch (error) {
      console.error('Error fetching drives:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDrives = useCallback(() => {
    let filtered = drives;

    if (searchTerm) {
      filtered = filtered.filter(drive =>
        drive.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drive.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drive.mediaController.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(drive => drive.status === statusFilter);
    }

    setFilteredDrives(filtered);
  }, [drives, searchTerm, statusFilter]);

  useEffect(() => {
    fetchDrives();
  }, []);

  useEffect(() => {
    filterDrives();
  }, [filterDrives]);

  const handleAddDrive = async () => {
    try {
      const response = await fetch('/api/custodian/drives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDrive),
      });

      if (response.ok) {
        setAddDialogOpen(false);
        setNewDrive({
          serialNumber: '',
          model: '',
          capacity: '',
          mediaController: '',
          mediaType: 'SSD',
          classification: 'UNCLASSIFIED',
          status: 'available',
          notes: ''
        });
        fetchDrives();
      }
    } catch (error) {
      console.error('Error adding drive:', error);
    }
  };

  const handleEditDrive = async () => {
    if (!editingDrive) return;

    try {
      const response = await fetch(`/api/custodian/drives/${editingDrive.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingDrive),
      });

      if (response.ok) {
        setEditDialogOpen(false);
        setEditingDrive(null);
        fetchDrives();
      }
    } catch (error) {
      console.error('Error updating drive:', error);
    }
  };

  const handleDeleteDrive = async (driveId: number) => {
    if (!confirm('Are you sure you want to delete this drive?')) return;

    try {
      const response = await fetch(`/api/custodian/drives/${driveId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchDrives();
      }
    } catch (error) {
      console.error('Error deleting drive:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'issued':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'maintenance':
        return <Settings className="w-4 h-4 text-blue-600" />;
      case 'retired':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <HardDrive className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'issued':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'maintenance':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'retired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const stats = {
    total: drives.length,
    available: drives.filter(d => d.status === 'available').length,
    issued: drives.filter(d => d.status === 'issued').length,
    maintenance: drives.filter(d => d.status === 'maintenance').length,
    retired: drives.filter(d => d.status === 'retired').length
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
          <h1 className="text-3xl font-bold">Drive Inventory</h1>
          <p className="text-muted-foreground">Manage external media drives and controllers</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Drive
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Drive</DialogTitle>
              <DialogDescription>
                Enter the details for the new external drive
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={newDrive.serialNumber}
                    onChange={(e) => setNewDrive(prev => ({ ...prev, serialNumber: e.target.value }))}
                    placeholder="Enter serial number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={newDrive.model}
                    onChange={(e) => setNewDrive(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="Enter model"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    value={newDrive.capacity}
                    onChange={(e) => setNewDrive(prev => ({ ...prev, capacity: e.target.value }))}
                    placeholder="e.g., 1TB, 500GB"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mediaController">Media Controller</Label>
                  <Input
                    id="mediaController"
                    value={newDrive.mediaController}
                    onChange={(e) => setNewDrive(prev => ({ ...prev, mediaController: e.target.value }))}
                    placeholder="e.g., MC-001"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mediaType">Media Type</Label>
                <Select value={newDrive.mediaType} onValueChange={(value) => setNewDrive(prev => ({ ...prev, mediaType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CD-R">CD-R (Compact Disc Recordable)</SelectItem>
                    <SelectItem value="DVD-R">DVD-R (DVD Recordable)</SelectItem>
                    <SelectItem value="DVD-RDL">DVD-RDL (DVD Recordable Dual Layer)</SelectItem>
                    <SelectItem value="SSD">SSD (Solid State Drive)</SelectItem>
                    <SelectItem value="SSD-T">SSD-T (Solid State Drive - Trusted)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="classification">Classification</Label>
                  <Select value={newDrive.classification} onValueChange={(value) => setNewDrive(prev => ({ ...prev, classification: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNCLASSIFIED">UNCLASSIFIED</SelectItem>
                      <SelectItem value="CONFIDENTIAL">CONFIDENTIAL</SelectItem>
                      <SelectItem value="SECRET">SECRET</SelectItem>
                      <SelectItem value="TOP SECRET">TOP SECRET</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={newDrive.status} onValueChange={(value) => setNewDrive(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newDrive.notes || ''}
                  onChange={(e) => setNewDrive(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddDrive}>Add Drive</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drives</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issued</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.issued}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <Settings className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.maintenance}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retired</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.retired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search drives..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drives Table */}
      <Card>
        <CardHeader>
          <CardTitle>Drive Inventory ({filteredDrives.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial Number</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Media Controller</TableHead>
                <TableHead>Media Type</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current User</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrives.map((drive) => (
                <TableRow key={drive.id}>
                  <TableCell className="font-mono">{drive.serialNumber}</TableCell>
                  <TableCell>{drive.model}</TableCell>
                  <TableCell>{drive.capacity}</TableCell>
                  <TableCell className="font-mono">{drive.mediaController}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{drive.mediaType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{drive.classification}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(drive.status)}
                      <Badge className={getStatusColor(drive.status)}>
                        {drive.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {drive.issuedTo || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingDrive(drive);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDrive(drive.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Drive</DialogTitle>
            <DialogDescription>
              Update the drive information
            </DialogDescription>
          </DialogHeader>
          {editingDrive && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-serialNumber">Serial Number</Label>
                  <Input
                    id="edit-serialNumber"
                    value={editingDrive.serialNumber}
                    onChange={(e) => setEditingDrive(prev => prev ? ({ ...prev, serialNumber: e.target.value }) : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-model">Model</Label>
                  <Input
                    id="edit-model"
                    value={editingDrive.model}
                    onChange={(e) => setEditingDrive(prev => prev ? ({ ...prev, model: e.target.value }) : null)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-capacity">Capacity</Label>
                  <Input
                    id="edit-capacity"
                    value={editingDrive.capacity}
                    onChange={(e) => setEditingDrive(prev => prev ? ({ ...prev, capacity: e.target.value }) : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-mediaController">Media Controller</Label>
                  <Input
                    id="edit-mediaController"
                    value={editingDrive.mediaController}
                    onChange={(e) => setEditingDrive(prev => prev ? ({ ...prev, mediaController: e.target.value }) : null)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-mediaType">Media Type</Label>
                <Select value={editingDrive.mediaType} onValueChange={(value) => setEditingDrive(prev => prev ? ({ ...prev, mediaType: value }) : null)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CD-R">CD-R (Compact Disc Recordable)</SelectItem>
                    <SelectItem value="DVD-R">DVD-R (DVD Recordable)</SelectItem>
                    <SelectItem value="DVD-RDL">DVD-RDL (DVD Recordable Dual Layer)</SelectItem>
                    <SelectItem value="SSD">SSD (Solid State Drive)</SelectItem>
                    <SelectItem value="SSD-T">SSD-T (Solid State Drive - Trusted)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-classification">Classification</Label>
                  <Select value={editingDrive.classification} onValueChange={(value) => setEditingDrive(prev => prev ? ({ ...prev, classification: value }) : null)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNCLASSIFIED">UNCLASSIFIED</SelectItem>
                      <SelectItem value="CONFIDENTIAL">CONFIDENTIAL</SelectItem>
                      <SelectItem value="SECRET">SECRET</SelectItem>
                      <SelectItem value="TOP SECRET">TOP SECRET</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editingDrive.status} onValueChange={(value) => setEditingDrive(prev => prev ? ({ ...prev, status: value }) : null)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="issued">Issued</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editingDrive.notes || ''}
                  onChange={(e) => setEditingDrive(prev => prev ? ({ ...prev, notes: e.target.value }) : null)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditDrive}>Update Drive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}