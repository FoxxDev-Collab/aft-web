import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { users, aftRequests, aftAuditLog, aftAttachments, AFTStatusType } from '@/lib/db/schema';
import { eq, desc, and, inArray, SQL } from 'drizzle-orm';

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
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query conditions  
    const conditions: SQL[] = [];
    if (status && status !== 'all') {
      conditions.push(eq(aftRequests.status, status as AFTStatusType));
    }
    if (type && type !== 'all') {
      conditions.push(eq(aftRequests.transferType, type));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // Get requests with creator information
    const requestsQuery = db()
      .select({
        id: aftRequests.id,
        requestNumber: aftRequests.requestNumber,
        status: aftRequests.status,
        transferType: aftRequests.transferType,
        classification: aftRequests.classification,
        createdAt: aftRequests.createdAt,
        updatedAt: aftRequests.updatedAt,
        requestorId: aftRequests.requestorId,
        // Creator info
        creatorFirstName: users.firstName,
        creatorLastName: users.lastName,
        creatorEmail: users.email,
        creatorRole: users.primaryRole,
      })
      .from(aftRequests)
      .innerJoin(users, eq(aftRequests.requestorId, users.id))
      .where(whereCondition)
      .orderBy(desc(aftRequests.createdAt))
      .limit(limit);

    const requests = await requestsQuery;

    // Apply search filter
    let filteredRequests = requests;
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredRequests = requests.filter(request =>
        request.requestNumber.toLowerCase().includes(searchTerm) ||
        `${request.creatorFirstName} ${request.creatorLastName}`.toLowerCase().includes(searchTerm)
      );
    }

    // Get detailed lifecycle data for each request
    const requestIds = filteredRequests.map(r => r.id);
    
    const [auditLogsData, attachmentsData] = await Promise.all([
      // Get audit logs for these requests
      requestIds.length > 0 ? db()
        .select({
          id: aftAuditLog.id,
          requestId: aftAuditLog.requestId,
          action: aftAuditLog.action,
          oldStatus: aftAuditLog.oldStatus,
          newStatus: aftAuditLog.newStatus,
          userId: aftAuditLog.userId,
          notes: aftAuditLog.notes,
          createdAt: aftAuditLog.createdAt,
          // User info
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userRole: users.primaryRole,
        })
        .from(aftAuditLog)
        .innerJoin(users, eq(aftAuditLog.userId, users.id))
        .where(inArray(aftAuditLog.requestId, requestIds))
        .orderBy(desc(aftAuditLog.createdAt)) : [],

      // Get file attachments for these requests
      requestIds.length > 0 ? db()
        .select({
          id: aftAttachments.id,
          requestId: aftAttachments.requestId,
          fileName: aftAttachments.fileName,
          originalName: aftAttachments.originalName,
          fileSize: aftAttachments.fileSize,
          uploadedBy: aftAttachments.uploadedBy,
          createdAt: aftAttachments.createdAt,
        })
        .from(aftAttachments)
        .where(inArray(aftAttachments.requestId, requestIds))
        .orderBy(desc(aftAttachments.createdAt)) : []
    ]);

    // Process the data to create comprehensive request summaries
    const requestSummaries = filteredRequests.map(request => {
      // Get audit logs for this request
      const requestAuditLogs = auditLogsData.filter(log => log.requestId === request.id);
      
      // Get file attachments for this request
      const requestAttachments = attachmentsData.filter(att => att.requestId === request.id);

      // Calculate timeline with durations
      const timeline = requestAuditLogs.map((log, index) => {
        const nextLog = requestAuditLogs[index - 1]; // Previous in time (more recent)
        const duration = nextLog ? 
          (new Date(nextLog.createdAt).getTime() - new Date(log.createdAt).getTime()) / (1000 * 60) : // Duration in minutes
          undefined;

        // Find associated files for file-related actions
        const associatedFiles = log.action.includes('file') ? 
          requestAttachments.filter(att => 
            Math.abs(new Date(att.createdAt).getTime() - new Date(log.createdAt).getTime()) < 60000 // Within 1 minute
          ).map(att => ({
            id: att.id,
            fileName: att.originalName,
            fileSize: att.fileSize,
            action: log.action.includes('upload') ? 'uploaded' as const : 
                   log.action.includes('download') ? 'downloaded' as const : 'deleted' as const
          })) : undefined;

        return {
          id: log.id,
          requestId: log.requestId,
          action: log.action,
          oldStatus: log.oldStatus,
          newStatus: log.newStatus,
          userId: log.userId,
          userName: `${log.userFirstName} ${log.userLastName}`,
          userRole: log.userRole,
          timestamp: log.createdAt.toISOString(),
          notes: log.notes,
          duration,
          files: associatedFiles
        };
      }).reverse(); // Reverse to show chronological order

      // Calculate total duration and average stage time
      const totalDuration = timeline.length > 0 ? 
        (new Date().getTime() - new Date(request.createdAt).getTime()) / (1000 * 60) : 0;
      
      const validDurations = timeline.filter(t => t.duration).map(t => t.duration!);
      const averageStageTime = validDurations.length > 0 ? 
        validDurations.reduce((sum, duration) => sum + duration, 0) / validDurations.length : 0;

      // Mock assigned users data (in a real system, this would come from the database)
      const assignedUsers = [
        { role: 'dta', userId: request.requestorId, userName: `${request.creatorFirstName} ${request.creatorLastName}` },
        // Add more assigned users based on your schema
      ];

      return {
        id: request.id,
        requestNumber: request.requestNumber,
        status: request.status,
        transferType: request.transferType,
        classification: request.classification,
        createdAt: request.createdAt.toISOString(),
        createdBy: {
          id: request.requestorId,
          name: `${request.creatorFirstName} ${request.creatorLastName}`,
          email: request.creatorEmail,
          role: request.creatorRole,
        },
        assignedUsers,
        timeline,
        totalDuration,
        averageStageTime
      };
    });

    return NextResponse.json({
      requests: requestSummaries,
      total: requestSummaries.length
    });
    
  } catch (error) {
    console.error('Request lifecycle fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request lifecycle data' }, 
      { status: 500 }
    );
  }
}