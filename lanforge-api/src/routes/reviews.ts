import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Review from '../models/Review';
import { protect, staffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/reviews — public list of approved reviews
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.query.productId as string;
    const pcPartId = req.query.pcPartId as string;
    const accessoryId = req.query.accessoryId as string;
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    const filter: any = { isApproved: true };
    if (productId) filter.product = productId;
    if (pcPartId) filter.pcPart = pcPartId;
    if (accessoryId) filter.accessory = accessoryId;
    
    // General site reviews if no specific product/part/accessory
    if (!productId && !pcPartId && !accessoryId) {
       filter.product = { $exists: false };
       filter.pcPart = { $exists: false };
       filter.accessory = { $exists: false };
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Review.countDocuments(filter)
    ]);

    res.json({ reviews, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/reviews — public user submits a review
router.post(
  '/',
  [
    body('customerName').notEmpty().withMessage('Name is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
    body('comment').notEmpty().withMessage('Comment is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { product, pcPart, accessory, customerName, customerEmail, rating, title, comment } = req.body;
      
      const review = await Review.create({
        product,
        pcPart,
        accessory,
        customerName,
        customerEmail,
        rating,
        title,
        comment,
        isApproved: false // Needs manual approval
      });

      // Send notification
      try {
        const { sendNotification } = await import('../services/notificationService');
        await sendNotification(`New Review from ${customerName} (${rating}/5 stars)\nTitle: ${title}\nNeeds approval in admin dashboard.`);
      } catch (notifErr) {
        console.error('Failed to send notification:', notifErr);
      }

      res.status(201).json({ message: 'Review submitted and pending approval', review });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// GET /api/reviews/admin/all — admin/staff list all reviews (including pending)
router.get('/admin/all', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const isApproved = req.query.isApproved; // "true" or "false"
    const filter: any = {};
    
    if (isApproved === 'true') filter.isApproved = true;
    else if (isApproved === 'false') filter.isApproved = false;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('product', 'name')
        .populate('pcPart', 'name brand')
        .populate('accessory', 'name brand'),
      Review.countDocuments(filter)
    ]);

    res.json({ reviews, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/reviews/:id/status — admin/staff approve or reject a review
router.put('/:id/status', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isApproved } = req.body;
    
    if (typeof isApproved !== 'boolean') {
      res.status(400).json({ message: 'isApproved must be a boolean' });
      return;
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isApproved },
      { new: true }
    );

    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    res.json({ message: `Review ${isApproved ? 'approved' : 'hidden'}`, review });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/reviews/:id — admin/staff delete a review
router.delete('/:id', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
