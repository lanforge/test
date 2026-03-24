import mongoose, { Document, Schema } from 'mongoose';

export interface IBuildRequest extends Document {
  name: string;
  email: string;
  phone?: string;
  budget?: string;
  details: string;
  status: 'pending' | 'reviewed' | 'contacted' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const BuildRequestSchema = new Schema<IBuildRequest>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    budget: { type: String },
    details: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'contacted', 'completed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IBuildRequest>('BuildRequest', BuildRequestSchema);
