'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { User, Users, Shield } from 'lucide-react';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organization?: string;
}

interface DualSignatureData {
  enableDualSignature: boolean;
  secondarySignerType: 'dta' | 'sme' | '';
  secondarySignerId: number | null;
}

interface DualSignatureStepProps {
  data: DualSignatureData;
  onUpdate: (data: Partial<DualSignatureData>) => void;
}

export function DualSignatureStep({ data, onUpdate }: DualSignatureStepProps) {
  const [dtaUsers, setDtaUsers] = useState<User[]>([]);
  const [smeUsers, setSmeUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data.enableDualSignature) {
      fetchUsers();
    }
  }, [data.enableDualSignature]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const users = await response.json();
        setDtaUsers(users.filter((user: User) => user.role === 'dta'));
        setSmeUsers(users.filter((user: User) => user.role === 'sme'));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignerTypeChange = (value: 'dta' | 'sme') => {
    onUpdate({
      secondarySignerType: value,
      secondarySignerId: null, // Reset selected user when type changes
    });
  };

  const handleSignerIdChange = (value: string) => {
    onUpdate({
      secondarySignerId: parseInt(value),
    });
  };

  const getAvailableUsers = () => {
    return data.secondarySignerType === 'dta' ? dtaUsers : smeUsers;
  };

  const selectedUser = getAvailableUsers().find(user => user.id === data.secondarySignerId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-primary" />
          <span>Section 4: Dual Signature Configuration</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Dual Signature */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-primary" />
              <Label htmlFor="enable-dual" className="font-medium">
                Enable Dual Signature System
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Require two signatures for AFT completion: Primary DTA + Secondary signer
            </p>
          </div>
          <Switch
            id="enable-dual"
            checked={data.enableDualSignature}
            onCheckedChange={(checked) => 
              onUpdate({ 
                enableDualSignature: checked,
                secondarySignerType: checked ? data.secondarySignerType : '',
                secondarySignerId: checked ? data.secondarySignerId : null,
              })
            }
          />
        </div>

        {data.enableDualSignature && (
          <div className="space-y-4">
            {/* Secondary Signer Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="signer-type">Secondary Signer Type</Label>
              <Select
                value={data.secondarySignerType}
                onValueChange={handleSignerTypeChange}
              >
                <SelectTrigger id="signer-type">
                  <SelectValue placeholder="Choose secondary signer type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dta">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>Second DTA (Data Transfer Agent)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="sme">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4" />
                      <span>SME (Subject Matter Expert)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {data.secondarySignerType === 'dta' && 
                  'Second DTA will provide additional transfer validation and completion signature.'}
                {data.secondarySignerType === 'sme' && 
                  'SME will provide technical validation and expertise verification.'}
              </p>
            </div>

            {/* Secondary Signer Selection */}
            {data.secondarySignerType && (
              <div className="space-y-2">
                <Label htmlFor="signer-select">
                  Select {data.secondarySignerType === 'dta' ? 'Second DTA' : 'SME'}
                </Label>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Loading users...</span>
                  </div>
                ) : (
                  <Select
                    value={data.secondarySignerId?.toString() || ''}
                    onValueChange={handleSignerIdChange}
                  >
                    <SelectTrigger id="signer-select">
                      <SelectValue placeholder={`Choose ${data.secondarySignerType.toUpperCase()} user...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableUsers().map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4" />
                              <span>{user.firstName} {user.lastName}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {user.role.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {user.email} {user.organization && `• ${user.organization}`}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Selected User Confirmation */}
            {selectedUser && (
              <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-green-900">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </div>
                    <div className="text-sm text-green-700">
                      {selectedUser.email} • {selectedUser.role.toUpperCase()}
                      {selectedUser.organization && ` • ${selectedUser.organization}`}
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    Secondary Signer
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Information Box */}
        <div className="p-4 border border-primary/20 rounded-lg bg-primary/5">
          <h4 className="font-medium text-primary mb-2">Dual Signature Workflow</h4>
          <div className="space-y-2 text-sm text-primary/80">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>1. AFT goes through standard approval chain (DAO/Approver/CPSO)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>2. Primary DTA initiates transfer and provides first signature</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>3. Secondary signer ({data.secondarySignerType?.toUpperCase() || 'DTA/SME'}) provides validation signature</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>4. Primary DTA provides final completion signature</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
              <span>5. AFT transfer completed successfully</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}