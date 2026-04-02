import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import BusinessInfo from '../models/BusinessInfo';
import { protect, staffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/business/public — public
router.get('/public', async (_req: Request, res: Response): Promise<void> => {
  try {
    let businessInfo = await BusinessInfo.findOne();
    if (!businessInfo) {
      businessInfo = await BusinessInfo.create({});
    }

    res.json({ businessInfo });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving business info' });
  }
});

// GET /api/business — admin/staff
router.get('/', protect, staffOrAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    let businessInfo = await BusinessInfo.findOne();
    if (!businessInfo) {
      businessInfo = await BusinessInfo.create({});
    }

    res.json({ businessInfo });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving business info' });
  }
});

// PUT /api/business — admin/staff
router.put(
  '/',
  protect,
  staffOrAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      let businessInfo = await BusinessInfo.findOne();
      
      const updateData = { ...req.body };
      
      if (!businessInfo) {
        businessInfo = await BusinessInfo.create(updateData);
      } else {
        // Force the schema fields into the document by using set
        businessInfo.set(updateData);
        await businessInfo.save();
      }

      res.json({ message: 'Business info updated successfully', businessInfo });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error updating business info' });
    }
  }
);

export default router;
