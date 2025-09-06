import { getCurrentUser, canCreateRequest } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { RequestorNav } from '@/app/requestor/requestor-nav';

export const runtime = 'nodejs';

export default async function RequestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || !canCreateRequest(user)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      <RequestorNav user={user} />
      <main className="py-8">
        <div className="w-[90%] max-w-none mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}