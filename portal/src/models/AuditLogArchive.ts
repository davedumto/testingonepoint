import mongoose, { Schema } from 'mongoose';

const AuditLogArchiveSchema = new Schema({
  originalId: { type: Schema.Types.ObjectId, required: true },
  timestamp: { type: Date, required: true, index: true },
  correlationId: { type: String },
  userId: { type: String },
  userEmail: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String },
  action: { type: String, required: true },
  targetResource: { type: String },
  targetId: { type: String },
  status: { type: String },
  details: { type: Schema.Types.Mixed },
  severity: { type: String },
  previousHash: { type: String },
  entryHash: { type: String },
  archivedAt: { type: Date, default: Date.now },
});

AuditLogArchiveSchema.index({ action: 1, timestamp: -1 });

export default mongoose.models.AuditLogArchive || mongoose.model('AuditLogArchive', AuditLogArchiveSchema);
