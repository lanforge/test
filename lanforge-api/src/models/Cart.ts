import mongoose, { Document, Schema } from 'mongoose';

export interface ICartItem {
  product?: mongoose.Types.ObjectId;
  pcPart?: mongoose.Types.ObjectId;
  accessory?: mongoose.Types.ObjectId;
  customBuild?: mongoose.Types.ObjectId;
  quantity: number;
}

export interface ICart extends Document {
  sessionId: string; // for guest users
  customer?: mongoose.Types.ObjectId; // for logged in users
  items: ICartItem[];
  discountCode?: string;
  customDiscountAmount?: number;
  creatorCode?: string;
  donationCause?: mongoose.Types.ObjectId;
  status: 'active' | 'abandoned' | 'converted';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  pcPart: { type: Schema.Types.ObjectId, ref: 'PCPart' },
  accessory: { type: Schema.Types.ObjectId, ref: 'Accessory' },
  customBuild: { type: Schema.Types.ObjectId, ref: 'CustomBuild' },
  quantity: { type: Number, required: true, min: 1 },
}, { _id: false });

const CartSchema = new Schema<ICart>(
  {
    sessionId: { type: String, required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    items: [CartItemSchema],
    discountCode: { type: String },
    customDiscountAmount: { type: Number, default: 0 },
    creatorCode: { type: String },
    donationCause: { type: Schema.Types.ObjectId, ref: 'DonationCause' },
    status: {
      type: String,
      enum: ['active', 'abandoned', 'converted'],
      default: 'active',
    },
    expiresAt: { 
      type: Date, 
      required: true,
      default: () => new Date(+new Date() + 30 * 24 * 60 * 60 * 1000) // 30 days
    },
  },
  { timestamps: true }
);

CartSchema.index({ sessionId: 1 });
CartSchema.index({ customer: 1 });
CartSchema.index({ status: 1 });
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired carts

export default mongoose.model<ICart>('Cart', CartSchema);
