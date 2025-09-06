import { getCurrentUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { CustodianNav } from './custodian-nav';

export const runtime = 'nodejs';

export default async function CustodianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has media custodian or admin role
  const userRole = user.primaryRole || user.role;
  if (!['media_custodian', 'admin'].includes(userRole)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      <CustodianNav user={user} />
      <main className="max-w-full mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}