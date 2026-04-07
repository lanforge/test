import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Product from '../models/Product';
import PCPart from '../models/PCPart';
import Accessory from '../models/Accessory';
import CustomBuild from '../models/CustomBuild';
import Discount from '../models/Discount';
import Partner from '../models/Partner';
import Customer from '../models/Customer';
import BusinessInfo from '../models/BusinessInfo';

const router = Router();

// POST /api/checkout/validate — run right before confirming order logic
router.post(
  '/validate',
  [
    body('items').isArray({ min: 1 }).withMessage('Cart is empty'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { items, discountCode, creatorCode, customerId } = req.body;

      let subtotal = 0;
      const issues: string[] = [];

      for (const item of items) {
        if (item.product) {
          const p = await Product.findById(item.product);
          if (!p || !p.isActive) { issues.push(`Product unavailable: ${p?.name || item.product}`); continue; }
          if (p.stock - p.reserved < item.quantity) issues.push(`Insufficient stock for ${p.name}`);
          subtotal += p.price * item.quantity;
        } else if (item.pcPart) {
          const p = await PCPart.findById(item.pcPart);
          if (!p || !p.isActive) { issues.push(`Part unavailable: ${p ? `${p.brand} ${p.partModel}` : item.pcPart}`); continue; }
          if (p.stock - p.reserved < item.quantity) issues.push(`Insufficient stock for ${p.brand} ${p.partModel}`);
          subtotal += p.price * item.quantity;
        } else if (item.accessory) {
          const a = await Accessory.findById(item.accessory);
          if (!a || !a.isActive) { issues.push(`Accessory unavailable: ${a?.name || item.accessory}`); continue; }
          if (a.stock - a.reserved < item.quantity) issues.push(`Insufficient stock for ${a.name}`);
          subtotal += a.price * item.quantity;
        } else if (item.customBuild) {
          const cb = await CustomBuild.findById(item.customBuild);
          if (!cb) { issues.push(`Custom build not found: ${item.customBuild}`); continue; }
          // Ensure we only add the subtotal from the custom build, because total includes labor fee 
          // which should be preserved but not double-counted or misrepresented.
          // Wait, actually, the user pays the TOTAL for a custom build. The CartPage shows Items Subtotal as `total - laborFee`.
          // We should just add the entire `cb.total` to subtotal, because `cb.total` is what the user pays.
          // The issue was that the `CustomBuild` was being saved with total = 1900 instead of 2100 due to backend overwriting it.
          subtotal += cb.total * item.quantity;
        }
      }

      if (issues.length > 0) {
        res.status(400).json({ valid: false, issues });
        return;
      }

      let discountAmount = 0;
      let appliedDiscount = null;
      let appliedCreatorCode = null;

      // Validate Creator Code directly (if passed as creatorCode)
      if (creatorCode) {
        const cc = await Partner.findOne({ creatorCode: creatorCode.toUpperCase(), isActive: true });
        if (!cc) issues.push('Invalid creator code');
        else appliedCreatorCode = cc.creatorCode;
      }

      // Validate Discount (or Creator Code passed as discount)
      if (discountCode) {
        let dc: any = await Discount.findOne({
          code: discountCode.toUpperCase(),
          status: 'active',
          expiresAt: { $gte: new Date() },
        });

        if (!dc) {
          // Check if it's a partner creator code with a discount
          const partner = await Partner.findOne({ creatorCode: discountCode.toUpperCase(), isActive: true });
          if (partner && partner.customerDiscountType) {
            dc = {
              _id: partner._id,
              code: partner.creatorCode,
              type: partner.customerDiscountType,
              value: partner.customerDiscountValue || 0,
              minOrder: 0,
              isCreatorCode: true
            };
            appliedCreatorCode = partner.creatorCode; // Automatically track as creator code usage too
          }
        }

        if (!dc || subtotal < dc.minOrder) {
          issues.push('Invalid or expired discount code, or minimum order not met');
        } else {
          if (dc.type === 'percentage') discountAmount = subtotal * (dc.value / 100);
          else if (dc.type === 'fixed') discountAmount = Math.min(dc.value, subtotal);
          else if (dc.type === 'free_shipping') discountAmount = 0;
          appliedDiscount = dc;
        }
      }
      
      // Validate Customer (if logged in)
      if (customerId) {
        const cust = await Customer.findById(customerId);
        if (!cust || !cust.isActive) issues.push('Customer account not active');
      }

      if (issues.length > 0) {
        res.status(400).json({ valid: false, issues });
        return;
      }

      // Fetch dynamic settings from database
      const businessInfo = await BusinessInfo.findOne() || {
        freeShippingThreshold: 500,
        flatShippingRate: 29.99,
        taxEnabled: true,
        taxRate: 8.0
      };

      const FREE_SHIPPING_THRESHOLD = businessInfo.freeShippingThreshold || 500;
      const FLAT_RATE = businessInfo.flatShippingRate ?? 29.99;
      const shipping = (subtotal - discountAmount >= FREE_SHIPPING_THRESHOLD) ? 0 : FLAT_RATE;
      
      const isTaxEnabled = businessInfo.taxEnabled !== false;
      const taxRateValue = (businessInfo.taxRate ?? 8.0) / 100; // Convert 8.0 to 0.08
      
      const isFreeShippingDiscount = appliedDiscount && appliedDiscount.type === 'free_shipping';
      
      const tax = isTaxEnabled ? (subtotal - discountAmount + shipping) * taxRateValue : 0;
      const total = subtotal - discountAmount + shipping + tax;

      res.json({
        valid: true,
        summary: {
          subtotal,
          discountAmount,
          shipping,
          tax,
          total,
          appliedDiscount,
          appliedCreatorCode,
          isFreeShippingDiscount
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error during validation' });
    }
  }
);

export default router;
