import mongoose, { Schema, Document } from 'mongoose';

export interface IConversationReply extends Document {
  postId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  body: string;
  createdAt: Date;
}

const ConversationReplySchema = new Schema<IConversationReply>({
  postId: { type: Schema.Types.ObjectId, ref: 'ConversationPost', required: true, index: true },
  authorId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  authorName: { type: String, required: true, maxlength: 120 },
  body: { type: String, required: true, maxlength: 5000 },
  createdAt: { type: Date, default: Date.now, index: true },
});

ConversationReplySchema.index({ postId: 1, createdAt: 1 });

export default mongoose.models.ConversationReply || mongoose.model<IConversationReply>('ConversationReply', ConversationReplySchema);
