import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Order from '../models/Order';
import Product from '../models/Product';
import PCPart from '../models/PCPart';
import Accessory from '../models/Accessory';
import CustomBuild from '../models/CustomBuild';
import Customer from '../models/Customer';
import Discount from '../models/Discount';
import LoyaltyTransaction from '../models/LoyaltyTransaction';
import DonationCause from '../models/DonationCause';
import BusinessInfo from '../models/BusinessInfo';
import Payment from '../models/Payment';
import PurchasedPC from '../models/PurchasedPC';
import Partner from '../models/Partner';
import { protect, staffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// ─── FRONTEND ROUTES ─────────────────────────────────────────────────────────

// POST /api/orders — create order (frontend checkout)
router.post(
  '/',
  [
    body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
    body('shippingAddress').notEmpty().withMessage('Shipping address is required'),
    body('billingAddress').notEmpty().withMessage('Billing address is required'),
    body('paymentMethod').isIn(['stripe', 'paypal', 'affirm']).withMessage('Invalid payment method'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { items, shippingAddress, billingAddress, paymentMethod, discountCode, creatorCode, donationCause, donationAmount, customerId, shippingAmount, shippingRates, selectedShippingRate } = req.body;

      // Validate items and calculate subtotal
      let subtotal = 0;
      const validatedItems = [];

      for (const item of items) {
        if (item.product) {
          const p = await Product.findById(item.product);
          if (!p || !p.isActive) {
            res.status(400).json({ message: `Product not found: ${item.product}` });
            return;
          }
          subtotal += p.price * item.quantity;
          validatedItems.push({
            product: p._id,
            name: p.name,
            sku: p.sku,
            price: p.price,
            quantity: item.quantity,
            image: p.images?.[0],
          });
        } else if (item.pcPart) {
          const p = await PCPart.findById(item.pcPart);
          if (!p || !p.isActive) {
            res.status(400).json({ message: `Part not found: ${item.pcPart}` });
            return;
          }
          subtotal += p.price * item.quantity;
          validatedItems.push({
            pcPart: p._id,
            name: `${p.brand} ${p.partModel}`,
            sku: p.sku,
            price: p.price,
            quantity: item.quantity,
            image: p.images?.[0],
          });
        } else if (item.accessory) {
          const a = await Accessory.findById(item.accessory);
          if (!a || !a.isActive) {
            res.status(400).json({ message: `Accessory not found: ${item.accessory}` });
            return;
          }
          subtotal += a.price * item.quantity;
          validatedItems.push({
            accessory: a._id,
            name: a.name,
            sku: a.sku,
            price: a.price,
            quantity: item.quantity,
            image: a.images?.[0],
          });
        } else if (item.customBuild) {
          const cb = await CustomBuild.findById(item.customBuild);
          if (!cb) {
            res.status(400).json({ message: `Custom build not found: ${item.customBuild}` });
            return;
          }
          subtotal += cb.total * item.quantity;
          validatedItems.push({
            customBuild: cb._id,
            name: cb.name || 'Custom Build',
            sku: 'CUSTOM-BUILD',
            price: cb.total,
            quantity: item.quantity,
          });
        }
      }

      // Apply discount
      let discount = 0;
      let appliedDiscountId: any = null;
      let isFreeShippingDiscount = false;
      let appliedCreatorCode = creatorCode || null;

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
              _id: null,
              type: partner.customerDiscountType,
              value: partner.customerDiscountValue || 0,
              minOrder: 0,
              isCreatorCode: true
            };
            appliedCreatorCode = partner.creatorCode; // Automatically track as creator code usage too
          }
        }

        if (dc && subtotal >= dc.minOrder) {
          if (dc.type === 'percentage') discount = subtotal * (dc.value / 100);
          else if (dc.type === 'fixed') discount = Math.min(dc.value, subtotal);
          else if (dc.type === 'free_shipping') isFreeShippingDiscount = true;
          
          if (!dc.isCreatorCode) {
            appliedDiscountId = dc._id;
            dc.usedCount += 1;
            await dc.save();
          }
        }
      }

      // Shipping and Insurance
      let shipping = typeof shippingAmount === 'number' ? shippingAmount : 29.99;
      let shippingInsurance = req.body.shippingInsurance || 0;
      
      // Note: The frontend sends the calculated shippingAmount including insurance. 
      // If it's a free shipping discount, frontend already makes shipping cost 0.
      // And the new frontend logic makes the insurance cost 0 too.
      // So shippingAmount passed should already be correct. 
      // Just to be safe and enforce logic on the backend too:
      if (isFreeShippingDiscount) {
        shipping = 0;
        shippingInsurance = 0;
      }

      // Tax
      const businessInfo = await BusinessInfo.findOne() || {
        taxEnabled: true,
        taxRate: 8.0
      };
      const isTaxEnabled = businessInfo.taxEnabled !== false;
      const taxRateValue = (businessInfo.taxRate ?? 8.0) / 100;
      
      const tax = isTaxEnabled ? (subtotal - discount + shipping) * taxRateValue : 0;
      const parsedDonationAmount = Number(donationAmount) || 0;
      const total = subtotal - discount + shipping + shippingInsurance + tax + parsedDonationAmount;

      let lanforgeDonationAmount = 0;
      if (donationCause) {
        const cause = await DonationCause.findById(donationCause);
        if (cause) {
          // Assume product and customBuild are PCs
          const totalPCs = validatedItems.reduce((acc, item) => (item.product || item.customBuild) ? acc + item.quantity : acc, 0);
          lanforgeDonationAmount = cause.lanforgeContributionPerPC * totalPCs;
        }
      }

      // Generate order number
      let orderNumber = `LAN-${Math.floor(100000 + Math.random() * 900000)}`;
      while (await Order.exists({ orderNumber })) {
        orderNumber = `LAN-${Math.floor(100000 + Math.random() * 900000)}`;
      }

      // Reserve stock
      for (const item of validatedItems) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { reserved: item.quantity } });
        } else if (item.pcPart) {
          await PCPart.findByIdAndUpdate(item.pcPart, { $inc: { reserved: item.quantity } });
        } else if (item.accessory) {
          await Accessory.findByIdAndUpdate(item.accessory, { $inc: { reserved: item.quantity } });
        }
      }

      // Find or create customer based on email
      let finalCustomerId = customerId;
      if (shippingAddress?.email) {
        const existingCustomer = await Customer.findOne({ email: shippingAddress.email.toLowerCase() });
        if (existingCustomer) {
          finalCustomerId = existingCustomer._id;
          
          let updated = false;
          if (!existingCustomer.addresses) existingCustomer.addresses = [];
          
          const hasShipping = existingCustomer.addresses.some((a: any) => a.type === 'shipping' && a.street === shippingAddress.address);
          if (!hasShipping) {
            existingCustomer.addresses.push({
              type: 'shipping',
              firstName: shippingAddress.firstName,
              lastName: shippingAddress.lastName,
              street: shippingAddress.address || '',
              city: shippingAddress.city || '',
              state: shippingAddress.state || '',
              zip: shippingAddress.zip || '',
              country: shippingAddress.country || 'US',
            });
            updated = true;
          }

          const billingStreet = billingAddress.address || shippingAddress.address || '';
          const hasBilling = existingCustomer.addresses.some((a: any) => a.type === 'billing' && a.street === billingStreet);
          if (!hasBilling) {
            existingCustomer.addresses.push({
              type: 'billing',
              firstName: billingAddress.firstName || shippingAddress.firstName,
              lastName: billingAddress.lastName || shippingAddress.lastName,
              street: billingStreet,
              city: billingAddress.city || shippingAddress.city || '',
              state: billingAddress.state || shippingAddress.state || '',
              zip: billingAddress.zip || shippingAddress.zip || '',
              country: billingAddress.country || shippingAddress.country || 'US',
            });
            updated = true;
          }

          if (updated) {
            await existingCustomer.save();
          }
        } else {
          // Create new customer
          const newCustomer = await Customer.create({
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            email: shippingAddress.email.toLowerCase(),
            phone: shippingAddress.phone || '',
            addresses: [
              {
                type: 'shipping',
                firstName: shippingAddress.firstName,
                lastName: shippingAddress.lastName,
                street: shippingAddress.address || '',
                city: shippingAddress.city || '',
                state: shippingAddress.state || '',
                zip: shippingAddress.zip || '',
                country: shippingAddress.country || 'US',
              },
              {
                type: 'billing',
                firstName: billingAddress.firstName || shippingAddress.firstName,
                lastName: billingAddress.lastName || shippingAddress.lastName,
                street: billingAddress.address || shippingAddress.address || '',
                city: billingAddress.city || shippingAddress.city || '',
                state: billingAddress.state || shippingAddress.state || '',
                zip: billingAddress.zip || shippingAddress.zip || '',
                country: billingAddress.country || shippingAddress.country || 'US',
              }
            ],
            isActive: true,
            totalSpent: 0,
            totalOrders: 0,
            loyaltyPoints: 0,
          });
          finalCustomerId = newCustomer._id;
        }
      }

      // Loyalty points (1 point per dollar)
      let loyaltyPointsEarned = 0;
      if (finalCustomerId) {
        loyaltyPointsEarned = Math.floor(total);
      }

      const order = await Order.create({
        orderNumber,
        customer: finalCustomerId || undefined,
        guestEmail: !finalCustomerId ? shippingAddress.email : undefined,
        items: validatedItems,
        shippingAddress,
        billingAddress,
        subtotal,
        shipping,
        shippingInsurance,
        tax: parseFloat(tax.toFixed(2)),
        discount,
        appliedDiscount: appliedDiscountId || undefined,
        creatorCode: appliedCreatorCode ? appliedCreatorCode.toUpperCase() : undefined,
        donationCause: donationCause || undefined,
        donationAmount: parsedDonationAmount,
        lanforgeDonationAmount,
        total: parseFloat(total.toFixed(2)),
        paymentMethod,
        shippingRates: shippingRates || [],
        selectedShippingRate: selectedShippingRate || null,
        loyaltyPointsEarned,
      });

      // Create PurchasedPC records for PCs
      try {
        for (const item of validatedItems) {
          // If the item is a normal product, check if it's a PC
          if (item.product) {
            const p = await Product.findById(item.product).populate('parts');
            if (p) {
              // We consider it a PC if the category contains 'pc' or if it has computer-like specs.
              let hasSpecs = false;
              let rawSpecs: Record<string, string> = {};
              if (p.specs) {
                if (p.specs instanceof Map) {
                  hasSpecs = p.specs.size > 2;
                  rawSpecs = Object.fromEntries(p.specs);
                } else if (typeof p.specs === 'object') {
                  hasSpecs = Object.keys(p.specs).length > 2;
                  rawSpecs = p.specs as Record<string, string>;
                }
              }

              const categoryLower = p.category ? p.category.toLowerCase() : '';
              const isPC = (
                categoryLower.includes('pc') || 
                categoryLower.includes('desktop') || 
                categoryLower.includes('system') ||
                hasSpecs // Fallback: if it has many specs, it's likely a complex system
              );
              
              if (isPC) {
                // Map product parts
                const partsList: Array<any> = [];
                if (p.parts && p.parts.length > 0) {
                  p.parts.forEach((partObj: any) => {
                    const partName = `${partObj.brand} ${partObj.partModel}`;
                    partsList.push({
                      partType: partObj.type || 'Component',
                      part: partObj._id || undefined,
                      name: partName,
                      price: partObj.price || 0
                    });
                  });
                }

                for (let i = 0; i < item.quantity; i++) {
                  let serialNumber = `LAN-PC-${Math.floor(100000 + Math.random() * 900000)}`;
                  while (await PurchasedPC.exists({ serialNumber })) {
                    serialNumber = `LAN-PC-${Math.floor(100000 + Math.random() * 900000)}`;
                  }
                  
                  await PurchasedPC.create({
                    serialNumber,
                    order: order._id,
                    customer: finalCustomerId || undefined,
                    product: p._id,
                    name: p.name,
                    specs: rawSpecs,
                    parts: partsList,
                    status: 'building',
                  });
                }
              }
            }
          } else if (item.customBuild) {
            // It's a Custom Build
            const cb = await CustomBuild.findById(item.customBuild).populate('parts.part');
            if (cb) {
              // Map custom build parts
              const partsList: Array<any> = [];
              if (cb.parts && cb.parts.length > 0) {
                cb.parts.forEach((bp: any) => {
                  const partName = bp.part ? `${bp.part.brand} ${bp.part.partModel}` : bp.partType;
                  partsList.push({
                    partType: bp.partType,
                    part: bp.part?._id || undefined,
                    name: partName,
                    price: bp.part?.price || 0
                  });
                });
              }

              for (let i = 0; i < item.quantity; i++) {
                let serialNumber = `LAN-CB-${Math.floor(100000 + Math.random() * 900000)}`;
                while (await PurchasedPC.exists({ serialNumber })) {
                  serialNumber = `LAN-CB-${Math.floor(100000 + Math.random() * 900000)}`;
                }
                
                await PurchasedPC.create({
                  serialNumber,
                  order: order._id,
                  customer: finalCustomerId || undefined,
                  customBuild: cb._id,
                  name: cb.name || 'Custom Build',
                  specs: {}, // we store structured parts for custom builds instead of basic specs map
                  parts: partsList,
                  status: 'building',
                });
              }
            }
          }
        }
      } catch (pcErr) {
        console.error('Failed to create PurchasedPCs:', pcErr);
      }

      // Send notification
      try {
        const { sendNotification } = await import('../services/notificationService');
        await sendNotification(`New Order Created: ${orderNumber}\nTotal: $${total.toFixed(2)}\nCustomer: ${shippingAddress.firstName} ${shippingAddress.lastName} (${shippingAddress.email})\nPayment Method: ${paymentMethod}`);
      } catch (notifErr) {
        console.error('Failed to send notification:', notifErr);
      }

      res.status(201).json({ order });
    } catch (error) {
      res.status(500).json({ message: 'Server error creating order' });
    }
  }
);

// GET /api/orders/track — public: track by orderNumber + email
router.get('/track', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderNumber, email } = req.query;

    if (!orderNumber || !email) {
      res.status(400).json({ message: 'Order number and email are required' });
      return;
    }

    const order = await Order.findOne({ orderNumber }).select(
      'orderNumber status paymentStatus items subtotal shipping tax discount appliedDiscount total shippingAddress trackingNumber carrier createdAt updatedAt'
    ).populate('appliedDiscount', 'code type value');

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Verify email matches
    const orderEmail = order.shippingAddress.email;
    if (orderEmail.toLowerCase() !== (email as string).toLowerCase()) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/orders/customer/:customerId — frontend: customer's orders
router.get('/customer/:customerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({ customer: req.params.customerId })
      .sort({ createdAt: -1 })
      .select('orderNumber status paymentStatus items total createdAt trackingNumber carrier');

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/orders/:id — public: single order by id or orderNumber
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findOne({
      $or: [{ _id: req.params.id }, { orderNumber: req.params.id }],
    })
      .select('-__v')
      .populate('customer', 'firstName lastName email loyaltyPoints')
      .populate('appliedDiscount', 'code type value');

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// GET /api/orders/admin/all — admin/staff: full order list with filters
router.get('/admin/all', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const status = req.query.status as string;
    const paymentStatus = req.query.paymentStatus as string;
    const search = req.query.search as string;
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const filter: any = {};
    if (status && status !== 'all') filter.status = status;
    if (paymentStatus && paymentStatus !== 'all') filter.paymentStatus = paymentStatus;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { guestEmail: { $regex: search, $options: 'i' } },
        { 'shippingAddress.email': { $regex: search, $options: 'i' } },
        { 'shippingAddress.firstName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.lastName': { $regex: search, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customer', 'firstName lastName email')
        .populate('appliedDiscount', 'code type value'),
      Order.countDocuments(filter),
    ]);

    res.json({ orders, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/orders/:id/status — admin/staff: update order status
router.put('/:id/status', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, trackingNumber, carrier, notes } = req.body;

    const validStatuses = [
      'order-confirmed',
      'building',
      'benchmarking',
      'shipped',
      'out-for-delivery',
      'delivered',
      'returned',
      'cancelled'
    ];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const update: any = { status };
    if (trackingNumber) update.trackingNumber = trackingNumber;
    if (carrier) update.carrier = carrier;
    if (notes) update.notes = notes;

    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('customer', 'firstName lastName email')
      .populate('appliedDiscount', 'code type value');

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // If delivered and has a customer, update stats and award loyalty points
    if (status === 'delivered' && order.customer) {
      const customer = await Customer.findById(order.customer);
      if (customer) {
        const before = customer.loyaltyPoints;
        if (order.loyaltyPointsEarned > 0) {
          customer.loyaltyPoints += order.loyaltyPointsEarned;
        }
        customer.totalSpent += order.total;
        customer.totalOrders += 1;
        await customer.save();

        if (order.loyaltyPointsEarned > 0) {
          await LoyaltyTransaction.create({
            customer: customer._id,
            order: order._id,
            points: order.loyaltyPointsEarned,
            type: 'earn',
            reason: `Order ${order.orderNumber} delivered`,
            balanceBefore: before,
            balanceAfter: customer.loyaltyPoints,
          });
        }
      }
    }

    // Release reserved stock if cancelled
    if (status === 'cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { reserved: -item.quantity },
        });
      }
    }

    // Confirm stock deduction if shipped
    if (status === 'shipped') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity, reserved: -item.quantity },
        });
      }
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/orders/:id/payment-status — admin/staff
router.put('/:id/payment-status', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentStatus } = req.body;
    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validStatuses.includes(paymentStatus)) {
      res.status(400).json({ message: 'Invalid payment status' });
      return;
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true }
    );

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/orders/:id/notes — admin/staff
router.put('/:id/notes', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { notes: req.body.notes },
      { new: true }
    );
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/orders/:id — admin/staff: update order details and items
router.put('/:id', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items, shippingAddress, billingAddress, shipping, shippingInsurance, donationAmount } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (shippingAddress) order.shippingAddress = shippingAddress;
    if (billingAddress) order.billingAddress = billingAddress;
    if (typeof shipping === 'number') order.shipping = shipping;
    if (typeof shippingInsurance === 'number') order.shippingInsurance = shippingInsurance;
    if (typeof donationAmount === 'number') order.donationAmount = donationAmount;

    if (items && Array.isArray(items)) {
      order.items = items;
      
      // Recalculate subtotal
      let subtotal = 0;
      for (const item of items) {
        subtotal += (Number(item.price) || 0) * (Number(item.quantity) || 1);
      }
      order.subtotal = subtotal;

      // Recalculate tax
      const businessInfo = await BusinessInfo.findOne() || {
        taxEnabled: true,
        taxRate: 8.0
      };
      const isTaxEnabled = businessInfo.taxEnabled !== false;
      const taxRateValue = (businessInfo.taxRate ?? 8.0) / 100;
      
      const tax = isTaxEnabled ? (subtotal - order.discount + order.shipping) * taxRateValue : 0;
      order.tax = parseFloat(tax.toFixed(2));
      
      // Recalculate total
      const total = subtotal - order.discount + order.shipping + order.shippingInsurance + order.tax + (order.donationAmount || 0);
      order.total = parseFloat(total.toFixed(2));
    }

    await order.save();
    
    const updatedOrder = await Order.findById(req.params.id).populate('customer', 'firstName lastName email loyaltyPoints').populate('appliedDiscount', 'code type value');
    res.json({ order: updatedOrder });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/orders/bulk/status — admin/staff: bulk status update
router.post('/bulk/status', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'No order IDs provided' });
      return;
    }

    const result = await Order.updateMany({ _id: { $in: ids } }, { status });
    res.json({ message: `Updated ${result.modifiedCount} orders` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;