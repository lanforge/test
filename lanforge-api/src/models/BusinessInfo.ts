import mongoose, { Document, Schema } from 'mongoose';

export interface IBusinessInfo extends Document {
  storeName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  taxRate: number;
  taxEnabled: boolean;
  currency: string;
  flatShippingRate: number;
  freeShippingThreshold: number;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
  comingSoonMode?: boolean;
  comingSoonDate?: Date;
  updatedAt: Date;
}

const BusinessInfoSchema = new Schema<IBusinessInfo>(
  {
    storeName: { type: String, required: true, default: 'LANForge' },
    email: { type: String, required: true, default: 'support@lanforge.com' },
    phone: { type: String, default: '' },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
      country: { type: String, default: 'US' },
    },
    taxRate: { type: Number, default: 8.0 },
    taxEnabled: { type: Boolean, default: true },
    currency: { type: String, default: 'USD' },
    flatShippingRate: { type: Number, default: 29.99 },
    freeShippingThreshold: { type: Number, default: 500 },
    socialLinks: {
      facebook: String,
      twitter: String,
      instagram: String,
      youtube: String,
    },
    comingSoonMode: { type: Boolean, default: false },
    comingSoonDate: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model<IBusinessInfo>('BusinessInfo', BusinessInfoSchema);
