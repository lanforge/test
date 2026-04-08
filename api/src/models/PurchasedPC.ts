import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchasedPC extends Document {
  serialNumber: string;
  order: mongoose.Types.ObjectId;
  color?: string; // e.g. "Black" or "White"
  customer?: mongoose.Types.ObjectId;
  product?: mongoose.Types.ObjectId; // If it's a pre-built or normal PC product
  customBuild?: mongoose.Types.ObjectId; // If it's a custom build
  name: string;
  specs: Record<string, string>; // The specs at the time of purchase (used primarily for regular Products)
  parts?: Array<{ // Used for custom builds
    partType: string;
    part?: mongoose.Types.ObjectId;
    name?: string;
    price?: number;
  }>;
  status: 'building' | 'benchmarking' | 'shipped' | 'delivered' | 'returned' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchasedPCSchema = new Schema<IPurchasedPC>(
  {
    serialNumber: { type: String, required: true, unique: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    customBuild: { type: Schema.Types.ObjectId, ref: 'CustomBuild' },
    name: { type: String, required: true },
    color: { type: String },
    specs: { type: Map, of: String, default: {} },
    parts: [{
      partType: { type: String },
      part: { type: Schema.Types.ObjectId, ref: 'PCPart' },
      name: { type: String },
      price: { type: Number }
    }],
    status: {
      type: String,
      enum: ['building', 'benchmarking', 'shipped', 'delivered', 'returned', 'cancelled'],
      default: 'building',
    },
    notes: { type: String },
  },
  { timestamps: true }
);

PurchasedPCSchema.index({ serialNumber: 1 });
PurchasedPCSchema.index({ order: 1 });
PurchasedPCSchema.index({ customer: 1 });

export default mongoose.model<IPurchasedPC>('PurchasedPC', PurchasedPCSchema);
