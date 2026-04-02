import { Router, Request, Response } from 'express';
import PageStatus from '../models/PageStatus';
import { protect, staffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Define all default pages
const defaultPages = [
  { path: '/', name: 'Home Page' },
  { path: '/configurator', name: 'Configurator' },
  { path: '/products', name: 'Products' },
  { path: '/pcs', name: 'Pre-built PCs' },
  { path: '/accessories', name: 'Accessories' },
  { path: '/pc-services', name: 'PC Services' },
  { path: '/cart', name: 'Cart' },
  { path: '/checkout', name: 'Checkout' },
  { path: '/order-status', name: 'Order Status' },
  { path: '/warranty', name: 'Warranty' },
  { path: '/terms', name: 'Terms of Service' },
  { path: '/privacy', name: 'Privacy Policy' },
  { path: '/cookies', name: 'Cookie Policy' },
  { path: '/shipping', name: 'Shipping & Returns' },
  { path: '/contact', name: 'Contact Us' },
  { path: '/tech-support', name: 'Tech Support' },
  { path: '/faq', name: 'FAQ' },
  { path: '/reviews', name: 'Reviews' },
  { path: '/guides', name: 'Build Guides' },
  { path: '/dignitas', name: 'Dignitas' },
  { path: '/tradeify', name: 'Tradeify' },
  { path: '/about', name: 'About Us' },
  { path: '/careers', name: 'Careers' },
  { path: '/press', name: 'Press' },
  { path: '/blog', name: 'Blog' },
  { path: '/partners', name: 'Partners' },
  { path: '/affiliate-application', name: 'Affiliates' },
  { path: 'maintenance_mode', name: 'Maintenance Mode' }
];

// Helper to seed missing pages
const seedPages = async () => {
  for (const p of defaultPages) {
    await PageStatus.updateOne({ path: p.path }, { $setOnInsert: { name: p.name, enabled: p.path === 'maintenance_mode' ? false : true } }, { upsert: true });
  }
};

// GET /api/page-status/public
router.get('/public', async (_req: Request, res: Response): Promise<void> => {
  try {
    await seedPages();
    const pages = await PageStatus.find({});
    
    // Auto-reopen maintenance mode check
    const maintenance = pages.find(p => p.path === 'maintenance_mode');
    if (maintenance && maintenance.enabled && maintenance.reopenAt) {
      if (new Date() >= new Date(maintenance.reopenAt)) {
        maintenance.enabled = false;
        maintenance.reopenAt = undefined;
        await maintenance.save();
      }
    }

    res.json({ pages });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving page statuses' });
  }
});

// GET /api/page-status
router.get('/', protect, staffOrAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await seedPages();
    const pages = await PageStatus.find({});
    
    // Auto-reopen maintenance mode check
    const maintenance = pages.find(p => p.path === 'maintenance_mode');
    if (maintenance && maintenance.enabled && maintenance.reopenAt) {
      if (new Date() >= new Date(maintenance.reopenAt)) {
        maintenance.enabled = false;
        maintenance.reopenAt = undefined;
        await maintenance.save();
      }
    }

    res.json({ pages });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving page statuses' });
  }
});

// PUT /api/page-status/:path
router.put('/:path', protect, staffOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const encodedPath = decodeURIComponent(req.params.path);
    const { enabled, reopenAt } = req.body;
    
    const page = await PageStatus.findOne({ path: encodedPath });
    if (!page) {
      res.status(404).json({ message: 'Page not found' });
      return;
    }
    
    page.enabled = enabled;
    if (encodedPath === 'maintenance_mode') {
      page.reopenAt = reopenAt ? new Date(reopenAt) : undefined;
    }
    
    await page.save();
    res.json({ message: 'Page status updated', page });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating page status' });
  }
});

export default router;