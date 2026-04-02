import mongoose, { Document, Schema } from 'mongoose';

export interface IBuildRequest extends Document {
  name: string;
  email: string;
  phone?: string;
  budget?: string;
  details: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  usage?: string;
  preferredBrands?: string;
  timeline?: string;
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
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zip: { type: String },
      country: { type: String }
    },
    usage: { type: String },
    preferredBrands: { type: String },
    timeline: { type: String },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'contacted', 'completed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IBuildRequest>('BuildRequest', BuildRequestSchema);
