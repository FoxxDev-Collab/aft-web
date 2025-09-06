import 'server-only';
import { db } from './db/server';
import { users, userRoles, type UserRoleType } from './db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { appLogger } from './logger';

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
    const roles = await db.select().from(userRoles).where(
      and(eq(userRoles.userId, userId), eq(userRoles.isActive, true))
    );
    return roles.map(r => r.role);
  } catch {
    return [];
  }
}

// Authenticate user against database
export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  try {
    appLogger.info('Authentication attempt', { resource: email });
    
    const user = await db.select().from(users).where(
      and(eq(users.email, email), eq(users.isActive, true))
    ).limit(1);

    if (user.length === 0) {
      appLogger.loginAttempt(false, email, { resource: email });
      return null;
    }

    const isValid = await bcrypt.compare(password, user[0].password);
    if (!isValid) {
      appLogger.loginAttempt(false, email, { 
        resource: email,
        userId: user[0].id.toString()
      });
      return null;
    }

    // Get all roles for this user
    const allRoles = await getUserRoles(user[0].id);
    const primaryRole = user[0].primaryRole;

    const authUser = {
      id: user[0].id,
      email: user[0].email,
      firstName: user[0].firstName,
      lastName: user[0].lastName,
      role: primaryRole, // Primary role for backward compatibility
      primaryRole: primaryRole,
      roles: allRoles.length > 0 ? allRoles : [primaryRole], // All roles
      organization: user[0].organization || undefined,
      phone: user[0].phone || undefined,
    };

    appLogger.loginAttempt(true, email, { 
      resource: email,
      userId: user[0].id.toString()
    });

    return authUser;
  } catch (error) {
    appLogger.error(`Authentication error: ${error instanceof Error ? error.message : String(error)}`, { 
      resource: email
    });
    return null;
  }
}

// Verify user exists and is active (for session validation)
export async function verifyUserExists(userId: number): Promise<AuthUser | null> {
  try {
    const user = await db.select().from(users).where(
      and(eq(users.id, userId), eq(users.isActive, true))
    ).limit(1);

    if (user.length === 0) {
      return null;
    }

    // Get all roles for this user
    const allRoles = await getUserRoles(user[0].id);
    const primaryRole = user[0].primaryRole;

    return {
      id: user[0].id,
      email: user[0].email,
      firstName: user[0].firstName,
      lastName: user[0].lastName,
      role: primaryRole, // Primary role for backward compatibility
      primaryRole: primaryRole,
      roles: allRoles.length > 0 ? allRoles : [primaryRole], // All roles
      organization: user[0].organization || undefined,
      phone: user[0].phone || undefined,
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