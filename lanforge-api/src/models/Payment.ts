import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  amount: number;
  currency: string;
  paymentMethod: string;
  gatewayTransactionId: string;
  order?: mongoose.Types.ObjectId;
  invoice?: mongoose.Types.ObjectId;
  customer?: mongoose.Types.ObjectId;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    paymentMethod: { type: String, default: 'stripe', required: true },
    gatewayTransactionId: { type: String, required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    invoice: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

paymentSchema.index({ gatewayTransactionId: 1 });
paymentSchema.index({ order: 1 });
paymentSchema.index({ invoice: 1 });
paymentSchema.index({ customer: 1 });

export default mongoose.model<IPayment>('Payment', paymentSchema);
