'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Login successful:', data);
        // Wait a moment for cookie to be set, then redirect based on role selection needs
        setTimeout(() => {
          if (data.hasMultipleRoles) {
            router.push('/role-selection');
          } else {
            router.push(data.redirectTo || '/dashboard');
          }
        }, 100);
      } else {
        const data = await response.json();
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptWarning = () => {
    if (acknowledged) {
      setWarningAcknowledged(true);
    }
  };

  const handleDeclineWarning = () => {
    window.close();
    // If window.close() doesn't work (modern browsers), redirect away
    setTimeout(() => {
      window.location.href = 'about:blank';
    }, 100);
  };

  if (!warningAcknowledged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-4xl border-destructive/20">
          <CardHeader className="text-center bg-destructive/10 border-b border-destructive/20">
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-8 w-8 text-destructive mr-2" />
            </div>
            <CardTitle className="text-2xl text-destructive font-bold">
              U.S. DEPARTMENT OF DEFENSE WARNING STATEMENT
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <Alert variant="destructive">
              <AlertDescription className="text-center font-semibold text-lg">
                YOU ARE ACCESSING A U.S. GOVERNMENT (USG) INFORMATION SYSTEM (IS)
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4 text-sm">
              <p className="text-foreground">
                This is a DOD computer system. DOD computer systems are provided for the processing of official U.S. Government information only. All data contained on DOD computer systems is owned by the DOD and may be monitored, intercepted, recorded, read, copied, or captured in any manner and disclosed in any manner, by authorized personnel.
              </p>
              
              <Alert className="border-destructive/30 bg-destructive/5">
                <AlertDescription>
                  <strong>WARNING:</strong> There is no right to privacy in this system. System personnel may give to law enforcement officials any potential evidence of crime found on DOD computer systems.
                </AlertDescription>
              </Alert>
              
              <div className="bg-muted p-4 rounded-lg border">
                <p className="font-semibold mb-2 text-foreground">By using this system you acknowledge and consent to:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                  <li>MONITORING, INTERCEPTION, RECORDING, READING, COPYING, OR CAPTURING by authorized personnel</li>
                  <li>THERE IS NO RIGHT TO PRIVACY IN THIS SYSTEM</li>
                  <li>UNAUTHORIZED USE MAY SUBJECT YOU TO CRIMINAL, CIVIL, AND/OR ADMINISTRATIVE PENALTIES</li>
                  <li>BY USING THIS SYSTEM, YOU ACKNOWLEDGE AND CONSENT TO THE FOREGOING</li>
                </ul>
              </div>
              
              <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                <p className="font-semibold mb-2 text-foreground">Users must comply with all applicable DOD policies, including:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                  <li>DOD 8500.01 - Information Assurance (IA)</li>
                  <li>DOD 8570.01 - IA Training, Certification, and Workforce Management</li>
                  <li>Applicable Rules of Behavior</li>
                </ul>
              </div>
              
              <Alert variant="destructive">
                <AlertDescription className="text-center font-semibold">
                  If you are not authorized to access this system, disconnect now.
                </AlertDescription>
              </Alert>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="acknowledge"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-1 rounded border-input"
                />
                <Label htmlFor="acknowledge" className="text-sm font-medium text-foreground leading-relaxed">
                  I acknowledge that I have read and understand this warning statement and agree to comply with all stated conditions.
                </Label>
              </div>
              
              <div className="flex space-x-4 justify-center">
                <Button 
                  onClick={handleAcceptWarning}
                  disabled={!acknowledged}
                  variant="default"
                >
                  I Accept
                </Button>
                <Button 
                  onClick={handleDeclineWarning}
                  variant="destructive"
                >
                  I Do Not Accept
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">AFT System Login</CardTitle>
          <CardDescription className="text-center">
            Assured File Transfer Request System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@aft.gov"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
          <div className="mt-4 text-sm text-gray-600 text-center">
            <p>Welcome to the Kratos Defense - KS2 AFT Center</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}