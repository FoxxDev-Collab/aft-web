// Manual certificate parsing and validation utilities
// Since web apps can't access CAC directly, users will upload/paste certificates

import * as forge from 'node-forge';

export interface ParsedCertificate {
  subject: string;
  issuer: string;
  serialNumber: string;
  thumbprint: string;
  notBefore: Date;
  notAfter: Date;
  publicKeyPem: string;
  certificatePem: string;
  isDoD: boolean;
  dodComponent?: string; // Army, Navy, Air Force, etc.
}

export class CertificateParser {
  // Known DoD Certificate Authority patterns
  private static DOD_CA_PATTERNS = [
    'DoD CA-',
    'DOD EMAIL CA-',
    'DOD SW CA-',
    'DOD ID CA-',
    'US DOD CCEB CA-',
    'DoD Root CA',
    'U.S. Government,C=US'
  ];

  // DoD component identifiers
  private static DOD_COMPONENTS = {
    'ARMY': ['US ARMY', 'ARMY', 'A.ARMY'],
    'NAVY': ['US NAVY', 'NAVY', 'N.NAVY'],
    'USAF': ['US AIR FORCE', 'AIR FORCE', 'F.AIRFORCE'],
    'MARINES': ['US MARINE CORPS', 'USMC', 'M.USMC'],
    'USCG': ['US COAST GUARD', 'USCG', 'G.USCG'],
    'DHA': ['DEFENSE HEALTH AGENCY', 'DHA'],
    'OSD': ['OFFICE OF THE SECRETARY OF DEFENSE', 'OSD'],
    'CONTRACTOR': ['CTR', 'CONTRACTOR']
  };

  /**
   * Parse certificate from PEM string
   */
  static parsePemCertificate(pemData: string): ParsedCertificate {
    try {
      const cert = forge.pki.certificateFromPem(pemData);
      return this.parseForgeCertificate(cert, pemData);
    } catch (error) {
      throw new Error(`Failed to parse PEM certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse certificate from uploaded file (P12/PFX)
   */
  static async parseP12Certificate(
    p12Data: ArrayBuffer, 
    password: string
  ): Promise<{ certificate: ParsedCertificate; privateKey?: string }> {
    try {
      const p12Asn1 = forge.asn1.fromDer(forge.util.binary.raw.encode(new Uint8Array(p12Data)));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
      
      // Extract certificate
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      if (!certBags[forge.pki.oids.certBag] || certBags[forge.pki.oids.certBag]?.length === 0) {
        throw new Error('No certificates found in P12 file');
      }
      
      const cert = certBags[forge.pki.oids.certBag]![0].cert;
      if (!cert) {
        throw new Error('Invalid certificate in P12 file');
      }
      
      const pemData = forge.pki.certificateToPem(cert);
      const parsedCert = this.parseForgeCertificate(cert, pemData);
      
      // Extract private key (if present and needed)
      let privateKeyPem: string | undefined;
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBagType = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
      if (keyBagType && keyBagType.length > 0) {
        const key = keyBagType[0].key;
        if (key) {
          privateKeyPem = forge.pki.privateKeyToPem(key);
        }
      }
      
      return {
        certificate: parsedCert,
        privateKey: privateKeyPem
      };
    } catch (error) {
      throw new Error(`Failed to parse P12 certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse certificate from DER format
   */
  static parseDerCertificate(derData: ArrayBuffer): ParsedCertificate {
    try {
      const derString = forge.util.binary.raw.encode(new Uint8Array(derData));
      const asn1 = forge.asn1.fromDer(derString);
      const cert = forge.pki.certificateFromAsn1(asn1);
      const pemData = forge.pki.certificateToPem(cert);
      
      return this.parseForgeCertificate(cert, pemData);
    } catch (error) {
      throw new Error(`Failed to parse DER certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Internal method to parse forge certificate object
   */
  private static parseForgeCertificate(cert: forge.pki.Certificate, pemData: string): ParsedCertificate {
    // Extract subject and issuer
    const subject = this.formatDistinguishedName(cert.subject.attributes);
    const issuer = this.formatDistinguishedName(cert.issuer.attributes);
    
    // Calculate thumbprint (SHA-1 of DER encoding)
    const derBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const thumbprint = forge.md.sha1.create().update(derBytes).digest().toHex().toUpperCase();
    
    // Extract serial number
    const serialNumber = cert.serialNumber;
    
    // Get validity dates
    const notBefore = cert.validity.notBefore;
    const notAfter = cert.validity.notAfter;
    
    // Get public key PEM
    const publicKeyPem = forge.pki.publicKeyToPem(cert.publicKey);
    
    // Check if this is a DoD certificate
    const isDoD = this.isDoDCertificate(subject, issuer);
    const dodComponent = isDoD ? this.identifyDoDComponent(subject) : undefined;
    
    return {
      subject,
      issuer,
      serialNumber,
      thumbprint,
      notBefore,
      notAfter,
      publicKeyPem,
      certificatePem: pemData,
      isDoD,
      dodComponent
    };
  }

  /**
   * Format distinguished name from forge attributes
   */
  private static formatDistinguishedName(attributes: forge.pki.CertificateField[]): string {
    return attributes.map(attr => `${attr.shortName || attr.name}=${attr.value}`).join(',');
  }

  /**
   * Check if certificate is from DoD PKI
   */
  private static isDoDCertificate(subject: string, issuer: string): boolean {
    const combinedText = `${subject} ${issuer}`.toUpperCase();
    
    return this.DOD_CA_PATTERNS.some(pattern => 
      combinedText.includes(pattern.toUpperCase())
    );
  }

  /**
   * Identify DoD component from certificate subject
   */
  private static identifyDoDComponent(subject: string): string | undefined {
    const subjectUpper = subject.toUpperCase();
    
    for (const [component, patterns] of Object.entries(this.DOD_COMPONENTS)) {
      if (patterns.some(pattern => subjectUpper.includes(pattern))) {
        return component;
      }
    }
    
    return 'OTHER';
  }

  /**
   * Validate certificate chain against DoD root CAs
   */
  static validateCertificateChain(certificate: ParsedCertificate, rootCAs: string[]): {
    isValid: boolean;
    validationErrors: string[];
    trustedChain: boolean;
  } {
    const errors: string[] = [];
    let isValid = true;
    let trustedChain = false;

    try {
      const cert = forge.pki.certificateFromPem(certificate.certificatePem);
      
      // Check certificate validity period
      const now = new Date();
      if (now < certificate.notBefore) {
        errors.push('Certificate is not yet valid');
        isValid = false;
      }
      
      if (now > certificate.notAfter) {
        errors.push('Certificate has expired');
        isValid = false;
      }
      
      // Check if issued by trusted DoD CA
      if (!certificate.isDoD) {
        errors.push('Certificate is not from DoD PKI');
        isValid = false;
      }
      
      // Verify against root CAs
      if (rootCAs.length > 0) {
        trustedChain = rootCAs.some(rootCAPem => {
          try {
            const rootCA = forge.pki.certificateFromPem(rootCAPem);
            const caStore = forge.pki.createCaStore([rootCA]);
            return forge.pki.verifyCertificateChain(caStore, [cert]);
          } catch {
            return false;
          }
        });
        
        if (!trustedChain) {
          errors.push('Certificate chain is not trusted');
        }
      }
      
      // Basic certificate structure validation
      if (!cert.publicKey) {
        errors.push('Certificate has no public key');
        isValid = false;
      }
      
      // Check key usage for signing (if available)
      const keyUsageExt = cert.getExtension('keyUsage');
      if (keyUsageExt && 'digitalSignature' in keyUsageExt && !keyUsageExt.digitalSignature) {
        errors.push('Certificate is not valid for digital signatures');
        isValid = false;
      }
      
    } catch (error) {
      errors.push(`Certificate validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      isValid = false;
    }

    return {
      isValid: isValid && trustedChain,
      validationErrors: errors,
      trustedChain
    };
  }

  /**
   * Extract email from certificate subject
   */
  static extractEmailFromCertificate(certificate: ParsedCertificate): string | null {
    // Try to extract email from subject
    const emailMatch = certificate.subject.match(/emailAddress=([^,]+)/i) || 
                      certificate.subject.match(/E=([^,]+)/i);
    
    if (emailMatch) {
      return emailMatch[1].trim();
    }
    
    // Check Subject Alternative Name extension
    try {
      const cert = forge.pki.certificateFromPem(certificate.certificatePem);
      const sanExt = cert.getExtension('subjectAltName');
      if (sanExt && 'altNames' in sanExt && sanExt.altNames && Array.isArray(sanExt.altNames)) {
        for (const altName of sanExt.altNames) {
          if (altName.type === 1) { // RFC822 Name (email)
            return altName.value;
          }
        }
      }
    } catch {
      // Ignore parsing errors
    }
    
    return null;
  }

  /**
   * Create signature verification data for manual signing
   * Returns data that user can sign with external tools
   */
  static prepareDataForExternalSigning(data: string): {
    dataToSign: string;
    hash: string;
    instructions: string;
  } {
    // Create SHA-256 hash
    const md = forge.md.sha256.create();
    md.update(data, 'utf8');
    const hash = md.digest().toHex();
    
    return {
      dataToSign: data,
      hash: hash.toUpperCase(),
      instructions: [
        '1. Save the data to a file (e.g., data.txt)',
        '2. Use your CAC/PIV card with approved signing software',
        '3. Sign the SHA-256 hash: ' + hash.toUpperCase(),
        '4. Upload the resulting signature file (.sig or .p7s)',
        '5. The signature will be verified against your certificate'
      ].join('\n')
    };
  }
}