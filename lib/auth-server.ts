import 'server-only';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db } from '@/lib/db/raw';

type UserRoleType = 'admin' | 'requestor' | 'approver' | 'media_custodian' | 'dao' | 'dta' | 'cpso' | 'sme';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required but not set');
}
const COOKIE_NAME = 'aft-auth-token';

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRoleType; // Primary role for backward compatibility
  primaryRole?: UserRoleType; 
  roles: UserRoleType[]; // All assigned roles
  organization?: string;
  phone?: string;
}

export interface JWTPayload extends AuthUser {
  iat: number;
  exp: number;
}

// Verify JWT token
function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!);
    return decoded as JWTPayload;
  } catch {
    return null;
  }
}

// Get user's roles from userRoles table
async function getUserRoles(userId: number): Promise<UserRoleType[]> {
  try {
    const stmt = db.prepare('SELECT role FROM user_roles WHERE user_id = ? AND is_active = 1');
    const roles = stmt.all(userId) as { role: UserRoleType }[];
    return roles.map(r => r.role);
  } catch {
    return [];
  }
}

// Authenticate user against database
export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  try {
    console.log('Authentication attempt', { resource: email });
    
    const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1');
    const user = stmt.get(email) as { id: number; email: string; password: string; first_name: string; last_name: string; primary_role: string; organization?: string; phone?: string; is_active: number } | undefined;

    if (!user) {
      console.log('Login attempt failed - user not found', { resource: email });
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.log('Login attempt failed - invalid password', { 
        resource: email,
        userId: user.id.toString()
      });
      return null;
    }

    // Get all roles for this user
    const allRoles = await getUserRoles(user.id);
    const primaryRole = user.primary_role;

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: primaryRole as UserRoleType, // Primary role for backward compatibility
      primaryRole: primaryRole as UserRoleType,
      roles: allRoles.length > 0 ? allRoles : [primaryRole as UserRoleType], // All roles
      organization: user.organization || undefined,
      phone: user.phone || undefined,
    };

    console.log('Login attempt successful', { 
      resource: email,
      userId: user.id.toString()
    });

    return authUser;
  } catch (error) {
    console.error(`Authentication error: ${error instanceof Error ? error.message : String(error)}`, { 
      resource: email
    });
    return null;
  }
}

// Verify user exists and is active (for session validation)
export async function verifyUserExists(userId: number): Promise<AuthUser | null> {
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1 LIMIT 1');
    const user = stmt.get(userId) as { id: number; email: string; first_name: string; last_name: string; primary_role: string; organization?: string; phone?: string; is_active: number } | undefined;

    if (!user) {
      return null;
    }

    // Get all roles for this user
    const allRoles = await getUserRoles(user.id);
    const primaryRole = user.primary_role;

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: primaryRole as UserRoleType, // Primary role for backward compatibility
      primaryRole: primaryRole as UserRoleType,
      roles: allRoles.length > 0 ? allRoles : [primaryRole as UserRoleType], // All roles
      organization: user.organization || undefined,
      phone: user.phone || undefined,
    };
  } catch (error) {
    console.error('User verification error:', error);
    return null;
  }
}

// Get current user from cookie (server-side)
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const payload = verifyToken(token);
    if (!payload) {
      return null;
    }

    // Verify user still exists and is active
    return await verifyUserExists(payload.id);
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

// Get current user from request (for API routes)
export async function getCurrentUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const payload = verifyToken(token);
    if (!payload) {
      return null;
    }

    // Verify user still exists and is active
    return await verifyUserExists(payload.id);
  } catch (error) {
    console.error('Get current user from request error:', error);
    return null;
  }
}

// Role-based authorization helpers
export function isAdmin(user: AuthUser | null): boolean {
  return user?.roles?.includes('admin') || user?.role === 'admin';
}

export function canApprove(user: AuthUser | null): boolean {
  if (!user) return false;
  const approvalRoles = ['admin', 'dao', 'approver', 'cpso'];
  return user.roles?.some(role => approvalRoles.includes(role)) || approvalRoles.includes(user.role);
}

export function canTransfer(user: AuthUser | null): boolean {
  if (!user) return false;
  return user.roles?.includes('admin') || user.roles?.includes('dta') || user.role === 'admin' || user.role === 'dta';
}

export function canCreateRequest(user: AuthUser | null): boolean {
  if (!user) return false;
  return user.roles?.includes('admin') || user.roles?.includes('requestor') || user.role === 'admin' || user.role === 'requestor';
}

export function hasRole(user: AuthUser | null, role: UserRoleType): boolean {
  if (!user) return false;
  return user.roles?.includes(role) || user.role === role;
}

export function hasAnyRole(user: AuthUser | null, roles: UserRoleType[]): boolean {
  if (!user) return false;
  return roles.some(role => hasRole(user, role));
}