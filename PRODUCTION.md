# Production Deployment Guide

## Overview

This guide covers deploying the AFT Form Web application in a production environment using PM2 with enterprise-grade logging and monitoring.

## Prerequisites

- Node.js 18+ installed
- PM2 installed globally: `npm install -g pm2`
- Production server with appropriate security configurations
- SSL/TLS certificates configured

## Production Setup

### 1. Environment Configuration

Copy the production environment template:
```bash
cp .env.production.template .env.production
```

Edit `.env.production` with your production values:
- Generate a strong JWT secret (512+ characters)
- Configure database path
- Set up SMTP for notifications (optional)
- Configure security settings

### 2. Build Application

```bash
npm run build
```

### 3. Database Setup

Initialize production database:
```bash
npm run db:migrate
npm run db:init
```

### 4. Start with PM2

Start the application with PM2 (2 instances):
```bash
npm run pm2:start
```

Alternative PM2 commands:
```bash
# Start with specific environment
pm2 start ecosystem.config.js --env production

# Reload (zero-downtime)
npm run pm2:reload

# Stop
npm run pm2:stop

# View logs
npm run pm2:logs

# Monitor
npm run pm2:monit
```

## Logging

### Winston Logging Levels

The application uses DOD-compliant logging levels:

- **emergency**: System unusable
- **alert**: Action must be taken immediately  
- **critical**: Critical conditions
- **error**: Error conditions
- **warning**: Warning conditions
- **notice**: Normal but significant conditions (security events)
- **info**: Informational messages
- **debug**: Debug-level messages (development only)

### Log Files

Logs are stored in `/logs/` directory:

- `application-YYYY-MM-DD.log` - Application logs (30 day retention)
- `error-YYYY-MM-DD.log` - Error logs (90 day retention)
- `security-YYYY-MM-DD.log` - Security/audit logs (365 day retention)

### PM2 Logs

PM2 process logs are stored in `/pm2-logs/`:

- `combined.log` - Combined PM2 output
- `out.log` - Standard output
- `error.log` - Standard error

## Security Considerations

### Log Security

- Log files contain sensitive audit information
- Ensure proper file permissions: `chmod 640 /logs/*.log`
- Consider log encryption for high-security environments
- Implement log forwarding to centralized SIEM system

### Authentication Logging

All authentication events are logged to security logs:
- Login attempts (successful/failed)
- Privileged actions
- Data access events
- User role changes

### Database Security

- Database file should be secured: `chmod 600 /var/lib/aft-form/aft.db`
- Regular database backups with encryption
- Monitor database access patterns

## Monitoring

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Process status
pm2 status

# Resource usage
pm2 show aft-form-web
```

### Log Monitoring

Monitor security events:
```bash
# Watch security logs
tail -f logs/security-$(date +%Y-%m-%d).log

# Search for failed logins
grep "Failed login attempt" logs/security-*.log

# Monitor privileged actions
grep "PRIVILEGED_ACTION" logs/security-*.log
```

## Backup Strategy

### Database Backup

Create automated backup script:
```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
cp /var/lib/aft-form/aft.db "/backup/aft-db-backup-$DATE.db"
gzip "/backup/aft-db-backup-$DATE.db"
# Keep only last 30 days
find /backup -name "aft-db-backup-*.db.gz" -mtime +30 -delete
```

### Log Backup

Logs are automatically rotated and compressed by Winston.
For additional security, consider:
- Forwarding logs to centralized logging system
- Encrypting archived log files
- Off-site backup of security logs

## Troubleshooting

### Common Issues

1. **Port conflicts**: Check if port 3000 is in use
2. **Permission errors**: Ensure proper file/directory permissions
3. **Database locks**: Check for zombie processes accessing database
4. **Memory issues**: Monitor with `pm2 monit`, adjust `max_memory_restart`

### Log Analysis

Check application logs:
```bash
# Recent errors
grep "ERROR" logs/error-$(date +%Y-%m-%d).log | tail -20

# Authentication issues
grep "Authentication" logs/application-$(date +%Y-%m-%d).log

# Database issues
grep "Database" logs/application-$(date +%Y-%m-%d).log
```

## Performance Optimization

### PM2 Cluster Mode

The application runs in cluster mode with 2 instances for:
- Load distribution
- High availability
- Zero-downtime reloads

### Memory Management

- Monitor memory usage: `pm2 monit`
- Automatic restart at 1GB memory usage
- Node.js optimizations: `--max-old-space-size=2048`

## Compliance

### DOD Requirements

- All security events logged with correlation IDs
- User authentication tracked with IP and user agent
- Privileged actions audited
- Log retention per DOD guidelines
- Secure log storage and access controls

### Audit Trail

Complete audit trail includes:
- User login/logout events
- AFT request creation and modifications
- Chain of custody transfers
- Signature events
- Administrative actions
- Database schema changes

## Maintenance

### Regular Tasks

1. **Daily**: Review security logs for anomalies
2. **Weekly**: Check disk space for logs and database
3. **Monthly**: Review and rotate application logs
4. **Quarterly**: Security audit and access review

### Updates

For zero-downtime updates:
```bash
git pull
npm install
npm run build
npm run pm2:reload
```

## Support

For production issues:
1. Check application logs
2. Review PM2 process status
3. Monitor system resources
4. Check database connectivity