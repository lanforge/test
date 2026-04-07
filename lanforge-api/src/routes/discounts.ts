import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Discount from '../models/Discount';
import Partner from '../models/Partner';
import { protect, staffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/discounts
router.get('/', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string;
    const filter: any = {};
    if (status && status !== 'all') filter.status = status;

    const discounts = await Discount.find(filter).sort({ createdAt: -1 });
    res.json({ discounts });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/discounts/validate — public, validate a code
router.post('/validate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, orderTotal = 0 } = req.body;
    let discount: any = await Discount.findOne({
      code: code.toUpperCase(),
      status: 'active',
      expiresAt: { $gte: new Date() },
      $expr: { $lt: ['$usedCount', '$usageLimit'] },
    });

    if (!discount) {
      // Check if it's a partner creator code with a discount
      const partner = await Partner.findOne({ creatorCode: code.toUpperCase(), isActive: true });
      if (partner && partner.customerDiscountType) {
        discount = {
          code: partner.creatorCode,
          type: partner.customerDiscountType,
          value: partner.customerDiscountValue || 0,
          minOrder: 0,
          isCreatorCode: true
        };
      }
    }

    if (!discount) {
      res.status(400).json({ valid: false, message: 'Invalid or expired discount code' });
      return;
    }

    if (orderTotal < discount.minOrder) {
      res.status(400).json({
        valid: false,
        message: `Minimum order of $${discount.minOrder} required`,
      });
      return;
    }

    let discountAmount = 0;
    if (discount.type === 'percentage') discountAmount = orderTotal * (discount.value / 100);
    else if (discount.type === 'fixed') discountAmount = Math.min(discount.value, orderTotal);
    else if (discount.type === 'free_shipping') discountAmount = 0; // handled at order level

    res.json({ valid: true, discount, discountAmount });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/discounts
router.post(
  '/',
  protect,
  staffOrAdmin,
  [
    body('code').notEmpty().toUpperCase(),
    body('type').isIn(['percentage', 'fixed', 'free_shipping']),
    body('expiresAt').isISO8601(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const discount = await Discount.create({ ...req.body, createdBy: req.user?._id });
      res.status(201).json({ discount });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(400).json({ message: 'Discount code already exists' });
        return;
      }
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// PUT /api/discounts/:id
router.put('/:id', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const discount = await Discount.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!discount) {
      res.status(404).json({ message: 'Discount not found' });
      return;
    }
    res.json({ discount });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/discounts/:id
router.delete('/:id', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Discount.findByIdAndDelete(req.params.id);
    res.json({ message: 'Discount deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;