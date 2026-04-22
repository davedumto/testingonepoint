import { NextRequest } from 'next/server';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';

export async function GET(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  await connectDB();

  // Individual profile view
  if (id) {
    const emp = await Employee.findById(id).select('-password -resetToken -resetTokenExpiry -twoFactorSecret -twoFactorBackupCodes -hmacEmail');
    if (!emp) return Response.json({ error: 'Not found.' }, { status: 404 });

    const isSelf = emp._id.toString() === user.employeeId;
    const shareEC = !!emp.shareEmergencyContactWithTeam;

    return Response.json({
      employee: {
        _id: emp._id.toString(),
        email: emp.email,
        name: emp.name,
        jobTitle: emp.jobTitle,
        department: emp.department,
        bio: emp.bio,
        photoUrl: emp.photoUrl,
        phone: emp.phone,
        birthday: emp.birthday,
        hireDate: emp.hireDate,
        timezone: emp.timezone,
        addedAt: emp.addedAt,
        // Emergency contact only if self or opted-in for team visibility
        emergencyContactName: isSelf || shareEC ? emp.emergencyContactName : undefined,
        emergencyContactPhone: isSelf || shareEC ? emp.emergencyContactPhone : undefined,
        emergencyContactRelation: isSelf || shareEC ? emp.emergencyContactRelation : undefined,
        shareEmergencyContactWithTeam: emp.shareEmergencyContactWithTeam,
        isSelf,
      },
    });
  }

  // Directory list: public-safe fields only
  const employees = await Employee.find({ isSetup: true })
    .select('name email jobTitle department photoUrl bio timezone addedAt hireDate')
    .sort({ name: 1 });

  return Response.json({
    employees: employees.map(e => ({
      _id: e._id.toString(),
      name: e.name,
      email: e.email,
      jobTitle: e.jobTitle,
      department: e.department,
      photoUrl: e.photoUrl,
      bio: e.bio,
      timezone: e.timezone,
      hireDate: e.hireDate,
      addedAt: e.addedAt,
    })),
  });
}
