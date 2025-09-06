import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/auth/login'];
  
  // Routes that require authentication but no role check (kept for future use)
  // const authOnlyRoutes = ['/role-selection', '/api/auth/set-role', '/api/auth/me'];
  
  // Role-based route restrictions
  const adminRoutes = ['/admin'];
  const requestorRoutes = ['/requestor'];
  const approverRoutes = ['/approver']; 
  const dtaRoutes = ['/dta'];
  const smeRoutes = ['/sme'];
  const custodianRoutes = ['/custodian'];

  // Check if the route is public
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get('aft-auth-token')?.value;

  // Middleware authentication check

  if (!token) {
    // No token found, redirecting to login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token
  const payload = await verifyToken(token);
  // Token verification completed
  
  if (!payload) {
    // Token invalid, redirecting to login
    
    // Create response and clear the invalid token
    let response;
    if (pathname.startsWith('/api/')) {
      response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } else {
      response = NextResponse.redirect(new URL('/login?session_expired=true', request.url));
    }
    
    // Clear the invalid cookie
    response.cookies.set('aft-auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
      expires: new Date(0),
    });
    
    return response;
  }

  // Get current role - prefer currentRole from token, fallback to primary role
  const currentRole = (payload as { currentRole?: string; role: string }).currentRole || payload.role;
  const userRoles = (payload as { roles?: string[]; role: string }).roles || [payload.role];

  // Check role-based route access
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (currentRole !== 'admin' && !userRoles.includes('admin')) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Check requestor routes
  if (requestorRoutes.some(route => pathname.startsWith(route))) {
    const requestorAllowedRoles = ['requestor', 'admin', 'dta'];
    if (!requestorAllowedRoles.includes(currentRole) && !userRoles.some((role: string) => requestorAllowedRoles.includes(role))) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Check approver routes (DAO, Approver, CPSO)
  if (approverRoutes.some(route => pathname.startsWith(route))) {
    const approverRoles = ['dao', 'approver', 'cpso', 'admin'];
    if (!approverRoles.includes(currentRole) && !userRoles.some((role: string) => approverRoles.includes(role))) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Check DTA routes (DTA, SME, Media Custodian)
  if (dtaRoutes.some(route => pathname.startsWith(route))) {
    const dtaRoles = ['dta', 'sme', 'media_custodian', 'admin'];
    if (!dtaRoles.includes(currentRole) && !userRoles.some((role: string) => dtaRoles.includes(role))) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Check SME routes
  if (smeRoutes.some(route => pathname.startsWith(route))) {
    const smeRoles = ['sme', 'admin'];
    if (!smeRoles.includes(currentRole) && !userRoles.some((role: string) => smeRoles.includes(role))) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Check Custodian routes
  if (custodianRoutes.some(route => pathname.startsWith(route))) {
    const custodianRoles = ['media_custodian', 'admin'];
    if (!custodianRoles.includes(currentRole) && !userRoles.some((role: string) => custodianRoles.includes(role))) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};