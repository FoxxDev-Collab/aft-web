import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { users, aftRequests, aftAuditLog, aftAttachments, userRoles } from '@/lib/db/schema';
import { eq, count, desc, sql } from 'drizzle-orm';

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

    // Get comprehensive dashboard statistics
    const [
      totalRequestsResult,
      requestsByStatusResult,
      requestsByTypeResult,
      userStatsResult,
      usersByRoleResult,
      totalFilesResult,
      recentActivityResult
    ] = await Promise.all([
      // Total requests with status breakdown
      db().select({
        total: count(),
        status: aftRequests.status
      })
        .from(aftRequests)
        .groupBy(aftRequests.status),

      // Requests by status (more detailed)
      db().select({
        status: aftRequests.status,
        count: count()
      })
        .from(aftRequests)
        .groupBy(aftRequests.status),

      // Requests by transfer type
      db().select({
        type: aftRequests.transferType,
        count: count()
      })
        .from(aftRequests)
        .groupBy(aftRequests.transferType),

      // User statistics
      db().select({
        total: count(),
        active: sql<number>`sum(case when is_active = 1 then 1 else 0 end)`
      })
        .from(users),

      // Users by role
      db().select({
        role: userRoles.role,
        count: count()
      })
        .from(userRoles)
        .where(eq(userRoles.isActive, true))
        .groupBy(userRoles.role),

      // Total files
      db().select({
        total: count()
      })
        .from(aftAttachments),

      // Recent activity from audit log
      db().select({
        id: aftAuditLog.id,
        action: aftAuditLog.action,
        userId: aftAuditLog.userId,
        requestId: aftAuditLog.requestId,
        oldStatus: aftAuditLog.oldStatus,
        newStatus: aftAuditLog.newStatus,
        notes: aftAuditLog.notes,
        createdAt: aftAuditLog.createdAt,
        // User info
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
        // Request info
        requestNumber: aftRequests.requestNumber
      })
        .from(aftAuditLog)
        .innerJoin(users, eq(aftAuditLog.userId, users.id))
        .leftJoin(aftRequests, eq(aftAuditLog.requestId, aftRequests.id))
        .orderBy(desc(aftAuditLog.createdAt))
        .limit(20)
    ]);

    // Process the results
    const totalRequests = totalRequestsResult.reduce((sum, row) => sum + row.total, 0);
    
    const statusCounts = totalRequestsResult.reduce((acc, row) => {
      acc[row.status] = row.total;
      return acc;
    }, {} as Record<string, number>);

    const activeRequests = (statusCounts.submitted || 0) + 
                          (statusCounts.pending_dao || 0) + 
                          (statusCounts.pending_approver || 0) + 
                          (statusCounts.pending_cpso || 0) + 
                          (statusCounts.approved || 0) + 
                          (statusCounts.active_transfer || 0) + 
                          (statusCounts.pending_dta || 0) + 
                          (statusCounts.pending_sme || 0) + 
                          (statusCounts.pending_media_custodian || 0);

    const completedRequests = (statusCounts.completed || 0) + (statusCounts.disposed || 0);
    const rejectedRequests = (statusCounts.rejected || 0) + (statusCounts.cancelled || 0);

    const requestsByStatus = requestsByStatusResult.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {} as Record<string, number>);

    const requestsByType = requestsByTypeResult.reduce((acc, row) => {
      acc[row.type] = row.count;
      return acc;
    }, {} as Record<string, number>);

    const usersByRole = usersByRoleResult.reduce((acc, row) => {
      acc[row.role] = row.count;
      return acc;
    }, {} as Record<string, number>);

    const userStats = userStatsResult[0];
    const totalFiles = totalFilesResult[0]?.total || 0;

    // Format recent activity
    const recentActivity = recentActivityResult.map(activity => ({
      id: activity.id,
      action: activity.action,
      userId: activity.userId,
      userName: activity.userName,
      userEmail: activity.userEmail,
      requestId: activity.requestId,
      requestNumber: activity.requestNumber,
      oldStatus: activity.oldStatus,
      newStatus: activity.newStatus,
      timestamp: activity.createdAt.toISOString(),
      details: activity.notes
    }));

    // Determine system health based on various factors
    const systemHealth = 'healthy'; // This could be enhanced with actual health checks

    const dashboardData = {
      totalRequests,
      activeRequests,
      completedRequests,
      rejectedRequests,
      totalUsers: userStats?.total || 0,
      activeUsers: userStats?.active || 0,
      totalFiles,
      systemHealth,
      recentActivity,
      requestsByStatus,
      requestsByType,
      usersByRole
    };

    return NextResponse.json(dashboardData);
    
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' }, 
      { status: 500 }
    );
  }
}