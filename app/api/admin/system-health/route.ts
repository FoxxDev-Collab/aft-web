import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { users, aftAttachments, aftAuditLog } from '@/lib/db/schema';
import { eq, count, sql, gte, and } from 'drizzle-orm';
import { promisify } from 'util';
import { exec } from 'child_process';
import os from 'os';

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

    // Calculate time thresholds
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const execAsync = promisify(exec);

    // Gather comprehensive system health data
    const [
      databaseHealthResult,
      storageStatsResult,
      performanceStatsResult,
      securityStatsResult,
      systemAlertsResult
    ] = await Promise.all([
      // Database health
      (async () => {
        const startTime = Date.now();
        const connectionCount = await db().select({ count: count() }).from(users);
        const responseTime = Date.now() - startTime;
        
        return {
          status: responseTime < 100 ? 'connected' : responseTime < 500 ? 'slow' : 'disconnected',
          connectionCount: connectionCount[0]?.count || 0,
          responseTime,
          lastBackup: null // This would be implemented based on your backup strategy
        };
      })(),

      // Storage statistics
      (async () => {
        const filesResult = await db().select({
          totalFiles: count(),
          totalSize: sql<number>`sum(file_size)`
        }).from(aftAttachments);
        
        const files = filesResult[0] || { totalFiles: 0, totalSize: 0 };
        
        // Get real filesystem stats
        let totalSpace = 1000 * 1024 * 1024 * 1024; // Default 1TB
        let availableSpace = totalSpace;
        let usedSpace = files.totalSize || 0;
        
        try {
          // Get disk usage for current directory
          const { stdout } = await execAsync('df -B1 .');
          const lines = stdout.trim().split('\n');
          if (lines.length > 1) {
            const parts = lines[1].split(/\s+/);
            if (parts.length >= 4) {
              totalSpace = parseInt(parts[1]) || totalSpace;
              const diskUsedSpace = parseInt(parts[2]) || 0;
              availableSpace = parseInt(parts[3]) || availableSpace;
              
              // Use the larger of database files size or disk used space
              usedSpace = Math.max(diskUsedSpace, files.totalSize || 0);
            }
          }
        } catch (error) {
          console.error('Error getting disk usage:', error);
          // Fall back to database file sizes only
          usedSpace = files.totalSize || 0;
          availableSpace = totalSpace - usedSpace;
        }
        
        return {
          totalSpace,
          usedSpace,
          availableSpace,
          filesCount: files.totalFiles
        };
      })(),

      // Performance statistics
      (async () => {
        const recentActivity = await db().select({
          count: count()
        })
        .from(aftAuditLog)
        .where(gte(aftAuditLog.createdAt, oneHourAgo));

        const requestsPerMinute = Math.floor((recentActivity[0]?.count || 0) / 60);
        
        // Calculate average response time from recent DB queries
        const dbQueryTimes: number[] = [];
        const queryStart = Date.now();
        await db().select({ count: count() }).from(users).limit(1);
        dbQueryTimes.push(Date.now() - queryStart);
        
        const avgResponseTime = dbQueryTimes.length > 0 ? 
          Math.round(dbQueryTimes.reduce((a, b) => a + b, 0) / dbQueryTimes.length) : 150;
        
        // Get real system uptime
        let systemUptime = 0;
        try {
          const uptimeData = os.uptime();
          systemUptime = Math.floor(uptimeData);
        } catch (error) {
          console.error('Error getting system uptime:', error);
          systemUptime = 0;
        }
        
        // Calculate error rate from audit logs (actions that resulted in errors)
        const totalActions = await db().select({ count: count() })
          .from(aftAuditLog)
          .where(gte(aftAuditLog.createdAt, oneDayAgo));
        
        const errorActions = await db().select({ count: count() })
          .from(aftAuditLog)
          .where(and(
            gte(aftAuditLog.createdAt, oneDayAgo),
            sql`action LIKE '%error%' OR action LIKE '%failed%' OR action LIKE '%reject%'`
          ));
        
        const totalCount = totalActions[0]?.count || 0;
        const errorCount = errorActions[0]?.count || 0;
        const errorRate = totalCount > 0 ? Number(((errorCount / totalCount) * 100).toFixed(2)) : 0;
        
        return {
          averageResponseTime: avgResponseTime,
          requestsPerMinute,
          errorRate,
          uptime: systemUptime
        };
      })(),

      // Security statistics
      (async () => {
        const activeUsersResult = await db().select({ count: count() })
          .from(users)
          .where(eq(users.isActive, true));

        // Count failed/suspicious activities from audit logs
        const failedLogins = await db().select({ count: count() })
          .from(aftAuditLog)
          .where(and(
            gte(aftAuditLog.createdAt, oneDayAgo),
            sql`(action LIKE '%login%' AND action LIKE '%failed%') OR (action LIKE '%authentication%' AND action LIKE '%failed%')`
          ));
        
        const suspiciousActivity = await db().select({ count: count() })
          .from(aftAuditLog)
          .where(and(
            gte(aftAuditLog.createdAt, oneDayAgo),
            sql`action LIKE '%suspicious%' OR action LIKE '%unauthorized%' OR action LIKE '%security%'`
          ));
        
        // Get last security-related audit log entry as proxy for security scan
        const lastSecurityScan = await db().select({
          createdAt: aftAuditLog.createdAt
        })
        .from(aftAuditLog)
        .where(sql`action LIKE '%security%' OR action LIKE '%scan%' OR action LIKE '%audit%'`)
        .orderBy(sql`created_at DESC`)
        .limit(1);
        
        return {
          activeUsers: activeUsersResult[0]?.count || 0,
          failedLogins: failedLogins[0]?.count || 0,
          suspiciousActivity: suspiciousActivity[0]?.count || 0,
          lastSecurityScan: lastSecurityScan[0]?.createdAt?.toISOString() || null
        };
      })(),

      // System alerts from audit logs
      (async () => {
        const recentAlerts = await db().select({
          id: aftAuditLog.id,
          action: aftAuditLog.action,
          notes: aftAuditLog.notes,
          createdAt: aftAuditLog.createdAt
        })
        .from(aftAuditLog)
        .where(and(
          gte(aftAuditLog.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)), // Last 7 days
          sql`(action LIKE '%error%' OR action LIKE '%warning%' OR action LIKE '%failed%' OR action LIKE '%rejected%' OR action LIKE '%success%' OR action LIKE '%completed%')`
        ))
        .orderBy(sql`created_at DESC`)
        .limit(10);
        
        return recentAlerts.map((alert) => ({
          id: alert.id,
          type: (
            alert.action.includes('error') || alert.action.includes('failed') ? 'error' :
            alert.action.includes('warning') ? 'warning' :
            alert.action.includes('success') || alert.action.includes('completed') || alert.action.includes('approved') ? 'success' :
            'info'
          ) as 'info' | 'warning' | 'error' | 'success',
          message: alert.notes || `System ${alert.action}`,
          timestamp: alert.createdAt.toISOString(),
          resolved: alert.action.includes('resolved') || alert.action.includes('completed') || alert.action.includes('success')
        }));
      })()
    ]);

    // Determine overall system health
    const overallHealth = (() => {
      if (databaseHealthResult.status === 'disconnected') return 'critical';
      if (databaseHealthResult.responseTime > 500) return 'warning';
      if (storageStatsResult.usedSpace / storageStatsResult.totalSpace > 0.9) return 'warning';
      if (performanceStatsResult.errorRate > 1) return 'warning';
      if (systemAlertsResult.some(alert => !alert.resolved && alert.type === 'error')) return 'critical';
      if (systemAlertsResult.some(alert => !alert.resolved && alert.type === 'warning')) return 'warning';
      return 'healthy';
    })();

    const systemHealth = {
      overall: overallHealth,
      database: databaseHealthResult,
      storage: storageStatsResult,
      performance: performanceStatsResult,
      security: securityStatsResult,
      alerts: systemAlertsResult
    };

    return NextResponse.json(systemHealth);
    
  } catch (error) {
    console.error('System health fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system health data' }, 
      { status: 500 }
    );
  }
}