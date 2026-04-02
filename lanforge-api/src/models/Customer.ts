import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  addresses: {
    type: 'shipping' | 'billing' | 'both';
    firstName?: string;
    lastName?: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  }[];
  loyaltyPoints: number;
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  totalSpent: number;
  totalOrders: number;
  tags: string[];
  notes?: string;
  isActive: boolean;
  marketingOptIn: boolean;
  birthday?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    addresses: [
      {
        type: { type: String, enum: ['shipping', 'billing', 'both'], required: true },
        firstName: String,
        lastName: String,
        street: String,
        city: String,
        state: String,
        zip: String,
        country: { type: String, default: 'US' },
      },
    ],
    loyaltyPoints: { type: Number, default: 0 },
    loyaltyTier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      default: 'Bronze',
    },
    totalSpent: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    tags: [{ type: String }],
    notes: { type: String },
    isActive: { type: Boolean, default: true },
    marketingOptIn: { type: Boolean, default: false },
    birthday: { type: Date },
  },
  { timestamps: true }
);

CustomerSchema.index({ email: 1 });
CustomerSchema.index({ loyaltyTier: 1 });
CustomerSchema.index({ totalSpent: -1 });

// Auto-update loyalty tier based on points
CustomerSchema.pre('save', function (next) {
  const points = this.loyaltyPoints;
  if (points >= 15000) this.loyaltyTier = 'Platinum';
  else if (points >= 5000) this.loyaltyTier = 'Gold';
  else if (points >= 1000) this.loyaltyTier = 'Silver';
  else this.loyaltyTier = 'Bronze';
  next();
});

export default mongoose.model<ICustomer>('Customer', CustomerSchema);