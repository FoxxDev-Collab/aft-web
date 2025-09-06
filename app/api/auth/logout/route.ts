import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  try {
    // Create response
    const response = NextResponse.json({ success: true });
    
    // Remove auth cookie with multiple approaches to ensure it's cleared
    response.cookies.set('aft-auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
      expires: new Date(0), // Set expiration to epoch
    });
    
    // Also try to delete the cookie explicitly
    response.cookies.delete('aft-auth-token');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}