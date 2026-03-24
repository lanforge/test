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
      const { items, shippingAddress, billingAddress, paymentMethod, discountCode, creatorCode, customerId, shippingAmount } = req.body;

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
            name: p.name,
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
      let appliedCode: string | undefined;
      if (discountCode) {
        const dc = await Discount.findOne({
          code: discountCode.toUpperCase(),
          status: 'active',
          expiresAt: { $gte: new Date() },
        });
        if (dc && subtotal >= dc.minOrder) {
          if (dc.type === 'percentage') discount = subtotal * (dc.value / 100);
          else if (dc.type === 'fixed') discount = Math.min(dc.value, subtotal);
          appliedCode = dc.code;
          dc.usedCount += 1;
          await dc.save();
        }
      }

      // Shipping
      const shipping = typeof shippingAmount === 'number' ? shippingAmount : 29.99;

      // Tax (8%)
      const TAX_RATE = 0.08;
      const tax = (subtotal - discount + shipping) * TAX_RATE;
      const total = subtotal - discount + shipping + tax;

      // Generate order number
      const orderNumber = `LF-${Date.now().toString(36).toUpperCase()}`;

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

      // Loyalty points (1 point per dollar)
      let loyaltyPointsEarned = 0;
      if (customerId) {
        loyaltyPointsEarned = Math.floor(total);
      }

      const order = await Order.create({
        orderNumber,
        customer: customerId || undefined,
        guestEmail: !customerId ? shippingAddress.email : undefined,
        items: validatedItems,
        shippingAddress,
        billingAddress,
        subtotal,
        shipping,
        tax: parseFloat(tax.toFixed(2)),
        discount,
        discountCode: appliedCode,
        creatorCode: creatorCode ? creatorCode.toUpperCase() : undefined,
        total: parseFloat(total.toFixed(2)),
        paymentMethod,
        loyaltyPointsEarned,
      });

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
      'orderNumber status paymentStatus items subtotal shipping tax discount total shippingAddress trackingNumber carrier createdAt updatedAt'
    );

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
      .populate('customer', 'firstName lastName email loyaltyPoints');

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
        .populate('customer', 'firstName lastName email'),
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

    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true }).populate(
      'customer',
      'firstName lastName email'
    );

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // If delivered and has a customer, award loyalty points
    if (status === 'delivered' && order.customer && order.loyaltyPointsEarned > 0) {
      const customer = await Customer.findById(order.customer);
      if (customer) {
        const before = customer.loyaltyPoints;
        customer.loyaltyPoints += order.loyaltyPointsEarned;
        customer.totalSpent += order.total;
        customer.totalOrders += 1;
        await customer.save();

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