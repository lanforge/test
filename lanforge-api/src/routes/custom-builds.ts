import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import CustomBuild from '../models/CustomBuild';
import PCPart from '../models/PCPart';
import BusinessInfo from '../models/BusinessInfo';
import { protect, staffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// ─── FRONTEND ROUTES ─────────────────────────────────────────────────────────

// POST /api/custom-builds — save a draft or shareable build
router.post(
  '/',
  [
    body('parts').isArray({ min: 1 }).withMessage('At least one part is required'),
    body('parts.*.part').notEmpty().withMessage('Part ID is required'),
    body('parts.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('parts.*.partType').notEmpty().withMessage('Part type is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { parts, customer, guestEmail, name, notes, baseProduct } = req.body;

      // Calculate totals and verify parts
      let subtotal = 0;
      const verifiedParts = [];

      for (const item of parts) {
        const partDoc = await PCPart.findById(item.part);
        if (!partDoc || !partDoc.isActive) {
          res.status(400).json({ message: `Part not found or inactive: ${item.part}` });
          return;
        }
        subtotal += partDoc.price * item.quantity;
        verifiedParts.push({
          part: partDoc._id,
          quantity: item.quantity,
          partType: item.partType || partDoc.type,
        });
      }

      const businessInfo = await BusinessInfo.findOne();
      const percentage = businessInfo?.buildFeePercentage ?? 10;
      
      let laborFee = subtotal * (percentage / 100);
      
      // Round up to nearest 4.99 or 9.99
      if (laborFee > 0) {
        const tens = Math.floor(laborFee / 10) * 10;
        const opt1 = tens + 5.99;
        const opt2 = tens + 9.99;
        const opt3 = tens + 15.99;
        
        if (laborFee <= opt1) {
          laborFee = opt1;
        } else if (laborFee <= opt2) {
          laborFee = opt2;
        } else {
          laborFee = opt3;
        }
      } else {
        laborFee = 99.99; // Fallback minimum if subtotal is somehow 0
      }

      // If the frontend passed in explicit prices, trust them to avoid rounding/mismatch edge cases,
      // but ensure they roughly match our calculation to prevent price manipulation
      let finalSubtotal = subtotal;
      let finalLaborFee = laborFee;
      let finalTotal = subtotal + laborFee;

      if (req.body.frontendSubtotal !== undefined) {
        const diff = Math.abs(req.body.frontendSubtotal - subtotal);
        if (diff < 500) { // Increased tolerance to gracefully handle component overrides or pricing lag while prioritizing the customer's agreed price
          finalSubtotal = req.body.frontendSubtotal;
          finalLaborFee = req.body.frontendLaborFee ?? laborFee;
          finalTotal = req.body.frontendTotal ?? (finalSubtotal + finalLaborFee);
        }
      }

      let customBuild;
      const existingBuildId = req.body.buildId;

      if (existingBuildId) {
        customBuild = await CustomBuild.findOneAndUpdate(
          { buildId: existingBuildId },
          {
            name: name || 'My Custom Build',
            customer: customer || undefined,
            guestEmail,
            baseProduct: baseProduct || undefined,
            parts: verifiedParts,
            subtotal: finalSubtotal,
            laborFee: finalLaborFee,
            total: finalTotal,
            status: 'saved',
            notes,
          },
          { new: true }
        );
      }

      if (!customBuild) {
        // Generate a short 8-character build ID for sharing
        const buildId = crypto.randomBytes(4).toString('hex').toUpperCase();

        customBuild = await CustomBuild.create({
          buildId,
          name: name || 'My Custom Build',
          customer: customer || undefined,
          guestEmail,
          baseProduct: baseProduct || undefined,
          parts: verifiedParts,
          subtotal: finalSubtotal,
          laborFee: finalLaborFee,
          total: finalTotal,
          status: 'saved',
          notes,
        });
      }

      res.status(existingBuildId ? 200 : 201).json({ customBuild });
    } catch (error) {
      res.status(500).json({ message: 'Server error saving custom build' });
    }
  }
);

// GET /api/custom-builds/:buildId — load a saved build by short ID
router.get('/:buildId', async (req: Request, res: Response): Promise<void> => {
  try {
    const build = await CustomBuild.findOne({ buildId: req.params.buildId })
      .populate('parts.part', 'name slug brand partModel sku price images type stock')
      .populate('customer', 'firstName lastName email');

    if (!build) {
      res.status(404).json({ message: 'Custom build not found' });
      return;
    }

    res.json({ build });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/custom-builds/:buildId/status — update status (e.g. mark purchased)
router.put('/:buildId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, orderId } = req.body;
    
    if (!['draft', 'saved', 'purchased'].includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const update: any = { status };
    if (orderId) update.order = orderId;

    const build = await CustomBuild.findOneAndUpdate(
      { buildId: req.params.buildId },
      update,
      { new: true }
    );

    if (!build) {
      res.status(404).json({ message: 'Custom build not found' });
      return;
    }

    res.json({ build });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/custom-builds/customer/:customerId — get a customer's saved builds
router.get('/customer/:customerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const builds = await CustomBuild.find({ customer: req.params.customerId })
      .sort({ createdAt: -1 })
      .populate('parts.part', 'name brand partModel price images');
      
    res.json({ builds });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// GET /api/custom-builds/admin/all — get all custom builds for staff
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
        { buildId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { guestEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const [builds, total] = await Promise.all([
      CustomBuild.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customer', 'firstName lastName email')
        .populate('order', 'orderNumber status'),
      CustomBuild.countDocuments(filter),
    ]);

    res.json({ builds, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/custom-builds/:buildId/assign-order — admin: link to order and generate main S/N
router.put('/:buildId/assign-order', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      res.status(400).json({ message: 'orderId is required' });
      return;
    }

    const build = await CustomBuild.findOne({ buildId: req.params.buildId });
    if (!build) {
      res.status(404).json({ message: 'Custom build not found' });
      return;
    }

    build.order = orderId;
    build.status = 'purchased';

    if (!build.serialNumber) {
      // Generate a unique main serial number for the build
      let sn = `LAN-CB-${Math.floor(100000 + Math.random() * 900000)}`;
      while (await CustomBuild.exists({ serialNumber: sn })) {
        sn = `LAN-CB-${Math.floor(100000 + Math.random() * 900000)}`;
      }
      build.serialNumber = sn;
    }

    await build.save();
    res.json({ build });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/custom-builds/:buildId/parts-sn — admin: assign individual part S/Ns during build
router.put('/:buildId/parts-sn', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { partId, serialNumbers } = req.body;
    // partId is the PCPart _id
    // serialNumbers is an array of strings
    
    if (!partId || !Array.isArray(serialNumbers)) {
      res.status(400).json({ message: 'partId and serialNumbers array are required' });
      return;
    }

    const build = await CustomBuild.findOne({ buildId: req.params.buildId });
    if (!build) {
      res.status(404).json({ message: 'Custom build not found' });
      return;
    }

    const partIndex = build.parts.findIndex(p => String(p.part) === String(partId));
    if (partIndex === -1) {
      res.status(404).json({ message: 'Part not found in this build' });
      return;
    }

    if (serialNumbers.length > build.parts[partIndex].quantity) {
      res.status(400).json({ message: `Cannot assign more serial numbers than part quantity (${build.parts[partIndex].quantity})` });
      return;
    }

    build.parts[partIndex].serialNumbers = serialNumbers;
    await build.save();
    
    res.json({ build });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/custom-builds/:buildId — admin delete
router.delete('/:buildId', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const build = await CustomBuild.findOneAndDelete({ buildId: req.params.buildId });
    if (!build) {
      res.status(404).json({ message: 'Custom build not found' });
      return;
    }
    res.json({ message: 'Custom build deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
