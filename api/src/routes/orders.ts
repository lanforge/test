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
import { sendOrderStatusUpdate, sendOrderConfirmation } from '../services/emailService';

const FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL || 'support@lanforge.co';
const FROM_NAME = process.env.POSTMARK_FROM_NAME || 'LANForge';

const router = Router();

const activeConnections = new Map<string, Response>();

export const notifyOrderUpdated = (orderId: string) => {
  const res = activeConnections.get(orderId);
  if (res) {
    res.write('event: order_update\n');
    res.write(`data: ${JSON.stringify({ type: 'update', timestamp: Date.now() })}\n\n`);
    
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }
  }
};

// ─── FRONTEND ROUTES ─────────────────────────────────────────────────────────

// Helper export so other routes can notify order updates
// This is already exported as notifyOrderUpdated above

// GET /api/orders/stream/:orderId — SSE endpoint for real-time order updates
router.get('/stream/:orderId', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const orderId = req.params.orderId;
  
  if (activeConnections.has(orderId)) {
    activeConnections.get(orderId)?.end();
  }
  
  activeConnections.set(orderId, res);

  res.write('event: connected\n');
  res.write(`data: ${JSON.stringify({ type: 'connected', orderId })}\n\n`);

  const heartbeatId = setInterval(() => {
    if (activeConnections.has(orderId) && activeConnections.get(orderId) === res) {
      res.write('event: heartbeat\n');
      res.write(`data: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    } else {
      clearInterval(heartbeatId);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeatId);
    if (activeConnections.get(orderId) === res) {
      activeConnections.delete(orderId);
    }
  });
});

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
            notes: item.notes,
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
            notes: item.notes,
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
            notes: item.notes,
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
            notes: item.notes,
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
                  
                  // Extract color from notes if available
                  let color: string | undefined = undefined;
                  if (item.notes && item.notes.includes('Case Color:')) {
                    const match = item.notes.match(/Case Color:\s*([^\n,]+)/i);
                    if (match) {
                      color = match[1].trim();
                    }
                  }

                  await PurchasedPC.create({
                    serialNumber,
                    order: order._id,
                    customer: finalCustomerId || undefined,
                    product: p._id,
                    name: p.name,
                    color,
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
                  const partName = bp.part ? `${bp.part.brand} ${bp.part.partModel}` : `No ${bp.partType.charAt(0).toUpperCase() + bp.partType.slice(1)} Selected`;
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
                
                // Extract color from cb.notes or item.notes if available
                let color: string | undefined = undefined;
                const notesStr = cb.notes || item.notes || '';
                if (notesStr && notesStr.includes('Case Color:')) {
                  const match = notesStr.match(/Case Color:\s*([^\n,]+)/i);
                  if (match) {
                    color = match[1].trim();
                  }
                }

                await PurchasedPC.create({
                  serialNumber,
                  order: order._id,
                  customer: finalCustomerId || undefined,
                  customBuild: cb._id,
                  name: cb.name || 'Custom Build',
                  color,
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

    let orderObj = order.toObject();

    // Mask sensitive shipping information to prevent brute-forcing order numbers for PII
    if (orderObj.shippingAddress) {
      orderObj.shippingAddress = {
        city: orderObj.shippingAddress.city,
        state: orderObj.shippingAddress.state,
        country: orderObj.shippingAddress.country,
        // Omit firstName, lastName, email, phone, address, zip
      } as any;
    }

    res.json({ order: orderObj });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/orders/customer/:customerId — frontend: customer's orders
router.get('/customer/:customerId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Only allow users to view their own orders, unless they are staff/admin
    if (req.user?.role !== 'admin' && req.user?.role !== 'staff' && req.user?._id?.toString() !== req.params.customerId) {
      res.status(403).json({ message: 'Not authorized to view these orders' });
      return;
    }

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
    const { id } = req.params;
    const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
    
    const query = isObjectId 
      ? { $or: [{ _id: id }, { orderNumber: id }] }
      : { orderNumber: id };

    // We do NOT populate customer here to avoid leaking PII on public endpoints
    const order = await Order.findOne(query)
      .select('-__v -billingAddress')
      .populate('appliedDiscount', 'code type value');

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    let orderObj = order.toObject();
    
    // Mask sensitive shipping information for public endpoint
    if (orderObj.shippingAddress) {
      orderObj.shippingAddress = {
        city: orderObj.shippingAddress.city,
        state: orderObj.shippingAddress.state,
        country: orderObj.shippingAddress.country,
        // Omit firstName, lastName, email, phone, address, zip
      } as any;
    }

    res.json({ order: orderObj });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// GET /api/orders/admin/:id — admin/staff: single order with full details (no PII masking)
router.get('/admin/:id', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
    
    const query = isObjectId 
      ? { $or: [{ _id: id }, { orderNumber: id }] }
      : { orderNumber: id };

    const order = await Order.findOne(query)
      .populate('customer')
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

    notifyOrderUpdated(order._id.toString());
    notifyOrderUpdated(order.orderNumber);

    try {
      const email = order.shippingAddress?.email || order.guestEmail;
      if (email) {
        await sendOrderStatusUpdate({
          email,
          orderNumber: order.orderNumber,
          customerName: order.shippingAddress?.firstName || 'Customer',
          status,
          trackingNumber,
          carrier
        });
      }
    } catch (emailErr) {
      console.error('Failed to send order status update email:', emailErr);
    }

    res.json({ order });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Server error updating order status: ' + error.message });
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
      
      const discount = order.discount || 0;
      const shipping = order.shipping || 0;
      const shippingInsurance = order.shippingInsurance || 0;
      const donationAmountAmt = order.donationAmount || 0;
      
      const tax = isTaxEnabled ? (subtotal - discount + shipping) * taxRateValue : 0;
      order.tax = parseFloat(tax.toFixed(2));
      
      // Recalculate total
      const taxAmt = order.tax || 0;
      const total = subtotal - discount + shipping + shippingInsurance + taxAmt + donationAmountAmt;
      order.total = parseFloat(total.toFixed(2));
    }

    await order.save();
    
    const updatedOrder = await Order.findById(req.params.id).populate('customer', 'firstName lastName email loyaltyPoints').populate('appliedDiscount', 'code type value');
    res.json({ order: updatedOrder });
  } catch (error: any) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Server error updating order: ' + error.message });
  }
});

// POST /api/orders/admin — admin: manual order creation
router.post('/admin', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customer, items, status, paymentStatus, paymentMethod, subtotal, shipping, shippingInsurance, tax, total } = req.body;
    
    // Minimal validation
    if (!items || !items.length) {
      res.status(400).json({ message: 'Items are required' });
      return;
    }

    // Generate random order number
    let orderNumber = `LAN-${Math.floor(100000 + Math.random() * 900000)}`;
    while (await Order.exists({ orderNumber })) {
      orderNumber = `LAN-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    // Look up customer to get their address if possible
    let shippingAddress = {
      firstName: 'Manual',
      lastName: 'Order',
      email: 'manual@order.local',
      phone: 'N/A',
      address: 'N/A',
      city: 'N/A',
      state: 'N/A',
      zip: '00000',
      country: 'US'
    };

    if (customer) {
      const cust = await Customer.findById(customer);
      if (cust) {
        shippingAddress = {
          firstName: cust.firstName || 'Manual',
          lastName: cust.lastName || 'Order',
          email: cust.email || 'manual@order.local',
          phone: cust.phone || 'N/A',
          address: cust.addresses?.[0]?.street || 'N/A',
          city: cust.addresses?.[0]?.city || 'N/A',
          state: cust.addresses?.[0]?.state || 'N/A',
          zip: cust.addresses?.[0]?.zip || '00000',
          country: cust.addresses?.[0]?.country || 'US'
        };
      }
    }

    // Force N/A for empty strings
    if (!shippingAddress.phone || shippingAddress.phone.trim() === '') shippingAddress.phone = 'N/A';
    if (!shippingAddress.address || shippingAddress.address.trim() === '') shippingAddress.address = 'N/A';
    if (!shippingAddress.city || shippingAddress.city.trim() === '') shippingAddress.city = 'N/A';
    if (!shippingAddress.state || shippingAddress.state.trim() === '') shippingAddress.state = 'N/A';
    if (!shippingAddress.zip || shippingAddress.zip.trim() === '') shippingAddress.zip = '00000';

    const order = new Order({
      orderNumber,
      customer: customer || undefined,
      guestEmail: shippingAddress.email,
      items,
      shippingAddress,
      billingAddress: shippingAddress,
      subtotal,
      isAdminCreated: true,
      shipping,
      shippingInsurance,
      tax,
      discount: 0,
      total,
      status,
      paymentStatus,
      paymentMethod,
    });

    console.log('Creating Admin Order with shippingAddress:', shippingAddress);
    await order.save();

    // Create PurchasedPC for custom line items and assign Custom Builds
    try {
      for (const item of items) {
        // If inline custom build parts are provided, create the CustomBuild document on the fly
        if (item.sku === 'CUSTOM-BUILD' && !item.customBuild && item.customBuildParts) {
          const crypto = await import('crypto');
          const CustomBuild = (await import('../models/CustomBuild')).default;
          
          const buildId = crypto.randomBytes(4).toString('hex').toUpperCase();
          
          let cbSerialNumber = `LAN-CB-${Math.floor(100000 + Math.random() * 900000)}`;
          while (await CustomBuild.exists({ serialNumber: cbSerialNumber })) {
            cbSerialNumber = `LAN-CB-${Math.floor(100000 + Math.random() * 900000)}`;
          }

          const cb = await CustomBuild.create({
            buildId,
            name: item.name || 'Custom Build',
            customer: customer || undefined,
            guestEmail: shippingAddress.email,
            parts: item.customBuildParts,
            subtotal: item.price,
            laborFee: 99.99,
            total: item.price,
            status: 'purchased',
            order: order._id,
            serialNumber: cbSerialNumber
          });
          
          item.customBuild = cb._id;
          
          // Also link it into the order item just in case
          const orderItemIndex = order.items.findIndex((i: any) => i.sku === 'CUSTOM-BUILD' && i.name === item.name);
          if (orderItemIndex !== -1) {
            order.items[orderItemIndex].customBuild = cb._id;
            await order.save();
          }
        }

        if (item.sku === 'CUSTOM') {
          for (let i = 0; i < item.quantity; i++) {
            let serialNumber = `LAN-CB-${Math.floor(100000 + Math.random() * 900000)}`;
            while (await PurchasedPC.exists({ serialNumber })) {
              serialNumber = `LAN-CB-${Math.floor(100000 + Math.random() * 900000)}`;
            }

            await PurchasedPC.create({
              serialNumber,
              order: order._id,
              customer: customer || undefined,
              name: item.name || 'Custom Build',
              specs: {},
              parts: [],
              status: 'building',
            });
          }
        } else if (item.customBuild) {
          // If this was an imported custom build, update its status and assign order
          const build = await CustomBuild.findById(item.customBuild).populate('parts.part');
          if (build) {
            build.order = order._id;
            build.status = 'purchased';
            if (!build.serialNumber) {
              let sn = `LAN-CB-${Math.floor(100000 + Math.random() * 900000)}`;
              while (await CustomBuild.exists({ serialNumber: sn })) {
                sn = `LAN-CB-${Math.floor(100000 + Math.random() * 900000)}`;
              }
              build.serialNumber = sn;
            }
            await build.save();

            // Map custom build parts
            const partsList: Array<any> = [];
            if (build.parts && build.parts.length > 0) {
              build.parts.forEach((bp: any) => {
                const partName = bp.part ? `${bp.part.brand} ${bp.part.partModel}` : `No ${bp.partType.charAt(0).toUpperCase() + bp.partType.slice(1)} Selected`;
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
              
              let color: string | undefined = undefined;
              const notesStr = build.notes || item.notes || '';
              if (notesStr && notesStr.includes('Case Color:')) {
                const match = notesStr.match(/Case Color:\s*([^\n,]+)/i);
                if (match) {
                  color = match[1].trim();
                }
              }

              await PurchasedPC.create({
                serialNumber,
                order: order._id,
                customer: customer || undefined,
                customBuild: build._id,
                name: build.name || 'Custom Build',
                color,
                specs: {},
                parts: partsList,
                status: 'building',
              });
            }
          }
        }
      }
    } catch (pcErr) {
      console.error('Failed to process custom items for admin order:', pcErr);
    }

    // Send Notification
    try {
      const { sendNotification } = await import('../services/notificationService');
      const safeTotal = typeof total === 'number' && !isNaN(total) ? total : 0;
      await sendNotification(`Manual Order Created: ${orderNumber}\nTotal: $${safeTotal.toFixed(2)}\nCustomer: ${shippingAddress.firstName} ${shippingAddress.lastName} (${shippingAddress.email})\nPayment Method: ${paymentMethod}`);
    } catch (notifErr) {
      console.error('Failed to send notification for admin order:', notifErr);
    }

    // Send Email
    try {
      if (shippingAddress.email && shippingAddress.email !== 'manual@order.local') {
        const orderPlain = order.toObject();
        // Format items for email
        const formattedItems = orderPlain.items.map((i: any) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          image: i.image || 'https://lanforge.co/lanforge.png'
        }));
        
        await sendOrderConfirmation({
          email: shippingAddress.email,
          orderNumber: order.orderNumber,
          customerName: shippingAddress.firstName,
          items: formattedItems,
          total: order.total,
          subtotal: order.subtotal,
          shipping: order.shipping,
          tax: order.tax,
          shippingAddress: order.shippingAddress,
          shippingInsurance: order.shippingInsurance,
          discount: order.discount,
        });
      }
    } catch (emailErr) {
      console.error('Failed to send confirmation email for admin order:', emailErr);
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Failed to create admin order', error);
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
    
    // Notify all affected orders and send emails
    const updatedOrders = await Order.find({ _id: { $in: ids } }).populate('shippingAddress guestEmail orderNumber');
    for (const order of updatedOrders) {
      notifyOrderUpdated(order._id.toString());
      notifyOrderUpdated(order.orderNumber);
      
      try {
        const email = order.shippingAddress?.email || order.guestEmail;
        if (email) {
          await sendOrderStatusUpdate({
            email,
            orderNumber: order.orderNumber,
            customerName: order.shippingAddress?.firstName || 'Customer',
            status
          });
        }
      } catch (emailErr) {
        console.error('Failed to send bulk order status update email:', emailErr);
      }
    }

    res.json({ message: `Updated ${result.modifiedCount} orders` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;