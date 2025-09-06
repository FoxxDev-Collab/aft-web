# Security Configuration Guide

## 🔒 Critical Security Requirements

### 1. Environment Variables (REQUIRED)

Before deploying to production, you **MUST** set these environment variables:

```bash
# Required - JWT Secret (minimum 512 characters)
JWT_SECRET="your-very-long-random-secure-jwt-secret-key-here-minimum-512-characters"

# Required - Admin credentials
ADMIN_PASSWORD="your-secure-admin-password-here"

# Optional - Admin details
ADMIN_EMAIL="admin@your-domain.com"
ADMIN_FIRST_NAME="Admin"
ADMIN_LAST_NAME="User"
ADMIN_ORGANIZATION="Your Organization"
ADMIN_PHONE="555-0000"

# Database (SQLite file path)
DATABASE_URL="./aft.db"
```

### 2. Security Features Implemented

#### Authentication & Authorization
- ✅ JWT-based authentication with secure HttpOnly cookies
- ✅ Role-based access control (RBAC)
- ✅ Bcrypt password hashing (cost factor: 12)
- ✅ Middleware protection for all routes
- ✅ Session timeout and secure cookie settings

#### Data Protection
- ✅ Input validation with Zod schemas
- ✅ SQL injection prevention via Drizzle ORM
- ✅ XSS protection via React's built-in sanitization
- ✅ CSRF protection through SameSite cookies

#### Logging & Monitoring
- ✅ Structured security logging with Winston
- ✅ Request correlation IDs
- ✅ User action audit trail
- ✅ Error handling without information leakage

### 3. Role-Based Permissions

| Role | Permissions |
|------|-------------|
| `admin` | Full system access, user management |
| `requestor` | Create/edit own requests |
| `dao` | Approve requests (Data Access Officer) |
| `issm` | Approve requests (Information Systems Security Manager) |
| `cpso` | Approve requests (Cyber Protection Systems Officer) |
| `dta` | Transfer operations (Data Transfer Agent) |
| `sme` | Subject matter expert review |
| `media_custodian` | Media handling and disposition |

### 4. Security Best Practices

#### Production Deployment
1. **Never use default passwords**
2. **Generate strong JWT secrets** (512+ characters)
3. **Use HTTPS only** in production
4. **Set secure cookie flags** (already configured)
5. **Regular security updates** for dependencies

#### Database Security
- SQLite database with proper file permissions
- Prepared statements prevent SQL injection
- Data validation at API and database level
- Audit logging for sensitive operations

#### Input Validation
All user inputs are validated using:
- Zod schemas for type safety
- Server-side validation on all endpoints
- Client-side validation for UX
- Sanitization of all outputs

### 5. Security Headers

The following security headers are set:
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

### 6. Development vs Production

#### Development Mode
- Console logging enabled for debugging
- Less restrictive CORS (localhost)
- Source maps enabled

#### Production Mode
- Console logging disabled
- Strict CORS policy
- Source maps disabled
- Secure cookie settings enforced

### 7. Security Incident Response

If you suspect a security issue:
1. **Immediate**: Revoke affected user sessions
2. **Review**: Check audit logs for suspicious activity  
3. **Update**: Change JWT secrets and admin passwords
4. **Monitor**: Increase logging and monitoring

### 8. Regular Security Maintenance

- [ ] Update dependencies monthly
- [ ] Review user permissions quarterly  
- [ ] Rotate JWT secrets annually
- [ ] Security audit annually
- [ ] Backup database daily with encryption

## 🚨 Security Warnings

- **Do NOT** commit `.env` files to version control
- **Do NOT** use default passwords in production
- **Do NOT** disable authentication middleware
- **Do NOT** expose database files to web server
- **Do NOT** log sensitive data (passwords, tokens, PII)

## Contact

For security issues, contact: security@your-domain.com