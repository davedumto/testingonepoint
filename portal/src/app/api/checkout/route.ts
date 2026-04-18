import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import CartItem from '@/models/CartItem';
import Policy from '@/models/Policy';
import { sendCartCheckout } from '@/lib/ghl';
import { sendCheckoutNotification } from '@/lib/email';
import { getTier } from '@/lib/products';
import { logger } from '@/lib/logger';

export async function POST() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const cartItems = await CartItem.find({ userId: user.userId });
  if (cartItems.length === 0) {
    return Response.json({ error: 'Your cart is empty.' }, { status: 400 });
  }

  const policies = await Policy.find({ userId: user.userId, status: 'active' });
  const existingProducts = policies.map(p => p.productName);
  const cartProducts = cartItems.map(c => c.productName);
  const currentTier = getTier(policies.length);

  // Send to GHL webhook
  const ghlResult = await sendCartCheckout(
    { name: user.name, email: user.email },
    cartProducts,
    existingProducts,
    currentTier.label
  );

  // Send confirmation email (non-blocking)
  try {
    sendCheckoutNotification(user.email, user.name, cartProducts, currentTier.label).catch((err) => logger.error('Checkout email error', { error: String(err) }));
  } catch { /* don't block */ }

  // Clear the cart after successful checkout
  await CartItem.deleteMany({ userId: user.userId });

  return Response.json({
    success: true,
    message: 'Bundle request submitted! A OnePoint advisor will call you within one business day.',
    ghlSent: ghlResult.success,
    itemsSubmitted: cartProducts,
  });
}
