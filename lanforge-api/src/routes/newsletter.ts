import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Newsletter from '../models/Newsletter';
import { protect, staffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/newsletter/subscribe — public
router.post(
  '/subscribe',
  [body('email').isEmail().withMessage('Valid email required')],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { email, source } = req.body;
      
      const existing = await Newsletter.findOne({ email: email.toLowerCase() });
      if (existing) {
        if (!existing.isActive) {
          existing.isActive = true;
          existing.unsubscribedAt = undefined;
          await existing.save();
          res.json({ message: 'Successfully re-subscribed!' });
          return;
        }
        res.json({ message: 'Already subscribed!' });
        return;
      }

      await Newsletter.create({ email, source });

      // Send notification
      try {
        const { sendNotification } = await import('../services/notificationService');
        await sendNotification(`New Newsletter Subscriber: ${email}`);
      } catch (notifErr) {
        console.error('Failed to send notification:', notifErr);
      }

      res.status(201).json({ message: 'Successfully subscribed!' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// POST /api/newsletter/unsubscribe — public
router.post(
  '/unsubscribe',
  [body('email').isEmail().withMessage('Valid email required')],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { email } = req.body;
      const sub = await Newsletter.findOne({ email: email.toLowerCase() });
      
      if (sub && sub.isActive) {
        sub.isActive = false;
        sub.unsubscribedAt = new Date();
        await sub.save();
      }

      res.json({ message: 'Successfully unsubscribed.' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// GET /api/newsletter/admin/all — admin/staff list
router.get('/admin/all', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const isActive = req.query.isActive; // "true" or "false"
    const filter: any = {};
    if (isActive === 'true') filter.isActive = true;
    else if (isActive === 'false') filter.isActive = false;

    const [subscribers, total] = await Promise.all([
      Newsletter.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Newsletter.countDocuments(filter),
    ]);

    res.json({ subscribers, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/newsletter/:id — admin/staff delete
router.delete('/:id', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sub = await Newsletter.findByIdAndDelete(req.params.id);
    if (!sub) {
      res.status(404).json({ message: 'Subscriber not found' });
      return;
    }
    res.json({ message: 'Subscriber deleted completely' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
