import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin-auth';
import AdminShell from './AdminShell';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');

  return <AdminShell>{children}</AdminShell>;
}
