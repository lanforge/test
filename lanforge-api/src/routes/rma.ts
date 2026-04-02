import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import RMA from '../models/RMA';
import Order from '../models/Order';
import { protect, staffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/rma/request — public (for customers to request returns)
router.post(
  '/request',
  [
    body('orderNumber').notEmpty().withMessage('Order number is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item must be selected for return'),
    body('items.*.reason').notEmpty().withMessage('Reason for return is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { orderNumber, email, items, notes } = req.body;

      const order = await Order.findOne({ orderNumber });
      if (!order) {
        res.status(404).json({ message: 'Order not found' });
        return;
      }

      if (order.shippingAddress.email.toLowerCase() !== email.toLowerCase()) {
        res.status(403).json({ message: 'Email does not match order' });
        return;
      }

      const rmaNumber = `RMA-${Date.now().toString(36).toUpperCase()}`;

      const rma = await RMA.create({
        rmaNumber,
        order: order._id,
        customer: order.customer,
        guestEmail: !order.customer ? email : undefined,
        items,
        notes,
      });

      // Send notification
      try {
        const { sendNotification } = await import('../services/notificationService');
        await sendNotification(`New RMA Request (${rmaNumber}) for Order ${orderNumber}\nEmail: ${email}\nNotes: ${notes || 'None'}`);
      } catch (notifErr) {
        console.error('Failed to send notification:', notifErr);
      }

      res.status(201).json({ message: 'RMA Requested Successfully', rmaNumber });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// GET /api/rma/track/:rmaNumber — public
router.get('/track/:rmaNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const rma = await RMA.findOne({ rmaNumber: req.params.rmaNumber })
      .populate('order', 'orderNumber status')
      .select('-__v');

    if (!rma) {
      res.status(404).json({ message: 'RMA not found' });
      return;
    }

    res.json({ rma });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// GET /api/rma/admin/all — admin/staff list
router.get('/admin/all', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const status = req.query.status as string;
    const search = req.query.search as string;

    const filter: any = {};
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { rmaNumber: { $regex: search, $options: 'i' } },
        { guestEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const [rmas, total] = await Promise.all([
      RMA.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('order', 'orderNumber')
        .populate('customer', 'firstName lastName email'),
      RMA.countDocuments(filter),
    ]);

    res.json({ rmas, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/rma/admin/:id/status — admin/staff update RMA status
router.put('/admin/:id/status', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, returnShippingTracking, refundAmount, notes } = req.body;
    
    const validStatuses = ['requested', 'approved', 'received', 'inspecting', 'refunded', 'rejected'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const update: any = { status };
    if (returnShippingTracking) update.returnShippingTracking = returnShippingTracking;
    if (refundAmount !== undefined) update.refundAmount = refundAmount;
    if (notes) update.notes = notes;

    const rma = await RMA.findByIdAndUpdate(req.params.id, update, { new: true });
    
    if (!rma) {
      res.status(404).json({ message: 'RMA not found' });
      return;
    }

    // If fully refunded, sync the underlying Order status
    if (status === 'refunded') {
      await Order.findByIdAndUpdate(rma.order, { paymentStatus: 'refunded', status: 'returned' });
    }

    res.json({ rma });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
