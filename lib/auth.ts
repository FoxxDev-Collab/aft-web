import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { type UserRoleType } from './db/schema';
import { cookies } from 'next/headers';

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
  role: UserRoleType;
  organization?: string;
}

export interface JWTPayload extends AuthUser {
  iat: number;
  exp: number;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET!, { expiresIn: '24h' });
}

// Verify JWT token (Edge Runtime compatible)
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    // Token verification
    
    // Split the JWT token
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Decode payload
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    
    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new Error('Token expired');
    }

    // Verify signature using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode signature
    const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    
    const isValid = await crypto.subtle.verify('HMAC', key, signature, data);
    
    if (!isValid) {
      throw new Error('Invalid signature');
    }

    // Token verification successful
    return payload as JWTPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Authenticate user (server-only - import from auth-server.ts instead)
export async function authenticate(): Promise<AuthUser | null> {
  // This function should not be used directly - use authenticateUser from auth-server.ts
  throw new Error('Use authenticateUser from lib/auth-server.ts instead');
}

// Set auth cookie
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  });
}

// Remove auth cookie
export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Get current user from cookie (server-only - will be replaced)
export async function getCurrentUser(): Promise<AuthUser | null> {
  // This function should use verifyUserExists from auth-server.ts
  throw new Error('This function needs to be updated to use auth-server.ts');
}

// Get current user from request (for API routes) - will be replaced
export async function getCurrentUserFromRequest(): Promise<AuthUser | null> {
  // This function should use verifyUserExists from auth-server.ts
  throw new Error('This function needs to be updated to use auth-server.ts');
}

// Role-based authorization
export function hasRole(user: AuthUser | null, requiredRoles: UserRoleType[]): boolean {
  if (!user) return false;
  return requiredRoles.includes(user.role);
}

// Check if user can access admin features
export function isAdmin(user: AuthUser | null): boolean {
  return hasRole(user, ['admin']);
}

// Check if user can approve requests
export function canApprove(user: AuthUser | null): boolean {
  return hasRole(user, ['admin', 'dao', 'approver', 'cpso']);
}

// Check if user can perform transfers
export function canTransfer(user: AuthUser | null): boolean {
  return hasRole(user, ['admin', 'dta', 'sme']);
}

// Check if user is SME for technical validation
export function isSME(user: AuthUser | null): boolean {
  return hasRole(user, ['sme']);
}

// Check if user can validate technical aspects
export function canValidateTechnical(user: AuthUser | null): boolean {
  return hasRole(user, ['admin', 'sme']);
}

// Check if user is a media custodian
export function isMediaCustodian(user: AuthUser | null): boolean {
  return hasRole(user, ['media_custodian']);
}

// Check if user can perform final media custody tasks
export function canPerformMediaCustody(user: AuthUser | null): boolean {
  return hasRole(user, ['admin', 'media_custodian']);
}

// Check if user can create requests
export function canCreateRequest(user: AuthUser | null): boolean {
  return hasRole(user, ['admin', 'requestor']);
}