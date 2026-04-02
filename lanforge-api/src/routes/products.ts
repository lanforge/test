import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Product from '../models/Product';
import { protect, staffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// ─── FRONTEND ROUTES ─────────────────────────────────────────────────────────

// GET /api/products — public, paginated, filterable
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const category = req.query.category as string;
    const search = req.query.search as string;
    const minPrice = parseFloat(req.query.minPrice as string);
    const maxPrice = parseFloat(req.query.maxPrice as string);
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const order = req.query.order === 'asc' ? 1 : -1;
    const featured = req.query.featured === 'true';
    const tag = req.query.tag as string;

    const filter: any = { isActive: true };
    if (category) filter.category = category;
    if (featured) filter.isFeatured = true;
    if (tag) filter.tags = tag;
    if (!isNaN(minPrice) || !isNaN(maxPrice)) {
      filter.price = {};
      if (!isNaN(minPrice)) filter.price.$gte = minPrice;
      if (!isNaN(maxPrice)) filter.price.$lte = maxPrice;
    }
    if (search) {
      filter.$text = { $search: search };
    }

    const sortObj: any = {};
    sortObj[sortBy] = order;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select('-cost -reserved -reorderPoint -reorderQty -location')
        .populate('parts', 'name type brand partModel')
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    res.json({ products, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/products/featured — public
router.get('/featured', async (_req: Request, res: Response): Promise<void> => {
  try {
    let products = await Product.find({ isActive: true, isFeatured: true })
      .select('-cost -reserved -reorderPoint -reorderQty -location')
      .populate('parts', 'name type brand partModel')
      .sort({ 'ratings.average': -1 })
      .limit(12);
      
    // Fallback: If no products are explicitly marked featured, just return the 12 newest ones
    if (products.length === 0) {
      products = await Product.find({ isActive: true })
        .select('-cost -reserved -reorderPoint -reorderQty -location')
        .populate('parts', 'name type brand partModel')
        .sort({ createdAt: -1 })
        .limit(12);
    }
    
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/products/search?q= — public
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query.q as string;
    if (!q || q.trim().length < 2) {
      res.json({ products: [] });
      return;
    }

    const products = await Product.find({
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ],
    })
      .select('name slug price compareAtPrice images category sku ratings stock')
      .limit(20);

    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/products/:id — public (by id or slug)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findOne({
      $or: [{ _id: req.params.id }, { slug: req.params.id }],
      isActive: true,
    })
      .select('-cost -reserved -reorderPoint -reorderQty -location')
      .populate('parts', 'name type brand partModel');

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    // Get related products (same category)
    const related = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true,
    })
      .select('name slug price compareAtPrice images ratings stock')
      .limit(4);

    res.json({ product, related });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// GET /api/products/admin/all — admin/staff, includes cost and stock
router.get('/admin/all', protect, staffOrAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/products — admin/staff
router.post(
  '/',
  protect,
  staffOrAdmin,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('sku').notEmpty().withMessage('SKU is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('description').notEmpty().withMessage('Description is required'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const slug =
        req.body.slug ||
        req.body.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

      const product = await Product.create({ ...req.body, slug });
      res.status(201).json({ product });
    } catch (error: any) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        res.status(400).json({ message: `${field} already exists` });
        return;
      }
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// PUT /api/products/:id — admin/staff
router.put('/:id', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json({ product });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'SKU or slug already exists' });
      return;
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/products/:id — admin/staff (soft delete)
router.delete('/:id', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json({ message: 'Product deactivated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/products/bulk/update — admin/staff bulk operations
router.post('/bulk/update', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids, update } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'No product IDs provided' });
      return;
    }

    const result = await Product.updateMany({ _id: { $in: ids } }, update);
    res.json({ message: `Updated ${result.modifiedCount} products`, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/products/bulk/delete — admin/staff bulk deactivate
router.post('/bulk/delete', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'No product IDs provided' });
      return;
    }

    await Product.updateMany({ _id: { $in: ids } }, { isActive: false });
    res.json({ message: `Deactivated ${ids.length} products` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/products/recalculate — admin/staff
router.post('/recalculate', protect, staffOrAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const Settings = mongoose.model('Settings');
    const markupSetting = await Settings.findOne({ key: 'productMarkupPercentage' });
    const markupPercentage = markupSetting && typeof markupSetting.value === 'number' ? markupSetting.value : 20;
    const markupMultiplier = 1 + (markupPercentage / 100);

    const products = await Product.find({}).populate('parts');
    
    let updatedCount = 0;
    for (const product of products) {
      // Just use the existing cost as truth
      // (which is explicitly set from Admin > Add/Edit Product or imported as a flat number)
      
      const calculatedPrice = product.cost * markupMultiplier;
      
      // Round up to nearest 49.99 or 99.99
      const cents = Math.round(calculatedPrice * 100);
      const roundingUnit = 5000; // $50.00 in cents
      const chunks = Math.ceil((cents + 1) / roundingUnit);
      product.price = (chunks * roundingUnit - 1) / 100;

      await product.save();
      updatedCount++;
    }

    res.json({ message: `Successfully recalculated ${updatedCount} products with a ${markupPercentage}% markup.` });
  } catch (error) {
    console.error('Error recalculating products:', error);
    res.status(500).json({ message: 'Server error recalculating products' });
  }
});

export default router;
