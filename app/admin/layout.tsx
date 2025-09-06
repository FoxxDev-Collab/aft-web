import { getCurrentUser, isAdmin } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/app/admin/admin-nav';

export const runtime = 'nodejs';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav user={user} />
      <main className="py-8">
        <div className="w-[90%] max-w-none mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}