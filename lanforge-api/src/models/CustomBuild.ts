import mongoose, { Document, Schema } from 'mongoose';

export interface IBuildPart {
  part: mongoose.Types.ObjectId;
  quantity: number;
  partType: string;
  serialNumbers?: string[];
}

export interface ICustomBuild extends Document {
  buildId: string; // short unique identifier for sharing
  name?: string;
  customer?: mongoose.Types.ObjectId;
  guestEmail?: string;
  baseProduct?: mongoose.Types.ObjectId;
  parts: IBuildPart[];
  subtotal: number;
  laborFee: number;
  total: number;
  status: 'draft' | 'saved' | 'purchased';
  order?: mongoose.Types.ObjectId;
  serialNumber?: string; // Main S/N for the full build
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BuildPartSchema = new Schema<IBuildPart>(
  {
    part: { type: Schema.Types.ObjectId, ref: 'PCPart', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    partType: { type: String, required: true },
    serialNumbers: [{ type: String }],
  },
  { _id: false }
);

const CustomBuildSchema = new Schema<ICustomBuild>(
  {
    buildId: { type: String, required: true, unique: true },
    name: { type: String, default: 'Custom Build' },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    guestEmail: { type: String },
    baseProduct: { type: Schema.Types.ObjectId, ref: 'Product' },
    parts: [BuildPartSchema],
    subtotal: { type: Number, required: true, default: 0 },
    laborFee: { type: Number, required: true, default: 99.99 },
    total: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'saved', 'purchased'],
      default: 'draft',
    },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    serialNumber: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

CustomBuildSchema.index({ buildId: 1 });
CustomBuildSchema.index({ customer: 1 });
CustomBuildSchema.index({ status: 1 });
CustomBuildSchema.index({ serialNumber: 1 }, { unique: true, partialFilterExpression: { serialNumber: { $exists: true, $type: 'string', $ne: '' } } });

export default mongoose.model<ICustomBuild>('CustomBuild', CustomBuildSchema);
