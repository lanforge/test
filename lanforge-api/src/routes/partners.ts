import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Partner from '../models/Partner';
import Order from '../models/Order';
import { protect, staffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/partners — public
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const partners = await Partner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
    res.json({ partners });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/partners/admin/all — admin/staff list
router.get('/admin/all', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partners = await Partner.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json({ partners });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/partners/admin/:id — admin/staff
router.get('/admin/:id', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      res.status(404).json({ message: 'Partner not found' });
      return;
    }

    // Dynamically update stats based on non-cancelled orders
    const orders = await Order.find({ 
      creatorCode: partner.creatorCode,
      status: { $ne: 'cancelled' }
    });

    const referrals = orders.length;
    let totalRevenue = 0;
    let commissionEarned = 0;

    for (const order of orders) {
      const commissionableAmount = Math.max(0, order.subtotal - order.discount);
      totalRevenue += commissionableAmount;
      commissionEarned += commissionableAmount * (partner.commissionRate / 100);
    }

    await Partner.updateOne(
      { _id: partner._id },
      { 
        $set: { 
          'stats.referrals': referrals,
          'stats.totalRevenue': totalRevenue,
          'stats.commissionEarned': commissionEarned
        } 
      }
    );

    const updatedPartner = await Partner.findById(partner._id);
    res.json({ partner: updatedPartner });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/partners/:id/orders — admin/staff
router.get('/:id/orders', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      res.status(404).json({ message: 'Partner not found' });
      return;
    }

    const orders = await Order.find({ creatorCode: partner.creatorCode }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/partners — admin/staff
router.post(
  '/',
  protect,
  staffOrAdmin,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('creatorCode').notEmpty().withMessage('Creator code is required'),
    body('website').optional().isURL().withMessage('Valid website URL is required'),
    body('logo').optional().isString().withMessage('Logo must be a string'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const partner = await Partner.create(req.body);
      res.status(201).json({ partner });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// PUT /api/partners/:id — admin/staff
router.put('/:id', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!partner) {
      res.status(404).json({ message: 'Partner not found' });
      return;
    }
    res.json({ partner });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/partners/:id — admin/staff
router.delete('/:id', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partner = await Partner.findByIdAndDelete(req.params.id);
    if (!partner) {
      res.status(404).json({ message: 'Partner not found' });
      return;
    }
    res.json({ message: 'Partner deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/partners/reorder — admin/staff
router.post('/reorder', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { order } = req.body;
    await Promise.all(
      order.map(({ id, sortOrder }: { id: string; sortOrder: number }) =>
        Partner.findByIdAndUpdate(id, { sortOrder })
      )
    );
    res.json({ message: 'Partners reordered' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
