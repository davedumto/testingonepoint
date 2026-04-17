import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import CartItem from '@/models/CartItem';
import { safeValidate, cartAddSchema } from '@/lib/security/validation';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const items = await CartItem.find({ userId: user.userId }).sort({ addedAt: -1 });

  return Response.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const validation = safeValidate(cartAddSchema, body);
  if (!validation.success) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
  const { productName, productCategory } = validation.data;

  await connectDB();

  try {
    const item = await CartItem.create({
      userId: user.userId,
      productName,
      productCategory,
    });
    return Response.json({ success: true, item }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000) {
      return Response.json({ error: 'Already in your cart.' }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get('id');
  if (!itemId) return Response.json({ error: 'Item ID required.' }, { status: 400 });

  await connectDB();
  await CartItem.findOneAndDelete({ _id: itemId, userId: user.userId });

  return Response.json({ success: true });
}
