import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAffiliateStats {
  clicks: number;
  referrals: number;
  totalRevenue: number;
  commissionEarned: number;
  commissionPaid: number;
}

export interface IPartner extends Document {
  name: string;
  email: string;
  password?: string;
  creatorCode: string; // e.g. 'LANFORGE10'
  commissionRate: number; // e.g. 5 for 5%
  isPartner: boolean; // true = Partner, false = Affiliate
  
  // Profile
  website?: string;
  logo?: string;
  description?: string;

  // Customer Discount (if any)
  customerDiscountType?: 'percentage' | 'fixed' | 'free_shipping';
  customerDiscountValue?: number;
  
  // Socials
  twitter?: string;
  twitch?: string;
  youtube?: string;
  instagram?: string;
  tiktok?: string;
  
  // Stats
  stats: IAffiliateStats;
  
  // Meta
  sortOrder: number;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
}

const PartnerSchema = new Schema<IPartner>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, minlength: 8 },
    creatorCode: { type: String, required: true, unique: true, uppercase: true },
    commissionRate: { type: Number, default: 5 },
    isPartner: { type: Boolean, default: false },

    customerDiscountType: { type: String, enum: ['percentage', 'fixed', 'free_shipping'] },
    customerDiscountValue: { type: Number, min: 0 },

    website: { type: String },
    logo: { type: String },
    description: { type: String },

    twitter: { type: String },
    twitch: { type: String },
    youtube: { type: String },
    instagram: { type: String },
    tiktok: { type: String },

    stats: {
      clicks: { type: Number, default: 0 },
      referrals: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      commissionEarned: { type: Number, default: 0 },
      commissionPaid: { type: Number, default: 0 },
    },

    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

PartnerSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

PartnerSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

PartnerSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete (ret as any).password;
    return ret;
  },
});

PartnerSchema.index({ isActive: 1, sortOrder: 1 });
PartnerSchema.index({ creatorCode: 1 });

export default mongoose.model<IPartner>('Partner', PartnerSchema);
