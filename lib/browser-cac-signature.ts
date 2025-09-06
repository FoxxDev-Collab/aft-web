// Browser-based CAC signature service - like DoD websites
// Uses browser certificate selection dialog to access CAC certificates

export interface CACCertificate {
  subject: string;
  issuer: string;
  serialNumber: string;
  thumbprint: string;
  notBefore: Date;
  notAfter: Date;
  publicKey?: CryptoKey;
  certificate: ArrayBuffer;
  email?: string;
}

export interface DigitalSignature {
  certificateData: CACCertificate;
  signatureData: string; // Base64 encoded signature
  signedData: string; // Hash of signed data
  algorithm: string;
  timestamp: Date;
  reason?: string;
  location?: string;
}

export class BrowserCACService {
  /**
   * Trigger browser certificate selection dialog (like DoD websites)
   * This prompts the user to select their CAC certificate
   */
  static async selectCACCertificate(): Promise<CACCertificate> {
    try {
      // Method 1: Use XMLHttpRequest to trigger certificate selection
      // This is the standard way DoD websites prompt for CAC
      const certificate = await this.triggerCertificatePrompt();
      return certificate;
    } catch (error) {
      console.error('CAC certificate selection failed:', error);
      throw new Error('Please ensure your CAC is inserted and try again.');
    }
  }

  /**
   * Trigger browser certificate selection via HTTPS client auth
   */
  private static async triggerCertificatePrompt(): Promise<CACCertificate> {
    return new Promise((resolve, reject) => {
      // Create XMLHttpRequest that requires client certificate
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/cac/certificate-info', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      // This timeout gives user time to select certificate
      xhr.timeout = 30000; // 30 seconds
      
      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            const certInfo = JSON.parse(xhr.responseText);
            resolve({
              subject: certInfo.subject,
              issuer: certInfo.issuer,
              serialNumber: certInfo.serialNumber,
              thumbprint: certInfo.thumbprint,
              notBefore: new Date(certInfo.notBefore),
              notAfter: new Date(certInfo.notAfter),
              certificate: new ArrayBuffer(0), // Server provides cert info
              email: certInfo.email
            });
          } catch {
            reject(new Error('Failed to parse certificate information'));
          }
        } else {
          reject(new Error('Certificate selection cancelled or failed'));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('Certificate selection request failed'));
      };
      
      xhr.ontimeout = function() {
        reject(new Error('Certificate selection timed out'));
      };
      
      // Send request - browser will prompt for certificate
      xhr.send(JSON.stringify({ 
        action: 'get-certificate-info',
        timestamp: new Date().toISOString()
      }));
    });
  }

  /**
   * Create digital signature using browser certificate
   * This requires server-side signing with the CAC private key
   */
  static async createDigitalSignature(
    data: string,
    certificate: CACCertificate,
    reason?: string,
    location?: string
  ): Promise<DigitalSignature> {
    try {
      // Step 1: Create hash of data to be signed
      const dataHash = await this.createDataHash(data);
      
      // Step 2: Send signing request to server (which has access to CAC)
      const signatureData = await this.requestServerSideSignature(
        dataHash,
        certificate.thumbprint,
        reason,
        location
      );
      
      return {
        certificateData: certificate,
        signatureData: signatureData.signature,
        signedData: dataHash,
        algorithm: 'RSA-SHA256',
        timestamp: new Date(),
        reason,
        location
      };
    } catch (error) {
      console.error('Failed to create digital signature:', error);
      throw new Error('Digital signature creation failed. Please try again.');
    }
  }

  /**
   * Create SHA-256 hash of data
   */
  private static async createDataHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Request server-side signature using CAC
   */
  private static async requestServerSideSignature(
    dataHash: string,
    certificateThumbprint: string,
    reason?: string,
    location?: string
  ): Promise<{ signature: string; timestamp: string }> {
    const response = await fetch('/api/cac/sign', {
      method: 'POST',
      credentials: 'include', // Include client certificate
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataHash,
        certificateThumbprint,
        reason,
        location,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signature request failed');
    }

    return await response.json();
  }

  /**
   * Check if CAC is available and accessible
   */
  static async checkCACAvailability(): Promise<{ available: boolean; message: string }> {
    try {
      // Quick test to see if we can trigger certificate selection
      const response = await fetch('/api/cac/status', {
        method: 'GET',
        credentials: 'include',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (response.ok) {
        const status = await response.json();
        return {
          available: status.available,
          message: status.message || 'CAC ready'
        };
      } else {
        return {
          available: false,
          message: 'CAC middleware not available'
        };
      }
    } catch {
      return {
        available: false,
        message: 'CAC not detected. Please ensure card is inserted and middleware is running.'
      };
    }
  }

  /**
   * Verify digital signature
   */
  static async verifySignature(
    signature: DigitalSignature,
    originalData: string
  ): Promise<boolean> {
    try {
      // Recreate hash
      const dataHash = await this.createDataHash(originalData);
      
      // Check if hash matches
      if (dataHash !== signature.signedData) {
        return false;
      }

      // Send verification request to server
      const response = await fetch('/api/cac/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signatureData: signature.signatureData,
          dataHash: signature.signedData,
          certificateThumbprint: signature.certificateData.thumbprint,
          algorithm: signature.algorithm
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.valid === true;
      }

      return false;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Format certificate subject for display
   */
  static formatCertificateSubject(subject: string): {
    name: string;
    organization: string;
    email?: string;
  } {
    const parts: Record<string, string> = {};
    
    // Parse DN components
    subject.split(',').forEach(part => {
      const [key, value] = part.split('=').map(s => s.trim());
      if (key && value) {
        parts[key.toUpperCase()] = value;
      }
    });

    return {
      name: parts['CN'] || 'Unknown User',
      organization: parts['O'] || parts['OU'] || 'Unknown Organization',
      email: parts['EMAILADDRESS'] || parts['E']
    };
  }

  /**
   * Check if certificate is from DoD PKI
   */
  static isDoDCertificate(certificate: CACCertificate): boolean {
    const issuer = certificate.issuer.toUpperCase();
    const subject = certificate.subject.toUpperCase();
    
    const dodPatterns = [
      'DOD CA',
      'DOD EMAIL CA',
      'DOD ID CA',
      'DOD SW CA',
      'U.S. GOVERNMENT',
      'DOD ROOT CA'
    ];

    return dodPatterns.some(pattern => 
      issuer.includes(pattern) || subject.includes(pattern)
    );
  }
}