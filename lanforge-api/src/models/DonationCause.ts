import mongoose, { Document, Schema } from 'mongoose';

export interface IDonationCause extends Document {
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  lanforgeContributionPerPC: number;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DonationCauseSchema = new Schema<IDonationCause>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true },
    lanforgeContributionPerPC: { type: Number, required: true, default: 0 },
    endDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IDonationCause>('DonationCause', DonationCauseSchema);
