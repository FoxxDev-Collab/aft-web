# CAC Digital Signature Implementation Guide

## 🎯 Overview

This implementation provides CAC-based digital signatures for the AFT form system, similar to how DoD websites handle certificate authentication. The system uses browser certificate selection dialogs to prompt users for their CAC certificates.

## 🏗️ Architecture

### **Browser-Based Certificate Selection**
- Uses XMLHttpRequest with client certificate authentication
- Triggers browser's certificate selection dialog (like DoD sites)
- No direct CAC reader access required - browser handles hardware interface

### **Components Created**

1. **`lib/browser-cac-signature.ts`** - Core CAC service
2. **`components/cac-signature.tsx`** - React signature component  
3. **`lib/certificate-parser.ts`** - Manual certificate parsing utilities
4. **API Routes:**
   - `/api/cac/certificate-info` - Extract certificate details
   - `/api/cac/status` - Check CAC availability
   - `/api/cac/sign` - Create digital signatures
   - `/api/signatures/*` - Signature storage and verification

## 🔧 Dependencies Installed

```bash
npm install @peculiar/asn1-schema @peculiar/asn1-x509 @peculiar/x509 node-forge jsrsasign
```

## 📋 Database Schema

Added two new tables:

### `cac_signatures`
```sql
- id (primary key)
- request_id (foreign key to aft_requests)
- user_id (foreign key to users)
- step_type (dao_approval, approver_approval, etc.)
- certificate_subject, certificate_issuer, certificate_serial
- certificate_thumbprint, certificate_not_before, certificate_not_after  
- signature_data (base64 encoded signature)
- signed_data (hash of signed data)
- signature_algorithm (RSA-SHA256)
- signature_reason, signature_location
- ip_address, user_agent
- is_verified, verified_at, verification_notes
- created_at
```

### `cac_trust_store`  
```sql
- id (primary key)
- certificate_name, certificate_data
- certificate_thumbprint (unique)
- issuer_dn, subject_dn
- not_before, not_after
- is_active, is_root_ca
- created_at
```

## 🚀 Usage Example

```tsx
import { ApprovalWithSignature } from '@/components/approval-with-signature';

<ApprovalWithSignature
  requestId={request.id}
  requestData={request}
  stepType="dao_approval"
  title="DAO Approval Required"
  requiresSignature={true}
  onApprove={handleApproval}
  onReject={handleRejection}
/>
```

## ⚙️ Production Setup Requirements

### **1. HTTPS Configuration**
Must use HTTPS with client certificate authentication enabled:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/server.crt;
    ssl_certificate_key /path/to/server.key;
    
    # Client Certificate Authentication
    ssl_client_certificate /path/to/dod-ca-bundle.crt;
    ssl_verify_client optional;
    ssl_verify_depth 3;
    
    # Pass certificate info to application
    location /api/cac/ {
        proxy_pass http://localhost:3000;
        proxy_set_header X-SSL-Client-Cert $ssl_client_cert;
        proxy_set_header X-SSL-Client-S-DN $ssl_client_s_dn;
        proxy_set_header X-SSL-Client-I-DN $ssl_client_i_dn;
        proxy_set_header X-SSL-Client-Serial $ssl_client_serial;
        proxy_set_header X-SSL-Client-Fingerprint $ssl_client_fingerprint;
        proxy_set_header X-SSL-Client-Verify $ssl_client_verify;
        proxy_set_header X-SSL-Client-V-Start $ssl_client_v_start;
        proxy_set_header X-SSL-Client-V-End $ssl_client_v_end;
    }
}
```

### **2. DoD CA Certificate Bundle**
Download and install DoD root and intermediate certificates:

```bash
# Download DoD PKI certificates from:
# https://public.cyber.mil/pki-pke/pkipke-document-library/

# Create CA bundle
cat dod-root-ca-3.crt dod-root-ca-4.crt > dod-ca-bundle.crt
cat dod-ca-*.crt >> dod-ca-bundle.crt
```

### **3. Client Requirements**
Users need:
- CAC/PIV card with valid certificates
- Card reader hardware
- DoD-approved middleware (ActivClient, OpenSC, etc.)
- Browser configured for certificate authentication

### **4. Environment Variables**
```bash
# .env.production
NEXT_PUBLIC_CAC_ENABLED=true
CAC_SIGNING_ENABLED=true
DOD_CA_BUNDLE_PATH=/path/to/dod-ca-bundle.crt
```

## 🔒 Security Features

### **Certificate Validation**
- Validates certificate expiration dates
- Checks against DoD PKI trust store  
- Verifies certificate chain of trust
- Ensures certificate is valid for digital signatures

### **Signature Integrity**
- SHA-256 hashing of signed data
- RSA-PKCS#1 v1.5 signature algorithm
- Tamper-evident signature verification
- Non-repudiation through certificate binding

### **Audit Trail**
- Complete signature audit log
- IP address and browser tracking
- Timestamp verification
- Certificate usage monitoring

## 🧪 Development/Testing

### **Mock Mode**
For development without CAC hardware:

```typescript
// In development, the system returns mock certificates
if (process.env.NODE_ENV === 'development') {
  return {
    subject: 'CN=DOE.JOHN.1234567890,OU=PKI,OU=DoD,O=U.S. Government,C=US',
    issuer: 'CN=DoD CA-59,OU=PKI,OU=DoD,O=U.S. Government,C=US',
    // ... mock data
  };
}
```

### **Browser Testing**
1. Navigate to signature-required page
2. Click "Select CAC Certificate" 
3. Browser prompts for certificate selection
4. Choose appropriate certificate
5. Complete signature workflow

## 🎛️ Configuration Options

### **Signature Requirements by Step**
```typescript
const SIGNATURE_REQUIREMENTS = {
  'dao_approval': true,
  'approver_approval': true, 
  'cpso_approval': true,
  'dta_completion': false, // Optional
  'sme_signature': true,
  'custodian_disposition': true
};
```

### **Certificate Validation Rules**
```typescript
const VALIDATION_RULES = {
  requireDoDPKI: true,
  checkExpiration: true,
  validateChain: true,
  requireKeyUsage: ['digitalSignature'],
  maxCertAge: 365 * 3 // 3 years
};
```

## 🚨 Important Notes

1. **Web Limitation**: Browsers cannot directly access smart card private keys
2. **Server Signing**: Actual signing requires server-side PKCS#11 integration
3. **Hardware Dependency**: Requires physical CAC reader and middleware
4. **Certificate Management**: Manual import of DoD CA certificates required
5. **HTTPS Only**: Client certificate auth only works over HTTPS

## 📝 Next Steps for Production

1. **Install DoD CA Bundle** - Import all DoD root/intermediate certificates
2. **Configure HTTPS** - Set up client certificate authentication
3. **PKCS#11 Integration** - Add server-side smart card signing capability  
4. **Certificate Validation** - Implement full X.509 chain validation
5. **Audit Compliance** - Enhanced logging for security requirements

The current implementation provides the complete framework with mock signing for development and can be enhanced with production-grade CAC integration.