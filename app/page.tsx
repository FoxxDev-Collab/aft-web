import { getCurrentUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export const runtime = 'nodejs';

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}