'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BookOpen, 
  CheckCircle, 
  Send, 
  Archive,
  Search,
  Clock,
  Shield,
  Users,
  UserCheck,
  Database,
  ArrowRight,
  Loader2,
  type LucideIcon
} from 'lucide-react';
import Link from 'next/link';

interface Guide {
  id: string;
  title: string;
  description: string;
  role: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByLastName: string;
}

const roleIcons: Record<string, LucideIcon> = {
  requestor: Send,
  approver: CheckCircle,
  dao: Shield,
  cpso: Shield,
  admin: Users,
  media_custodian: Archive,
  dta: Database,
  sme: UserCheck,
};

const roleColors: Record<string, string> = {
  requestor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  approver: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  dao: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  cpso: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  media_custodian: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  dta: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  sme: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

const roleLabels: Record<string, string> = {
  requestor: 'Requestor',
  approver: 'Approver',
  dao: 'DAO',
  cpso: 'CPSO',
  admin: 'Administrator',
  media_custodian: 'Media Custodian',
  dta: 'DTA',
  sme: 'SME',
};

export default function UserGuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [filteredGuides, setFilteredGuides] = useState<Guide[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user-guides');
      
      if (!response.ok) {
        throw new Error('Failed to fetch guides');
      }
      
      const data = await response.json();
      setGuides(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching guides:', err);
      setError('Failed to load user guides');
    } finally {
      setLoading(false);
    }
  };

  const filterGuides = useCallback(() => {
    let filtered = guides;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(guide =>
        guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guide.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by role
    if (selectedRole !== 'all') {
      filtered = filtered.filter(guide => 
        selectedRole === 'general' 
          ? guide.role === null 
          : guide.role === selectedRole
      );
    }

    setFilteredGuides(filtered);
  }, [guides, searchTerm, selectedRole]);

  useEffect(() => {
    fetchGuides();
  }, []);

  useEffect(() => {
    filterGuides();
  }, [filterGuides]);

  const getRoleIcon = (role: string | null) => {
    if (!role) return BookOpen;
    return roleIcons[role] || BookOpen;
  };

  const getRoleBadge = (role: string | null) => {
    if (!role) {
      return (
        <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
          General
        </Badge>
      );
    }

    const colorClass = roleColors[role] || 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
    const label = roleLabels[role] || role.toUpperCase();

    return <Badge className={colorClass}>{label}</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading user guides...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            {error}
          </div>
          <Button onClick={fetchGuides} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <BookOpen className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">User Guides</h1>
        </div>
        <p className="text-muted-foreground">
          Step-by-step guides to help you navigate the AFT system efficiently.
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search guides..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="requestor">Requestor</SelectItem>
            <SelectItem value="approver">Approver</SelectItem>
            <SelectItem value="dao">DAO</SelectItem>
            <SelectItem value="cpso">CPSO</SelectItem>
            <SelectItem value="admin">Administrator</SelectItem>
            <SelectItem value="media_custodian">Media Custodian</SelectItem>
            <SelectItem value="dta">DTA</SelectItem>
            <SelectItem value="sme">SME</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          {filteredGuides.length} {filteredGuides.length === 1 ? 'guide' : 'guides'} found
        </p>
      </div>

      {/* Guides grid */}
      {filteredGuides.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No guides found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedRole !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'No user guides are currently available.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuides.map((guide) => {
            const Icon = getRoleIcon(guide.role);
            
            return (
              <Card key={guide.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 mb-2">
                      <Icon className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{guide.title}</CardTitle>
                    </div>
                    {getRoleBadge(guide.role)}
                  </div>
                  <CardDescription className="line-clamp-3">
                    {guide.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Updated {new Date(guide.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/user-guides/${guide.id}`} className="flex items-center space-x-1">
                        <span>View Guide</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}