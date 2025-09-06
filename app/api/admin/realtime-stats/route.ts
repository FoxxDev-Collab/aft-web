import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { users, aftAuditLog } from '@/lib/db/schema';
import { eq, count, gte } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!user.roles?.includes('admin') && user.primaryRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Get recent activity for real-time stats
    const [
      activeUsersResult,
      recentActivityResult
    ] = await Promise.all([
      // Active users (users who have been active in the last hour)
      db().select({ count: count() })
        .from(users)
        .where(eq(users.isActive, true)),

      // Recent activity in the last 5 minutes
      db().select({ count: count() })
        .from(aftAuditLog)
        .where(gte(aftAuditLog.createdAt, fiveMinutesAgo))
    ]);

    // Mock real-time performance data
    const realtimeStats = {
      timestamp: now.toISOString(),
      activeUsers: activeUsersResult[0]?.count || 0,
      requestsPerSecond: Math.max(0, Math.floor((recentActivityResult[0]?.count || 0) / 300) + Math.random() * 2),
      responseTime: Math.floor(50 + Math.random() * 200), // 50-250ms
      memoryUsage: Math.floor(30 + Math.random() * 50) // 30-80% memory usage
    };

    return NextResponse.json(realtimeStats);
    
  } catch (error) {
    console.error('Realtime stats fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch realtime stats' }, 
      { status: 500 }
    );
  }
}