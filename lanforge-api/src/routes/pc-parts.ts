import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import PCPart, { PCPartType } from '../models/PCPart';
import { protect, staffOrAdmin, AuthRequest } from '../middleware/auth';
import { scrapeSinglePart, scrapeDetailsFromUrl } from '../services/scraperService';

const router = Router();

const VALID_TYPES: PCPartType[] = [
  'cpu', 'gpu', 'ram', 'storage', 'case', 'os', 'psu', 'fan', 'cpu-cooler', 'motherboard',
];

// ─── FRONTEND ROUTES ─────────────────────────────────────────────────────────

// GET /api/pc-parts — public, filterable by type, brand, price, search
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 24;
    const skip = (page - 1) * limit;

    const type = req.query.type as PCPartType;
    const brand = req.query.brand as string;
    const search = req.query.search as string;
    const minPrice = parseFloat(req.query.minPrice as string);
    const maxPrice = parseFloat(req.query.maxPrice as string);
    const socket = req.query.socket as string;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const order = req.query.order === 'asc' ? 1 : -1;
    const inStock = req.query.inStock === 'true';
    const featured = req.query.featured === 'true';

    const filter: any = { isActive: true };
    if (type && VALID_TYPES.includes(type)) filter.type = type;
    if (brand) filter.brand = { $regex: brand, $options: 'i' };
    if (featured) filter.isFeatured = true;
    if (inStock) filter.$expr = { $gt: [{ $subtract: ['$stock', '$reserved'] }, 0] };
    if (socket) filter['specs.socket'] = { $regex: socket, $options: 'i' };
    if (!isNaN(minPrice) || !isNaN(maxPrice)) {
      filter.price = {};
      if (!isNaN(minPrice)) filter.price.$gte = minPrice;
      if (!isNaN(maxPrice)) filter.price.$lte = maxPrice;
    }
    if (search) {
      const searchTerms = search.trim().split(/\s+/);
      filter.$and = searchTerms.map(term => ({
        $or: [
          { brand: { $regex: term, $options: 'i' } },
          { partModel: { $regex: term, $options: 'i' } },
          { sku: { $regex: term, $options: 'i' } }
        ]
      }));
    }

    const sortObj: any = {};
    sortObj[sortBy] = order;

    const [parts, total] = await Promise.all([
      PCPart.find(filter)
        .select('-cost -reserved -reorderPoint')
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      PCPart.countDocuments(filter),
    ]);

    res.json({ parts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/pc-parts/types — public: list of available types with counts
router.get('/types', async (_req: Request, res: Response): Promise<void> => {
  try {
    const counts = await PCPart.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ types: counts });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/pc-parts/brands?type= — public: distinct brands for a part type
router.get('/brands', async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.query.type as string;
    const filter: any = { isActive: true };
    if (type) filter.type = type;
    const brands = await PCPart.distinct('brand', filter);
    res.json({ brands: brands.sort() });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/pc-parts/compatible — public: find compatible parts
// ?type=motherboard&socket=AM5 OR ?type=cpu-cooler&socket=LGA1700
router.get('/compatible', async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.query.type as PCPartType;
    const socket = req.query.socket as string;

    if (!type || !socket) {
      res.status(400).json({ message: 'type and socket are required' });
      return;
    }

    const parts = await PCPart.find({
      isActive: true,
      type,
      'specs.socket': { $regex: socket, $options: 'i' },
    }).select('-cost -reserved -reorderPoint');

    res.json({ parts });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/pc-parts/featured?type= — public
router.get('/featured', async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.query.type as PCPartType;
    const filter: any = { isActive: true, isFeatured: true };
    if (type) filter.type = type;

    const parts = await PCPart.find(filter)
      .select('-cost -reserved -reorderPoint')
      .sort({ 'ratings.average': -1 })
      .limit(12);

    res.json({ parts });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/pc-parts/by-type/:type — public: all parts of one type
router.get('/by-type/:type', async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.params.type as PCPartType;
    if (!VALID_TYPES.includes(type)) {
      res.status(400).json({ message: `Invalid part type. Valid types: ${VALID_TYPES.join(', ')}` });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 24;
    const skip = (page - 1) * limit;
    const sortBy = (req.query.sortBy as string) || 'price';
    const order = req.query.order === 'desc' ? -1 : 1;

    const sortObj: any = {};
    sortObj[sortBy] = order;

    const [parts, total] = await Promise.all([
      PCPart.find({ type, isActive: true })
        .select('-cost -reserved -reorderPoint')
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      PCPart.countDocuments({ type, isActive: true }),
    ]);

    res.json({ type, parts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/pc-parts/:id — public: single part by id or slug
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const part = await PCPart.findOne({
      $or: [{ _id: req.params.id }, { slug: req.params.id }],
      isActive: true,
    }).select('-cost -reserved -reorderPoint');

    if (!part) {
      res.status(404).json({ message: 'Part not found' });
      return;
    }

    // Related parts of the same type
    const related = await PCPart.find({
      type: part.type,
      _id: { $ne: part._id },
      isActive: true,
    })
      .select('slug brand partModel price compareAtPrice images ratings stock type')
      .limit(6);

    res.json({ part, related });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// GET /api/pc-parts/admin/all — admin/staff: full list with cost/stock
router.get('/admin/all', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const type = req.query.type as string;
    const search = req.query.search as string;

    const filter: any = {};
    if (type) {
      // The frontend uses capitalized types (e.g. "Case", "CPU") in the dropdown,
      // but the database stores them as lowercase ("case", "cpu")
      filter.type = type.toLowerCase() as PCPartType;
    }
    if (search) {
      const searchTerms = search.trim().split(/\s+/);
      filter.$and = searchTerms.map(term => ({
        $or: [
          { brand: { $regex: term, $options: 'i' } },
          { partModel: { $regex: term, $options: 'i' } },
          { sku: { $regex: term, $options: 'i' } }
        ]
      }));
    }

    const [parts, total] = await Promise.all([
      PCPart.find(filter).sort({ type: 1, brand: 1, partModel: 1 }).skip(skip).limit(limit),
      PCPart.countDocuments(filter),
    ]);

    res.json({ parts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/pc-parts — admin/staff: create a part
router.post(
  '/',
  protect,
  staffOrAdmin,
  [
    body('type').isIn(VALID_TYPES).withMessage(`type must be one of: ${VALID_TYPES.join(', ')}`),
    body('brand').notEmpty().withMessage('Brand is required'),
    body('model').notEmpty().withMessage('Model is required'),
    body('sku').notEmpty().withMessage('SKU is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be >= 0'),
    body('productUrl').optional().isURL().withMessage('Must be a valid URL'),
    body('specs').optional(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const slugBase = `${req.body.brand}-${req.body.model}`;
      const slug =
        req.body.slug ||
        slugBase
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          // Fallback to add random string if slug gets empty somehow
          || `part-${Date.now()}`;

      // map model -> partModel for Mongoose schema
      const { model, ...rest } = req.body;
      const part = await PCPart.create({ ...rest, partModel: model, slug });
      res.status(201).json({ part });
    } catch (error: any) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern ?? {})[0] ?? 'field';
        res.status(400).json({ message: `${field} already exists` });
        return;
      }
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// PUT /api/pc-parts/:id — admin/staff: update
router.put('/:id', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { model, ...rest } = req.body;
    const updateData = model ? { ...rest, partModel: model } : req.body;
    
    // Ensure slug doesn't conflict if updated implicitly
    let finalUpdateData = { ...updateData };
    if (finalUpdateData.brand && finalUpdateData.partModel && !finalUpdateData.slug) {
      const slugBase = `${finalUpdateData.brand}-${finalUpdateData.partModel}`;
      finalUpdateData.slug = slugBase.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    const part = await PCPart.findByIdAndUpdate(req.params.id, finalUpdateData, {
      new: true,
      runValidators: true,
    });
    if (!part) {
      res.status(404).json({ message: 'Part not found' });
      return;
    }
    res.json({ part });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'SKU or slug already exists' });
      return;
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/pc-parts/:id — admin/staff: soft delete
router.delete('/:id', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const part = await PCPart.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!part) {
      res.status(404).json({ message: 'Part not found' });
      return;
    }
    res.json({ message: 'Part deactivated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/pc-parts/scrape-all — admin/staff: Trigger background rescrape of all parts
router.post('/scrape-all', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parts = await PCPart.find({ productUrl: { $exists: true, $ne: '' } });
    
    // Process asynchronously in the background
    setTimeout(async () => {
      console.log(`[Scraper] Manual bulk rescrape initiated for ${parts.length} parts`);
      for (const part of parts) {
        await scrapeSinglePart(part);
        // Wait 2 seconds between requests to be polite to ScraperAPI
        await new Promise(r => setTimeout(r, 2000));
      }
      console.log(`[Scraper] Manual bulk rescrape completed!`);
    }, 0);

    res.json({ message: `Started scraping ${parts.length} parts in the background. Check server logs for progress.` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/pc-parts/scrape-link — admin/staff: extract details from a product URL
router.post('/scrape-link', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ message: 'URL is required' });
      return;
    }

    const details = await scrapeDetailsFromUrl(url);
    if (!details) {
      res.status(500).json({ message: 'Failed to extract details from the provided URL' });
      return;
    }

    res.json({ details });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/pc-parts/:id/scrape — admin/staff: manual trigger scraper
router.post('/:id/scrape', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const part = await PCPart.findById(req.params.id);
    if (!part) {
      res.status(404).json({ message: 'Part not found' });
      return;
    }
    if (!part.productUrl) {
      res.status(400).json({ message: 'Part has no product URL to scrape' });
      return;
    }
    
    const success = await scrapeSinglePart(part);
    if (success) {
      res.json({ message: 'Scraped successfully', part });
    } else {
      res.status(500).json({ message: 'Scraping failed or no price found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/pc-parts/:id/serial-numbers — admin/staff
router.put('/:id/serial-numbers', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serialNumbers } = req.body;
    if (!Array.isArray(serialNumbers)) {
      res.status(400).json({ message: 'serialNumbers must be an array of strings' });
      return;
    }

    const part = await PCPart.findByIdAndUpdate(
      req.params.id,
      { serialNumbers },
      { new: true }
    );

    if (!part) {
      res.status(404).json({ message: 'Part not found' });
      return;
    }

    res.json({ part });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'One or more serial numbers are already in use' });
      return;
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/pc-parts/:id/stock — admin/staff: quick stock update
router.patch('/:id/stock', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, quantity } = req.body;
    const part = await PCPart.findById(req.params.id);
    if (!part) {
      res.status(404).json({ message: 'Part not found' });
      return;
    }

    if (type === 'set') part.stock = quantity;
    else if (type === 'add') part.stock += quantity;
    else if (type === 'remove') part.stock = Math.max(0, part.stock - quantity);
    else {
      res.status(400).json({ message: 'type must be set, add, or remove' });
      return;
    }

    await part.save();
    res.json({ part });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/pc-parts/bulk/update — admin/staff
router.post('/bulk/update', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids, update } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'No IDs provided' });
      return;
    }
    const result = await PCPart.updateMany({ _id: { $in: ids } }, update);
    res.json({ message: `Updated ${result.modifiedCount} parts` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/pc-parts/bulk/delete — admin/staff
router.post('/bulk/delete', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'No IDs provided' });
      return;
    }
    await PCPart.updateMany({ _id: { $in: ids } }, { isActive: false });
    res.json({ message: `Deactivated ${ids.length} parts` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;