import { getCurrentUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { SMENav } from './sme-nav';

export const runtime = 'nodejs';

export default async function SMELayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has SME or admin role
  const userRole = user.primaryRole || user.role;
  if (!['sme', 'admin'].includes(userRole)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      <SMENav user={user} />
      <main className="max-w-full mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}