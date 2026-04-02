import mongoose, { Document, Schema } from 'mongoose';

export interface IPageStatus extends Document {
  path: string;
  name: string;
  enabled: boolean;
  reopenAt?: Date;
}

const PageStatusSchema = new Schema<IPageStatus>(
  {
    path: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    reopenAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model<IPageStatus>('PageStatus', PageStatusSchema);
