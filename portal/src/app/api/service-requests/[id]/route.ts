import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ServiceRequest, { type ISRComment } from '@/models/ServiceRequest';
import { logger } from '@/lib/logger';

// GET /api/service-requests/[id] — detail view with full comment thread
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: 'Invalid id.' }, { status: 400 });

    await connectDB();

    const request = await ServiceRequest.findOne({ _id: id, userId: user.userId });
    if (!request) return Response.json({ error: 'Request not found.' }, { status: 404 });

    return Response.json({
      request: {
        _id: request._id.toString(),
        type: request.type,
        description: request.description,
        urgency: request.urgency,
        status: request.status,
        policyId: request.policyId?.toString(),
        assignedTo: request.assignedTo,
        attachments: request.attachments,
        comments: request.comments.map((c: ISRComment) => ({
          authorId: c.authorId.toString(),
          authorName: c.authorName,
          authorType: c.authorType,
          body: c.body,
          createdAt: c.createdAt,
        })),
        submittedAt: request.submittedAt,
        firstResponseAt: request.firstResponseAt,
        completedAt: request.completedAt,
        cancelledAt: request.cancelledAt,
      },
    });
  } catch (error) {
    logger.error('Service request detail error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
