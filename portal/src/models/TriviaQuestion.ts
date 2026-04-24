import mongoose, { Schema, Document } from 'mongoose';

export type TriviaCategory = 'insurance' | 'general' | 'company' | 'pop';

export interface ITriviaQuestion extends Document {
  question: string;
  options: string[];
  correctIndex: number;
  category: TriviaCategory;
  addedBy: string;
  active: boolean;
  createdAt: Date;
}

const TriviaQuestionSchema = new Schema<ITriviaQuestion>({
  question: { type: String, required: true, maxlength: 500, trim: true },
  options: { type: [String], validate: { validator: (v: string[]) => v.length === 4, message: 'Must have 4 options.' }, required: true },
  correctIndex: { type: Number, required: true, min: 0, max: 3 },
  category: { type: String, enum: ['insurance', 'general', 'company', 'pop'], default: 'insurance', index: true },
  addedBy: { type: String, required: true, maxlength: 200 },
  active: { type: Boolean, default: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.TriviaQuestion
  || mongoose.model<ITriviaQuestion>('TriviaQuestion', TriviaQuestionSchema);
