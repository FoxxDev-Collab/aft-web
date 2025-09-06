import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth-server';
import { generateToken } from '@/lib/auth';
import { loginSchema } from '@/lib/db/schema';

export const runtime = 'nodejs';

function getRoleRedirect(role: string): string {
  // Map roles to their appropriate paths
  const roleRedirectMap: Record<string, string> = {
    'admin': '/admin',
    'requestor': '/requestor',
    'dao': '/approver',
    'approver': '/approver',
    'cpso': '/approver',
    'dta': '/dta',
    'sme': '/sme',
    'media_custodian': '/custodian'
  };
  
  return roleRedirectMap[role] || '/dashboard';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const { email, password } = loginSchema.parse(body);
    
    console.log('Attempting to authenticate user:', email);
    
    // Authenticate user
    const user = await authenticateUser(email, password);
    
    if (!user) {
      console.log('Authentication failed for:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    console.log('Authentication successful for:', user.email, 'Roles:', user.roles);
    
    // Generate JWT token
    const token = generateToken(user);
    console.log('Generated token length:', token.length);
    
    // Check if user has multiple active roles
    const activeRoles = user.roles || [user.role];
    const hasMultipleRoles = activeRoles.length > 1;
    
    // Create response
    const response = NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        primaryRole: user.primaryRole,
        roles: user.roles,
        organization: user.organization,
      },
      hasMultipleRoles,
      redirectTo: hasMultipleRoles ? '/role-selection' : getRoleRedirect(user.role)
    });
    
    // Set auth cookie
    response.cookies.set('aft-auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });
    
    console.log('Cookie set successfully');
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}