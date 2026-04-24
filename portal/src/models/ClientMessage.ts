import mongoose, { Schema, Document as MongoDoc } from 'mongoose';

// Per spec §13 — direct messaging between a client and the agency. Kept as a
// flat per-client stream rather than threads because there's only ever one
// conversation per client (with whichever agent/admin responds). Attachments
// live alongside the message so the chat transcript is self-contained.

export type MessageSender = 'client' | 'agent' | 'admin';

export interface IMessageAttachment {
  name: string;
  url: string;
  cloudinaryPublicId?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface IClientMessage extends MongoDoc {
  userId: mongoose.Types.ObjectId; // the client this stream belongs to
  senderType: MessageSender;
  senderId: mongoose.Types.ObjectId;
  senderName: string;

  body: string;
  attachments: IMessageAttachment[];

  // Per-side read flags so either party can show an unread badge without
  // writing to the other party's records.
  readByClient: boolean;
  readByAgent: boolean;

  createdAt: Date;
}

const AttachmentSchema = new Schema<IMessageAttachment>({
  name: { type: String, required: true, trim: true },
  url: { type: String, required: true },
  cloudinaryPublicId: { type: String },
  mimeType: { type: String },
  sizeBytes: { type: Number },
}, { _id: false });

const ClientMessageSchema = new Schema<IClientMessage>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderType: { type: String, enum: ['client', 'agent', 'admin'], required: true },
  senderId: { type: Schema.Types.ObjectId, required: true },
  senderName: { type: String, required: true, trim: true },

  body: { type: String, required: true, maxlength: 5000, trim: true },
  attachments: { type: [AttachmentSchema], default: [] },

  readByClient: { type: Boolean, default: false, index: true },
  readByAgent: { type: Boolean, default: false, index: true },

  createdAt: { type: Date, default: Date.now },
});

// List query: this user's whole stream, newest first.
ClientMessageSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.ClientMessage || mongoose.model<IClientMessage>('ClientMessage', ClientMessageSchema);
