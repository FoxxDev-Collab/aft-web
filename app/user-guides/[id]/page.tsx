'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  BookOpen,
  Clock,
  User,
  Loader2,
  Send,
  CheckCircle,
  Shield,
  Users,
  Archive,
  Database,
  UserCheck,
  type LucideIcon
} from 'lucide-react';
import Link from 'next/link';
import { MarkdownRenderer } from '@/components/markdown-renderer';

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

export default function UserGuidePage({ params }: { params: { id: string } }) {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGuide = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/user-guides/${params.id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Guide not found');
        }
        throw new Error('Failed to fetch guide');
      }
      
      const data = await response.json();
      setGuide(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching guide:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user guide');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchGuide();
  }, [fetchGuide]);

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
            <span>Loading user guide...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            {error || 'Guide not found'}
          </div>
          <div className="space-y-2">
            <Button asChild variant="outline">
              <Link href="/user-guides">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to User Guides
              </Link>
            </Button>
            {error && error !== 'Guide not found' && (
              <Button onClick={fetchGuide} variant="outline">
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const Icon = getRoleIcon(guide.role);

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/user-guides">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Guides
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 mb-2">
                <Icon className="w-8 h-8 text-primary" />
                <CardTitle className="text-2xl">{guide.title}</CardTitle>
              </div>
              {getRoleBadge(guide.role)}
            </div>
            
            <p className="text-muted-foreground text-lg">
              {guide.description}
            </p>

            {/* Metadata */}
            <div className="flex items-center space-x-6 text-sm text-muted-foreground mt-4 pt-4 border-t border-border">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Updated {new Date(guide.updatedAt).toLocaleDateString()}</span>
              </div>
              {guide.createdBy && (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>By {guide.createdBy} {guide.createdByLastName}</span>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-8">
          <MarkdownRenderer content={guide.content} />
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center">
        <Button asChild variant="outline">
          <Link href="/user-guides">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Guides
          </Link>
        </Button>
      </div>
    </div>
  );
}