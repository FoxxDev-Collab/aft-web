import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// GET /api/cac/status - Check if CAC is available
export async function GET(request: NextRequest) {
  try {
    // Check if client certificate is present
    const hasCertificate = checkClientCertificatePresence(request);
    
    if (hasCertificate) {
      return NextResponse.json({
        available: true,
        message: 'CAC certificate detected and ready for signing',
        middleware: 'detected'
      });
    } else {
      return NextResponse.json({
        available: false,
        message: 'No CAC certificate detected. Please ensure CAC is inserted and middleware is running.',
        middleware: 'not_detected'
      });
    }
  } catch (error) {
    console.error('CAC status check error:', error);
    return NextResponse.json({
      available: false,
      message: 'Error checking CAC status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Check if client certificate is present in request
 */
function checkClientCertificatePresence(request: NextRequest): boolean {
  // Check common client certificate headers
  const certHeaders = [
    'x-ssl-client-cert',
    'x-ssl-client-s-dn',
    'x-ssl-client-fingerprint',
    'x-ssl-client-verify',
    'x-client-cert'
  ];

  const hasHeaders = certHeaders.some(header => 
    request.headers.get(header) !== null
  );

  // For development, always return true
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  return hasHeaders;
}