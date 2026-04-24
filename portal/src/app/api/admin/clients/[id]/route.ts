import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Policy from '@/models/Policy';
import ServiceRequest from '@/models/ServiceRequest';
import Claim from '@/models/Claim';
import BillingRecord from '@/models/BillingRecord';
import ClientDocument from '@/models/ClientDocument';
import ClientMessage from '@/models/ClientMessage';
import { logger } from '@/lib/logger';

// GET /api/admin/clients/[id] — full 360° view of a single client. Returns
// everything the admin detail page needs in one round-trip so ops can triage
// without clicking into 5 different pages.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: 'Invalid id.' }, { status: 400 });

    await connectDB();

    const user = await User.findOne({ _id: id, role: 'client' });
    if (!user) return Response.json({ error: 'Client not found.' }, { status: 404 });

    const [policies, requests, claims, billing, documents, recentMessages, unreadToAgent] = await Promise.all([
      Policy.find({ userId: user._id }).sort({ createdAt: -1 }),
      ServiceRequest.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50),
      Claim.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50),
      BillingRecord.find({ userId: user._id }).sort({ dueDate: -1 }).limit(30),
      ClientDocument.find({ userId: user._id, deletedAt: { $exists: false } }).sort({ createdAt: -1 }).limit(50),
      ClientMessage.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20),
      ClientMessage.countDocuments({ userId: user._id, senderType: 'client', readByAgent: { $ne: true } }),
    ]);

    return Response.json({
      client: {
        _id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        preferredContact: user.preferredContact,
        businessName: user.businessName,
        // GHL fields for the detail page's profile card
        ghlContactId: user.ghlContactId,
        ghlCreatedAt: user.ghlCreatedAt,
        ghlLastActivity: user.ghlLastActivity,
        tags: user.tags || [],
        assignedAgent: user.assignedAgent,
        tier: user.tier,
        createdAt: user.createdAt,
      },
      policies: policies.map(p => ({
        _id: p._id.toString(),
        productName: p.productName,
        productCategory: p.productCategory,
        carrier: p.carrier,
        policyNumber: p.policyNumber,
        status: p.status,
        premium: p.premium,
        startDate: p.startDate,
        endDate: p.endDate,
        billingType: p.billingType,
      })),
      serviceRequests: requests.map(r => ({
        _id: r._id.toString(),
        type: r.type,
        description: r.description,
        urgency: r.urgency,
        status: r.status,
        assignedTo: r.assignedTo,
        submittedAt: r.submittedAt,
        completedAt: r.completedAt,
      })),
      claims: claims.map(c => ({
        _id: c._id.toString(),
        incidentType: c.incidentType,
        status: c.status,
        dateOfLoss: c.dateOfLoss,
        carrierClaimNumber: c.carrierClaimNumber,
        createdAt: c.createdAt,
      })),
      billing: billing.map(b => ({
        _id: b._id.toString(),
        type: b.type,
        amount: b.amount,
        status: b.status,
        billedBy: b.billedBy,
        carrierName: b.carrierName,
        dueDate: b.dueDate,
      })),
      documents: documents.map(d => ({
        _id: d._id.toString(),
        name: d.name,
        kind: d.kind,
        category: d.category,
        url: d.url,
        uploadedAt: d.uploadedAt,
      })),
      messages: recentMessages.reverse().map(m => ({
        _id: m._id.toString(),
        senderType: m.senderType,
        senderName: m.senderName,
        body: m.body,
        createdAt: m.createdAt,
      })),
      unreadMessagesFromClient: unreadToAgent,
    });
  } catch (error) {
    logger.error('Admin client detail error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
