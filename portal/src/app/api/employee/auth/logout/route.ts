import { clearEmployeeCookie } from '@/lib/employee-auth';

export async function POST() {
  await clearEmployeeCookie();
  return Response.json({ success: true });
}
