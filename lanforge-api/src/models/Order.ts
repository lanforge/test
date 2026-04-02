import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
  product?: mongoose.Types.ObjectId;
  pcPart?: mongoose.Types.ObjectId;
  accessory?: mongoose.Types.ObjectId;
  customBuild?: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface IAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  customer?: mongoose.Types.ObjectId;
  guestEmail?: string;
  items: IOrderItem[];
  shippingAddress: IAddress;
  billingAddress: IAddress;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  discountCode?: string;
  creatorCode?: string; // Links to Partner/Affiliate
  donationCause?: mongoose.Types.ObjectId;
  donationAmount?: number;
  lanforgeDonationAmount?: number;
  total: number;
  status: 'order-confirmed' | 'building' | 'benchmarking' | 'shipped' | 'out-for-delivery' | 'delivered' | 'returned' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: 'stripe' | 'paypal' | 'affirm';
  paymentId?: string;
  trackingNumber?: string;
  carrier?: string;
  shippingRates?: any[];
  selectedShippingRate?: any;
  notes?: string;
  loyaltyPointsEarned: number;
  loyaltyPointsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  pcPart: { type: Schema.Types.ObjectId, ref: 'PCPart' },
  accessory: { type: Schema.Types.ObjectId, ref: 'Accessory' },
  customBuild: { type: Schema.Types.ObjectId, ref: 'CustomBuild' },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String },
});

const AddressSchema = new Schema<IAddress>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
  country: { type: String, required: true, default: 'US' },
});

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    guestEmail: { type: String },
    items: [OrderItemSchema],
    shippingAddress: { type: AddressSchema, required: true },
    billingAddress: { type: AddressSchema, required: true },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    discountCode: { type: String },
    creatorCode: { type: String },
    donationCause: { type: Schema.Types.ObjectId, ref: 'DonationCause' },
    donationAmount: { type: Number, default: 0 },
    lanforgeDonationAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        'order-confirmed',
        'building',
        'benchmarking',
        'shipped',
        'out-for-delivery',
        'delivered',
        'returned',
        'cancelled'
      ],
      default: 'order-confirmed',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: { type: String, enum: ['stripe', 'paypal', 'affirm'], required: true },
    paymentId: { type: String },
    trackingNumber: { type: String },
    carrier: { type: String },
    shippingRates: [{ type: Schema.Types.Mixed }],
    selectedShippingRate: { type: Schema.Types.Mixed },
    notes: { type: String },
    loyaltyPointsEarned: { type: Number, default: 0 },
    loyaltyPointsUsed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ customer: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ creatorCode: 1 });

export default mongoose.model<IOrder>('Order', OrderSchema);