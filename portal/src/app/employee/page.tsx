import { redirect } from 'next/navigation';
import { getEmployeeUser } from '@/lib/employee-auth';

export default async function EmployeeRootPage() {
  const user = await getEmployeeUser();
  redirect(user ? '/employee/dashboard' : '/employee/login');
}
