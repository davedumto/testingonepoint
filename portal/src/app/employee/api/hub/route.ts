import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import Announcement from '@/models/Announcement';
import TeamMeeting from '@/models/TeamMeeting';
import HubEvent from '@/models/HubEvent';
import DocumentLink from '@/models/DocumentLink';
import Employee from '@/models/Employee';
import OAuthEvent from '@/models/EmployeeAuth';
import AccessRequest from '@/models/AccessRequest';

// Returns the next occurrence of a month/day pair, either this year or next.
function nextOccurrence(sourceDate: Date, reference: Date): Date {
  const thisYear = new Date(reference.getFullYear(), sourceDate.getMonth(), sourceDate.getDate());
  if (thisYear.getTime() >= reference.getTime() - 86_400_000) return thisYear; // include today
  return new Date(reference.getFullYear() + 1, sourceDate.getMonth(), sourceDate.getDate());
}

// Single aggregated GET that powers the Team Hub home page. Keeps the page
// render down to one round-trip instead of 5.
export async function GET() {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const [announcements, meetings, adminEvents, documents, employeesWithDates, ghlAccess, ghlLastAuth] = await Promise.all([
    Announcement.find({
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .sort({ pinned: -1, postedAt: -1 })
      .limit(6),
    TeamMeeting.find({ active: true }).sort({ order: 1, createdAt: 1 }).limit(20),
    HubEvent.find({ date: { $gte: now, $lte: ninetyDaysFromNow } }).sort({ date: 1 }).limit(30),
    DocumentLink.find().sort({ postedAt: -1 }).limit(10),
    Employee.find({
      isSetup: true,
      $or: [{ birthday: { $exists: true, $ne: null } }, { hireDate: { $exists: true, $ne: null } }],
    }).select('_id name birthday hireDate photoUrl'),
    AccessRequest.findOne({ userId: user.userId, provider: 'ghl', status: 'approved' }),
    OAuthEvent.findOne({ userId: user.userId, provider: 'ghl', status: 'completed' })
      .sort({ authenticatedAt: -1 })
      .select('authenticatedAt'),
  ]);

  // Synthesize upcoming birthday + work-anniversary events from Employee records.
  // Admin-created HubEvents for the same employee+category+month+day win (deduped below).
  const synthetic: Array<{
    _id: string;
    title: string;
    category: 'birthday' | 'work_anniversary';
    date: Date;
    allDay: boolean;
    timeLabel?: string;
    description?: string;
    imageUrl?: string;
    synthetic: true;
  }> = [];

  const adminKeyset = new Set(
    adminEvents
      .filter(e => e.employeeId && (e.category === 'birthday' || e.category === 'work_anniversary'))
      .map(e => `${e.employeeId?.toString()}:${e.category}:${e.date.getMonth()}-${e.date.getDate()}`),
  );

  for (const emp of employeesWithDates) {
    if (emp.birthday) {
      const next = nextOccurrence(emp.birthday, now);
      if (next.getTime() <= ninetyDaysFromNow.getTime()) {
        const key = `${emp._id.toString()}:birthday:${next.getMonth()}-${next.getDate()}`;
        if (!adminKeyset.has(key)) {
          synthetic.push({
            _id: `syn-b-${emp._id.toString()}`,
            title: `${emp.name || 'Teammate'}'s Birthday`,
            category: 'birthday',
            date: next,
            allDay: true,
            imageUrl: emp.photoUrl,
            synthetic: true,
          });
        }
      }
    }
    if (emp.hireDate) {
      const next = nextOccurrence(emp.hireDate, now);
      const years = next.getFullYear() - emp.hireDate.getFullYear();
      if (years > 0 && next.getTime() <= ninetyDaysFromNow.getTime()) {
        const key = `${emp._id.toString()}:work_anniversary:${next.getMonth()}-${next.getDate()}`;
        if (!adminKeyset.has(key)) {
          synthetic.push({
            _id: `syn-a-${emp._id.toString()}`,
            title: `${emp.name || 'Teammate'}'s ${years}-year anniversary`,
            category: 'work_anniversary',
            date: next,
            allDay: true,
            imageUrl: emp.photoUrl,
            synthetic: true,
          });
        }
      }
    }
  }

  const mergedEvents = [
    ...adminEvents.map(e => ({
      _id: e._id.toString(),
      title: e.title,
      category: e.category,
      date: e.date,
      allDay: e.allDay,
      timeLabel: e.timeLabel,
      description: e.description,
      imageUrl: e.imageUrl,
    })),
    ...synthetic,
  ]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);

  return Response.json({
    announcements: announcements.map(a => ({
      _id: a._id.toString(),
      title: a.title,
      body: a.body,
      category: a.category,
      pinned: a.pinned,
      imageUrl: a.imageUrl,
      postedBy: a.postedBy,
      postedAt: a.postedAt,
    })),
    meetings: meetings.map(m => ({
      _id: m._id.toString(),
      name: m.name,
      group: m.group,
      teamsUrl: m.teamsUrl,
      scheduleLabel: m.scheduleLabel,
      description: m.description,
      host: m.host,
    })),
    events: mergedEvents,
    documents: documents.map(d => ({
      _id: d._id.toString(),
      name: d.name,
      url: d.url,
      category: d.category,
      description: d.description,
      postedAt: d.postedAt,
    })),
    crm: {
      hasApprovedAccess: !!ghlAccess,
      lastAuthenticated: ghlLastAuth?.authenticatedAt || null,
    },
  });
}
