import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { users, aftRequests, aftAuditLog } from '@/lib/db/schema';
import { eq, desc, and, gte, lte, sql, SQL } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!user.roles?.includes('admin') && user.primaryRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Extract filters
    const search = searchParams.get('search');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const requestId = searchParams.get('requestId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const isExport = searchParams.get('export') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build the base query conditions
    const conditions: SQL[] = [];

    if (action) {
      conditions.push(eq(aftAuditLog.action, action));
    }

    if (userId) {
      conditions.push(eq(aftAuditLog.userId, parseInt(userId)));
    }

    if (requestId) {
      conditions.push(eq(aftAuditLog.requestId, parseInt(requestId)));
    }

    if (startDate) {
      conditions.push(gte(aftAuditLog.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(aftAuditLog.createdAt, new Date(endDate)));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // Get audit logs with user and request information
    const auditLogsQuery = db()
      .select({
        id: aftAuditLog.id,
        action: aftAuditLog.action,
        userId: aftAuditLog.userId,
        requestId: aftAuditLog.requestId,
        oldStatus: aftAuditLog.oldStatus,
        newStatus: aftAuditLog.newStatus,
        changes: aftAuditLog.changes,
        notes: aftAuditLog.notes,
        createdAt: aftAuditLog.createdAt,
        // User information
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
        userRole: users.primaryRole,
        // Request information
        requestNumber: aftRequests.requestNumber,
      })
      .from(aftAuditLog)
      .innerJoin(users, eq(aftAuditLog.userId, users.id))
      .leftJoin(aftRequests, eq(aftAuditLog.requestId, aftRequests.id))
      .where(whereCondition)
      .orderBy(desc(aftAuditLog.createdAt));

    // Apply limit and offset for pagination (not for export)
    const logs = isExport 
      ? await auditLogsQuery
      : await auditLogsQuery.limit(limit).offset(offset);

    // Apply search filter (client-side for now, could be moved to DB)
    let filteredLogs = logs;
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredLogs = logs.filter(log =>
        log.userName.toLowerCase().includes(searchTerm) ||
        log.userEmail.toLowerCase().includes(searchTerm) ||
        (log.requestNumber && log.requestNumber.toLowerCase().includes(searchTerm)) ||
        log.action.toLowerCase().includes(searchTerm) ||
        (log.notes && log.notes.toLowerCase().includes(searchTerm))
      );
    }

    // If export is requested, return CSV
    if (isExport) {
      const csvHeaders = [
        'Timestamp',
        'Action',
        'User Name',
        'User Email',
        'User Role',
        'Request Number',
        'Old Status',
        'New Status',
        'Notes',
        'Changes'
      ];

      const csvRows = filteredLogs.map(log => [
        log.createdAt.toISOString(),
        log.action,
        log.userName,
        log.userEmail,
        log.userRole,
        log.requestNumber || '',
        log.oldStatus || '',
        log.newStatus || '',
        log.notes || '',
        log.changes || ''
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => 
          row.map(cell => 
            typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
              ? `"${cell.replace(/"/g, '""')}"` 
              : cell
          ).join(',')
        )
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Get additional data for filters (unique users and actions)
    const [allUsers, allActions] = await Promise.all([
      db().select({
        id: users.id,
        name: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      })
        .from(users)
        .where(eq(users.isActive, true))
        .orderBy(users.firstName, users.lastName),
      
      db().select({
        action: aftAuditLog.action
      })
        .from(aftAuditLog)
        .groupBy(aftAuditLog.action)
        .orderBy(aftAuditLog.action)
    ]);

    const response = {
      logs: filteredLogs.map(log => ({
        id: log.id,
        action: log.action,
        userId: log.userId,
        userName: log.userName,
        userEmail: log.userEmail,
        userRole: log.userRole,
        requestId: log.requestId,
        requestNumber: log.requestNumber,
        oldStatus: log.oldStatus,
        newStatus: log.newStatus,
        changes: log.changes,
        notes: log.notes,
        timestamp: log.createdAt.toISOString(),
      })),
      users: allUsers,
      actions: allActions.map(a => a.action),
      pagination: {
        limit,
        offset,
        total: logs.length,
        hasMore: logs.length === limit
      }
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' }, 
      { status: 500 }
    );
  }
}