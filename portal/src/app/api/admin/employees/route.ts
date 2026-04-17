import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';

// GET — list all employees
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const employees = await Employee.find({}, { password: 0 }).sort({ addedAt: -1 });
  return Response.json({ employees });
}

// POST — admin adds an employee email
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { email } = await req.json();
  if (!email) return Response.json({ error: 'Email is required.' }, { status: 400 });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return Response.json({ error: 'Invalid email.' }, { status: 400 });

  await connectDB();

  const existing = await Employee.findOne({ email: email.toLowerCase().trim() });
  if (existing) return Response.json({ error: 'Employee already exists.' }, { status: 409 });

  const employee = await Employee.create({
    email: email.toLowerCase().trim(),
    addedBy: admin.email,
    isSetup: false,
  });

  return Response.json({ success: true, employee: { _id: employee._id, email: employee.email } }, { status: 201 });
}

// DELETE — admin removes an employee
export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'Employee ID required.' }, { status: 400 });

  await connectDB();
  await Employee.findByIdAndDelete(id);

  return Response.json({ success: true });
}
