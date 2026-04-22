import mongoose, { Schema, Document } from 'mongoose';

export type PostType = 'discussion' | 'question' | 'praise' | 'poll';

export interface IPollOption {
  label: string;
  votes: mongoose.Types.ObjectId[];
}

export interface IConversationPost extends Document {
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  type: PostType;
  body: string;
  praiseRecipientName?: string;
  pollOptions?: IPollOption[];
  likes: mongoose.Types.ObjectId[];
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PollOptionSchema = new Schema<IPollOption>({
  label: { type: String, required: true, maxlength: 200 },
  votes: { type: [Schema.Types.ObjectId], default: [] },
}, { _id: false });

const ConversationPostSchema = new Schema<IConversationPost>({
  authorId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  authorName: { type: String, required: true, maxlength: 120 },
  type: { type: String, enum: ['discussion', 'question', 'praise', 'poll'], default: 'discussion', index: true },
  body: { type: String, required: true, maxlength: 5000 },
  praiseRecipientName: { type: String, maxlength: 120 },
  pollOptions: { type: [PollOptionSchema], default: undefined },
  likes: { type: [Schema.Types.ObjectId], default: [] },
  replyCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

ConversationPostSchema.index({ createdAt: -1 });

export default mongoose.models.ConversationPost || mongoose.model<IConversationPost>('ConversationPost', ConversationPostSchema);
