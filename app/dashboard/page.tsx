import { getCurrentUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export const runtime = 'nodejs';

export default async function Dashboard() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Route users to their role-specific dashboard
  const primaryRole = user.primaryRole || user.role;

  switch (primaryRole) {
    case 'admin':
      redirect('/admin');
    case 'requestor':
      redirect('/requestor');
    case 'dao':
    case 'approver':
    case 'cpso':
      redirect('/approver');
    case 'dta':
      redirect('/dta');
    case 'sme':
      redirect('/sme');
    case 'media_custodian':
      redirect('/custodian');
    default:
      // Default to requestor for unknown roles
      redirect('/requestor');
  }
}