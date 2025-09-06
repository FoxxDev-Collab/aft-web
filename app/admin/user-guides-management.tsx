'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Plus,
  Edit,
  Trash2,
  Eye,
  Save,
  X,
  BookOpen,
  Search,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface Guide {
  id: string;
  title: string;
  description: string;
  role: string | null;
  content: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByLastName: string;
}

interface GuideForm {
  id: string;
  title: string;
  description: string;
  role: string;
  content: string;
  isPublished: boolean;
  sortOrder: number;
}

const roleOptions = [
  { value: 'all', label: 'All Users (General)' },
  { value: 'requestor', label: 'Requestor' },
  { value: 'approver', label: 'Approver' },
  { value: 'dao', label: 'DAO' },
  { value: 'cpso', label: 'CPSO' },
  { value: 'admin', label: 'Administrator' },
  { value: 'media_custodian', label: 'Media Custodian' },
  { value: 'dta', label: 'DTA' },
  { value: 'sme', label: 'SME' },
];

const sampleMarkdown = `# Getting Started

This guide will help you understand the basics of the AFT system.

## Prerequisites

Before you begin, make sure you have:

- ✅ A valid user account
- ✅ Proper role assignments
- ✅ Access to the system

## Step 1: Login to the System

Navigate to the login page and enter your credentials:

\`\`\`
Username: your.email@domain.com
Password: ••••••••••
\`\`\`

## Step 2: Navigate the Dashboard

Once logged in, you'll see the main dashboard with the following sections:

- **Dashboard**: Overview of your activities
- **New Request**: Create a new AFT request
- **My Requests**: View your submitted requests
- **History**: Check past activities

> **Tip:** Use the search functionality to quickly find what you're looking for.

## Common Issues

| Issue | Solution |
|-------|----------|
| Can't login | Contact your administrator |
| Missing permissions | Check your role assignments |
| System slow | Try refreshing the page |

## Need Help?

If you have questions, contact the support team at [support@aft-system.com](mailto:support@aft-system.com).

---

*Last updated: ${new Date().toLocaleDateString()}*`;

export function UserGuidesManagement() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [filteredGuides, setFilteredGuides] = useState<Guide[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<GuideForm>({
    id: '',
    title: '',
    description: '',
    role: 'all',
    content: sampleMarkdown,
    isPublished: false,
    sortOrder: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchGuides();
  }, []);

  useEffect(() => {
    const filtered = guides.filter(guide =>
      guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guide.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredGuides(filtered);
  }, [guides, searchTerm]);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user-guides?includeUnpublished=true');
      
      if (!response.ok) {
        throw new Error('Failed to fetch guides');
      }
      
      const data = await response.json();
      setGuides(data);
    } catch (error) {
      console.error('Error fetching guides:', error);
      toast.error('Failed to load user guides');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }
    
    if (!editingGuide && !formData.id.trim()) {
      newErrors.id = 'ID is required';
    }
    
    if (!editingGuide && formData.id && !/^[a-z0-9-]+$/.test(formData.id)) {
      newErrors.id = 'ID must contain only lowercase letters, numbers, and hyphens';
    }
    
    if (!editingGuide && guides.some(guide => guide.id === formData.id)) {
      newErrors.id = 'This ID already exists';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      const url = editingGuide ? `/api/user-guides/${editingGuide.id}` : '/api/user-guides';
      const method = editingGuide ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        role: formData.role === 'all' ? null : formData.role,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(editingGuide ? 'Failed to update guide' : 'Failed to create guide');
      }

      toast.success(editingGuide ? 'Guide updated successfully' : 'Guide created successfully');
      setShowForm(false);
      setEditingGuide(null);
      resetForm();
      fetchGuides();
    } catch (error) {
      console.error('Error saving guide:', error);
      toast.error(editingGuide ? 'Failed to update guide' : 'Failed to create guide');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (guide: Guide) => {
    setEditingGuide(guide);
    setFormData({
      id: guide.id,
      title: guide.title,
      description: guide.description,
      role: guide.role || 'all',
      content: guide.content,
      isPublished: guide.isPublished,
      sortOrder: guide.sortOrder,
    });
    setShowForm(true);
    setErrors({});
  };

  const handleDelete = async (guide: Guide) => {
    if (!confirm(`Are you sure you want to delete "${guide.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/user-guides/${guide.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete guide');
      }

      toast.success('Guide deleted successfully');
      fetchGuides();
    } catch (error) {
      console.error('Error deleting guide:', error);
      toast.error('Failed to delete guide');
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      description: '',
      role: 'all',
      content: sampleMarkdown,
      isPublished: false,
      sortOrder: 0,
    });
    setErrors({});
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingGuide(null);
    resetForm();
  };

  const getRoleBadge = (role: string | null) => {
    if (!role) {
      return <Badge variant="secondary">General</Badge>;
    }
    
    const roleOption = roleOptions.find(option => option.value === role);
    return <Badge variant="outline">{roleOption?.label || role}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading user guides...</span>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {editingGuide ? 'Edit User Guide' : 'Create New User Guide'}
              </CardTitle>
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
            <CardDescription>
              {editingGuide 
                ? 'Update the user guide content and settings'
                : 'Create a new user guide with markdown content'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="id">Guide ID {!editingGuide && '*'}</Label>
                  <Input
                    id="id"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    placeholder="e.g., requestor-submit-aft"
                    disabled={editingGuide !== null}
                    className={errors.id ? 'border-red-500' : ''}
                  />
                  {errors.id && <p className="text-sm text-red-600">{errors.id}</p>}
                  {!editingGuide && (
                    <p className="text-sm text-muted-foreground">
                      URL-friendly ID using lowercase letters, numbers, and hyphens only
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Target Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., How to Submit an AFT Request"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of what this guide covers"
                  className={errors.description ? 'border-red-500' : ''}
                  rows={3}
                />
                {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  <p className="text-sm text-muted-foreground">
                    Lower numbers appear first in the list
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="published"
                      checked={formData.isPublished}
                      onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
                    />
                    <Label htmlFor="published">Published</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Only published guides are visible to users
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content (Markdown) *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your guide content in Markdown format..."
                  className={`font-mono text-sm ${errors.content ? 'border-red-500' : ''}`}
                  rows={20}
                />
                {errors.content && <p className="text-sm text-red-600">{errors.content}</p>}
                <p className="text-sm text-muted-foreground">
                  Use Markdown syntax for formatting. Supports headings, lists, code blocks, tables, and more.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-4">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingGuide ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {editingGuide ? 'Update Guide' : 'Create Guide'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                User Guides Management
              </CardTitle>
              <CardDescription>
                Create and manage user guides with markdown content
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Guide
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search guides..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Guides List */}
      <div className="grid gap-4">
        {filteredGuides.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No guides found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms.'
                  : 'Get started by creating your first user guide.'
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Guide
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredGuides.map((guide) => (
            <Card key={guide.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{guide.title}</CardTitle>
                      {getRoleBadge(guide.role)}
                      {!guide.isPublished && (
                        <Badge variant="secondary">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Draft
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{guide.description}</CardDescription>
                    <div className="text-sm text-muted-foreground">
                      ID: <code className="bg-muted px-1 py-0.5 rounded text-xs">{guide.id}</code> • 
                      Updated {new Date(guide.updatedAt).toLocaleDateString()} • 
                      Sort: {guide.sortOrder}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/user-guides/${guide.id}`} target="_blank">
                        <Eye className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(guide)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(guide)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}