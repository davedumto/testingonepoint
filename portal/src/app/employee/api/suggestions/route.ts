import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import Suggestion from '@/models/Suggestion';
import { safeValidate } from '@/lib/security/validation';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

const suggestionSchema = z.object({
  submitterName: z.string().min(1).max(120).trim(),
  submitterEmail: z.string().email().max(255).toLowerCase().trim(),
  suggestionType: z.enum(['process', 'customer_experience', 'technology', 'culture', 'other']).default('other'),
  message: z.string().min(1, 'Message required').max(5000),
});

export async function POST(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  try {
    const rateKey = getRateLimitKey(ip, 'suggestion');
    const rateResult = await checkRateLimit(rateKey, RATE_LIMITS.passwordReset);
    if (!rateResult.allowed) {
      return Response.json({ error: 'Too many suggestions in a short window. Try later.' }, { status: 429 });
    }

    const body = await req.json();
    const validation = safeValidate(suggestionSchema, body);
    if (!validation.success) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { submitterName, submitterEmail, suggestionType, message } = validation.data;

    await connectDB();

    const suggestion = await Suggestion.create({
      submitterName,
      submitterEmail,
      employeeId: user.userId,
      suggestionType,
      message,
      status: 'new',
    });

    auditLog({
      userId: user.userId,
      userEmail: user.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      details: { context: 'suggestion_submitted', suggestionType },
    });

    return Response.json({ success: true, id: suggestion._id.toString() }, { status: 201 });
  } catch (error) {
    logger.error('Suggestion submit error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
