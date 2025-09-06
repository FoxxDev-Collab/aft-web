'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  User, 
  LogOut, 
  Settings, 
  FileText, 
  Users, 
  CheckCircle, 
  Send,
  Menu,
  X,
  Archive,
  History,
  BookOpen
} from 'lucide-react';
import { AuthUser } from '@/lib/auth';

interface DashboardNavProps {
  user: AuthUser;
}

export function DashboardNav({ user }: DashboardNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' // Ensure cookies are sent
      });
      
      if (!response.ok) {
        throw new Error('Logout request failed');
      }
      
      // Clear all browser storage
      if (typeof window !== 'undefined') {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {
          console.warn('Failed to clear storage:', e);
        }
      }
      
      // Force a hard redirect with cache busting to clear all client-side state
      window.location.href = '/login?logout=true&t=' + Date.now();
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect even if logout API fails
      window.location.href = '/login?logout=true&t=' + Date.now();
    }
  };

  const getNavItems = () => {
    const baseItems = [
      { href: '/dashboard', label: 'Dashboard', icon: FileText },
    ];

    if (user.role === 'requestor' || user.role === 'admin') {
      baseItems.push({ href: '/dashboard/requests', label: 'My Requests', icon: FileText });
      baseItems.push({ href: '/dashboard/request/new', label: 'New Request', icon: Send });
    }

    if (['dao', 'issm', 'cpso'].includes(user.role) || user.role === 'admin') {
      baseItems.push({ href: '/dashboard/approver', label: 'Pending Approvals', icon: CheckCircle });
    }

    if (['dta', 'sme'].includes(user.role) || user.role === 'admin') {
      baseItems.push({ href: '/dashboard/transfers', label: 'Transfers', icon: Send });
    }

    if (user.role === 'media_custodian' || user.role === 'admin') {
      baseItems.push({ href: '/dashboard/custody', label: 'Media Custody', icon: Archive });
    }

    // History page is available to all users
    baseItems.push({ href: '/dashboard/history', label: 'AFT History', icon: History });

    if (user.role === 'admin') {
      baseItems.push({ href: '/dashboard/admin', label: 'User Management', icon: Users });
    }

    return baseItems;
  };

  const navItems = getNavItems();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'dao': return 'bg-blue-100 text-blue-800';
      case 'issm': return 'bg-indigo-100 text-indigo-800';
      case 'cpso': return 'bg-cyan-100 text-cyan-800';
      case 'requestor': return 'bg-green-100 text-green-800';
      case 'dta': return 'bg-purple-100 text-purple-800';
      case 'sme': return 'bg-yellow-100 text-yellow-800';
      case 'media_custodian': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="w-full px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">AFT System</h1>
            </div>
            <div className="hidden sm:flex sm:space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex sm:items-center sm:space-x-4">
            <Badge className={getRoleColor(user.role)}>
              {user.role.toUpperCase().replace('_', ' ')}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="ml-2">
                  <User className="h-5 w-5" />
                  <span className="ml-2 hidden md:inline">{user.firstName} {user.lastName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/user-guides">
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>User Guides</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center sm:hidden">
            <Button 
              variant="ghost" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center">
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </div>
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <Badge className={getRoleColor(user.role)}>
                  {user.role.toUpperCase()}
                </Badge>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  {user.email}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Button 
                variant="ghost" 
                className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4 inline" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}