import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem extends Document {
  userId: mongoose.Types.ObjectId;
  productName: string;
  productCategory: string;
  addedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  productName: { type: String, required: true },
  productCategory: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
});

// Prevent duplicate items in cart
CartItemSchema.index({ userId: 1, productName: 1 }, { unique: true });

export default mongoose.models.CartItem || mongoose.model<ICartItem>('CartItem', CartItemSchema);
