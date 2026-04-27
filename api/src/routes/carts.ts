import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Cart from '../models/Cart';
import Discount from '../models/Discount';
import { protect, staffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

const cartPopulate = [
  { path: 'items.product', select: 'name price images slug stock reserved category subcategory type tags' },
  { path: 'items.pcPart', select: 'name brand price images slug stock reserved type category' },
  { path: 'items.accessory', select: 'name brand price images slug stock reserved type category' },
  {
    path: 'items.customBuild',
    populate: { path: 'parts.part', select: 'name price images type' }
  },
  { path: 'donationCause' },
  { path: 'appliedDiscount', select: 'code type value' }
];

const sanitizeCartItems = (items: any[] = []) => (
  items
    .map((item) => {
      const sanitized: any = {
        quantity: Math.max(1, Number(item.quantity) || 1)
      };

      (['product', 'pcPart', 'accessory', 'customBuild'] as const).forEach((field) => {
        const value = item[field]?._id || item[field];
        if (typeof value === 'string' && mongoose.isValidObjectId(value)) {
          sanitized[field] = value;
        }
      });

      if (typeof item.notes === 'string' && item.notes.trim()) {
        sanitized.notes = item.notes.trim();
      }

      return sanitized;
    })
    .filter((item) => item.product || item.pcPart || item.accessory || item.customBuild)
);

const resetActiveCart = async (sessionId: string) => {
  await Cart.deleteMany({ sessionId, status: 'active' });
  return Cart.create({ sessionId, items: [] });
};

// Track active SSE connections by sessionId
const activeConnections = new Map<string, Response>();

// Notify a specific session that its cart has been updated
const notifyCartUpdated = (sessionId: string) => {
  const res = activeConnections.get(sessionId);
  if (res) {
    res.write('event: cart_update\n');
    res.write(`data: ${JSON.stringify({ type: 'update', timestamp: Date.now() })}\n\n`);
    
    // Explicitly flush if the flush method exists (added by compression middleware)
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }
  }
};

// GET /api/carts/stream/:sessionId — SSE endpoint for real-time cart updates
// Note: Must be placed before /:sessionId to avoid variable matching conflicts
router.get('/stream/:sessionId', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform', // no-transform prevents caching proxies from buffering
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Prevent NGINX from buffering SSE
  });

  const sessionId = req.params.sessionId;
  
  // Clean up existing connection for this session if any (e.g. from HMR or multiple tabs)
  if (activeConnections.has(sessionId)) {
    activeConnections.get(sessionId)?.end();
  }
  
  activeConnections.set(sessionId, res);

  // Send an initial connected message
  res.write('event: connected\n');
  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);

  // Send a heartbeat every 15 seconds to keep the connection alive
  const heartbeatId = setInterval(() => {
    if (activeConnections.has(sessionId) && activeConnections.get(sessionId) === res) {
      res.write('event: ping\n');
      res.write(`data: ${JSON.stringify({ time: Date.now() })}\n\n`);
      
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    } else {
      clearInterval(heartbeatId);
    }
  }, 15000);

  // Clean up when client disconnects
  req.on('close', () => {
    clearInterval(heartbeatId);
    if (activeConnections.get(sessionId) === res) {
      activeConnections.delete(sessionId);
    }
  });
});

// GET /api/carts/:sessionId — public fetch cart
router.get('/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    let cart = await Cart.findOne({ sessionId: req.params.sessionId, status: 'active' })
      .populate(cartPopulate);

    if (!cart) {
      cart = await Cart.create({ sessionId: req.params.sessionId, items: [] });
    }

    res.json({ cart });
  } catch (error) {
    console.error('Error fetching cart, resetting anonymous cart:', error);
    try {
      const cart = await resetActiveCart(req.params.sessionId);
      res.json({ cart });
    } catch (resetError) {
      console.error('Error resetting cart:', resetError);
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// PUT /api/carts/:sessionId — public update cart (sync full cart state)
router.put('/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, customerId, discountCode, creatorCode, donationCause, clearDiscount } = req.body;
    
    // Auto-update expiry (rolling 30 days on interaction)
    const expiresAt = new Date(+new Date() + 30 * 24 * 60 * 60 * 1000);

    const sanitizedItems = sanitizeCartItems(Array.isArray(items) ? items : []);
    const update: any = { items: sanitizedItems, expiresAt };
    if (customerId && mongoose.isValidObjectId(customerId)) update.customer = customerId;
    
    if (discountCode !== undefined) {
      if (discountCode) {
        const discount = await Discount.findOne({ code: discountCode.toUpperCase(), status: 'active' });
        if (discount) {
          update.appliedDiscount = discount._id;
        }
      } else {
        update.appliedDiscount = null;
      }
    }
    
    if (creatorCode !== undefined) update.creatorCode = creatorCode;
    if (donationCause !== undefined && mongoose.isValidObjectId(donationCause)) {
      update.donationCause = donationCause;
    }
    if (clearDiscount || sanitizedItems.length === 0) {
      update.customDiscountAmount = 0;
    }

    const cart = await Cart.findOneAndUpdate(
      { sessionId: req.params.sessionId, status: 'active' },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .populate(cartPopulate);

    res.json({ cart });
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(400).json({ message: 'Invalid cart payload' });
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// GET /api/carts/admin/all — admin/staff see active/abandoned carts
router.get('/admin/all', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const status = req.query.status as string; // 'active', 'abandoned', 'converted'
    const filter: any = {};
    if (status && status !== 'all') filter.status = status;

    const [carts, total] = await Promise.all([
      Cart.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customer', 'firstName lastName email')
        .populate('items.product', 'name price')
        .populate('items.customBuild', 'name total')
        .populate('appliedDiscount', 'code type value'),
      Cart.countDocuments(filter),
    ]);

    res.json({ carts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/carts/admin/:id — admin dynamically adjust a cart
router.put('/admin/:id', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items, discountCode, creatorCode, status, customDiscountAmount } = req.body;
    
    const update: any = {};
    if (items) update.items = items;
    
    if (discountCode !== undefined) {
      if (discountCode) {
        const discount = await Discount.findOne({ code: discountCode.toUpperCase() });
        if (discount) {
          update.appliedDiscount = discount._id;
        }
      } else {
        update.appliedDiscount = null;
      }
    }
    
    if (creatorCode !== undefined) update.creatorCode = creatorCode;
    if (status) update.status = status;
    if (customDiscountAmount !== undefined) update.customDiscountAmount = Number(customDiscountAmount);

    const cart = await Cart.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('customer', 'firstName lastName email')
      .populate('items.product', 'name price')
      .populate('appliedDiscount', 'code type value');

    if (!cart) {
      res.status(404).json({ message: 'Cart not found' });
      return;
    }

    if (cart.sessionId) {
      notifyCartUpdated(cart.sessionId);
    }

    res.json({ cart });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
