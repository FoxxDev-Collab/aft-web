import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// GET/POST /api/cac/certificate-info - Extract certificate info from client cert
export async function POST(request: NextRequest) {
  try {
    // In a real implementation with HTTPS and client certificate authentication,
    // the certificate information would be available in request headers
    
    // For now, we'll extract from common headers that reverse proxies/load balancers set
    const clientCert = extractClientCertificate(request);
    
    if (!clientCert) {
      return NextResponse.json(
        { error: 'No client certificate provided' },
        { status: 400 }
      );
    }

    // Parse and validate the certificate
    const certInfo = await parseCertificateHeaders(clientCert);
    
    return NextResponse.json({
      subject: certInfo.subject,
      issuer: certInfo.issuer,
      serialNumber: certInfo.serialNumber,
      thumbprint: certInfo.thumbprint,
      notBefore: certInfo.notBefore,
      notAfter: certInfo.notAfter,
      email: certInfo.email,
      isValid: certInfo.isValid,
      isDod: certInfo.isDod
    });

  } catch (error) {
    console.error('Certificate info extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract certificate information' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request); // Handle both GET and POST
}

/**
 * Extract client certificate from request headers
 * This depends on your reverse proxy/load balancer configuration
 */
interface CertHeaders {
  'x-ssl-client-cert': string | null;
  'x-ssl-client-s-dn': string | null;
  'x-ssl-client-i-dn': string | null;
  'ssl-client-cert': string | null;
  'ssl-client-s-dn': string | null;
  'ssl-client-i-dn': string | null;
  'x-ssl-client-serial': string | null;
  'x-ssl-client-fingerprint': string | null;
  'x-ssl-client-sha1': string | null;
  'x-ssl-client-v-start': string | null;
  'x-ssl-client-v-end': string | null;
  'x-ssl-client-verify': string | null;
  'x-ssl-client-der': string | null;
  'x-client-cert': string | null;
  // Mock certificate properties for development
  mock?: boolean;
  subject?: string;
  issuer?: string;
  serialNumber?: string;
  fingerprint?: string;
  notBefore?: string;
  notAfter?: string;
}

function extractClientCertificate(request: NextRequest): CertHeaders {
  // Common headers used by reverse proxies for client certificates:
  const certHeaders = {
    // Apache/Nginx with SSL client certificate
    'x-ssl-client-cert': request.headers.get('x-ssl-client-cert'),
    'x-ssl-client-s-dn': request.headers.get('x-ssl-client-s-dn'), // Subject DN
    'x-ssl-client-i-dn': request.headers.get('x-ssl-client-i-dn'), // Issuer DN
    'ssl-client-cert': request.headers.get('ssl-client-cert'),
    'ssl-client-s-dn': request.headers.get('ssl-client-s-dn'),
    'ssl-client-i-dn': request.headers.get('ssl-client-i-dn'),
    'x-ssl-client-serial': request.headers.get('x-ssl-client-serial'),
    'x-ssl-client-fingerprint': request.headers.get('x-ssl-client-fingerprint'),
    'x-ssl-client-verify': request.headers.get('x-ssl-client-verify'),
    'x-ssl-client-v-start': request.headers.get('x-ssl-client-v-start'),
    'x-ssl-client-v-end': request.headers.get('x-ssl-client-v-end'),
    
    // HAProxy headers
    'x-ssl-client-sha1': request.headers.get('x-ssl-client-sha1'),
    'x-ssl-client-der': request.headers.get('x-ssl-client-der'),
    
    // Custom headers you might set
    'x-client-cert': request.headers.get('x-client-cert'),
  };

  // Check if any certificate headers are present
  const hasClientCert = Object.values(certHeaders).some(value => value !== null);
  
  if (!hasClientCert) {
    // For development/testing, return a mock certificate
    if (process.env.NODE_ENV === 'development') {
      return {
        'x-ssl-client-cert': null,
        'x-ssl-client-s-dn': null,
        'x-ssl-client-i-dn': null,
        'ssl-client-cert': null,
        'ssl-client-s-dn': null,
        'ssl-client-i-dn': null,
        'x-ssl-client-serial': null,
        'x-ssl-client-fingerprint': null,
        'x-ssl-client-sha1': null,
        'x-ssl-client-v-start': null,
        'x-ssl-client-v-end': null,
        'x-ssl-client-verify': null,
        'x-ssl-client-der': null,
        'x-client-cert': null,
        mock: true,
        subject: 'CN=DOE.JOHN.1234567890,OU=PKI,OU=DoD,O=U.S. Government,C=US',
        issuer: 'CN=DoD CA-59,OU=PKI,OU=DoD,O=U.S. Government,C=US',
        serialNumber: '1234567890ABCDEF',
        fingerprint: 'AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:AA:BB:CC:DD',
        notBefore: '2024-01-01T00:00:00Z',
        notAfter: '2027-01-01T00:00:00Z'
      };
    }
    return {
      'x-ssl-client-cert': null,
      'x-ssl-client-s-dn': null,
      'x-ssl-client-i-dn': null,
      'ssl-client-cert': null,
      'ssl-client-s-dn': null,
      'ssl-client-i-dn': null,
      'x-ssl-client-serial': null,
      'x-ssl-client-fingerprint': null,
      'x-ssl-client-sha1': null,
      'x-ssl-client-v-start': null,
      'x-ssl-client-v-end': null,
      'x-ssl-client-verify': null,
      'x-ssl-client-der': null,
      'x-client-cert': null
    };
  }

  return certHeaders;
}

/**
 * Parse certificate information from headers
 */
async function parseCertificateHeaders(certHeaders: CertHeaders): Promise<{
  subject: string;
  issuer: string;
  serialNumber: string;
  thumbprint: string;
  notBefore: string;
  notAfter: string;
  email?: string;
  isValid: boolean;
  isDod: boolean;
}> {
  // Handle mock certificate for development
  if (certHeaders.mock) {
    return {
      subject: certHeaders.subject || '',
      issuer: certHeaders.issuer || '',
      serialNumber: certHeaders.serialNumber || '',
      thumbprint: (certHeaders.fingerprint || '').replace(/:/g, ''),
      notBefore: certHeaders.notBefore || '',
      notAfter: certHeaders.notAfter || '',
      email: extractEmailFromSubject(certHeaders.subject || ''),
      isValid: true,
      isDod: isDoDCertificate(certHeaders.subject || '', certHeaders.issuer || '')
    };
  }

  // Parse real certificate headers
  const subject = certHeaders['x-ssl-client-s-dn'] || '';
  const issuer = certHeaders['x-ssl-client-i-dn'] || '';
  const serialNumber = certHeaders['x-ssl-client-serial'] || '';
  const fingerprint = certHeaders['x-ssl-client-fingerprint'] || 
                     certHeaders['x-ssl-client-sha1'] || '';
  const notBefore = certHeaders['x-ssl-client-v-start'] || '';
  const notAfter = certHeaders['x-ssl-client-v-end'] || '';
  const verify = certHeaders['x-ssl-client-verify'] || '';

  return {
    subject,
    issuer,
    serialNumber,
    thumbprint: fingerprint.replace(/:/g, ''),
    notBefore,
    notAfter,
    email: extractEmailFromSubject(subject),
    isValid: verify === 'SUCCESS' || verify === 'OK',
    isDod: isDoDCertificate(subject, issuer)
  };
}

/**
 * Extract email from certificate subject
 */
function extractEmailFromSubject(subject: string): string | undefined {
  const emailMatch = subject.match(/emailAddress=([^,]+)/i) || 
                    subject.match(/E=([^,]+)/i);
  return emailMatch ? emailMatch[1].trim() : undefined;
}

/**
 * Check if certificate is from DoD PKI
 */
function isDoDCertificate(subject: string, issuer: string): boolean {
  const combined = `${subject} ${issuer}`.toUpperCase();
  const dodPatterns = [
    'DOD CA',
    'DOD EMAIL CA', 
    'DOD ID CA',
    'DOD SW CA',
    'U.S. GOVERNMENT',
    'DOD ROOT CA'
  ];
  
  return dodPatterns.some(pattern => combined.includes(pattern));
}