import { getCurrentUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { UserProfile } from './user-profile';

export const runtime = 'nodejs';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return <UserProfile user={user} />;
}