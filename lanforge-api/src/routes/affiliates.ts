import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import AffiliateApplication from '../models/AffiliateApplication';
import { protect, staffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/affiliates/apply — public
router.post(
  '/apply',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('socialLinks').isArray({ min: 1 }).withMessage('At least one social link is required'),
    body('audienceSize').notEmpty().withMessage('Audience size is required'),
    body('message').notEmpty().withMessage('Message is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const application = await AffiliateApplication.create(req.body);

      // Send notification
      try {
        const { sendNotification } = await import('../services/notificationService');
        await sendNotification(`New Affiliate Application from ${application.name} (${application.email})\nAudience Size: ${application.audienceSize}`);
      } catch (notifErr) {
        console.error('Failed to send notification:', notifErr);
      }

      res.status(201).json({ message: 'Application submitted successfully', application });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// GET /api/affiliates/admin/all — admin/staff list
router.get('/admin/all', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const status = req.query.status as string;
    const filter: any = {};
    if (status && status !== 'all') filter.status = status;

    const [applications, total] = await Promise.all([
      AffiliateApplication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AffiliateApplication.countDocuments(filter),
    ]);

    res.json({ applications, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/affiliates/:id/status — admin/staff update status
router.put('/:id/status', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, notes } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const update: any = { status };
    if (notes !== undefined) update.notes = notes;

    const application = await AffiliateApplication.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!application) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }

    // You could trigger an email here based on approval/rejection

    res.json({ application });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/affiliates/:id — admin/staff
router.delete('/:id', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const application = await AffiliateApplication.findByIdAndDelete(req.params.id);
    if (!application) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }
    res.json({ message: 'Application deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
