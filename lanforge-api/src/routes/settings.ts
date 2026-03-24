import { Router, Request, Response } from 'express';
import Settings from '../models/Settings';

const router = Router();

// GET /api/settings/public
// Returns public business information for the frontend (footer, checkout, etc.)
router.get('/public', async (_req: Request, res: Response): Promise<void> => {
  try {
    const publicKeys = [
      'storeName',
      'storeEmail',
      'storePhone',
      'storeAddress',
      'currency',
      'taxRate',
      'taxEnabled',
      'flatShippingRate',
      'freeShippingThreshold',
      'maintenanceMode'
    ];

    const settings = await Settings.find({ key: { $in: publicKeys } });
    
    // Provide safe fallbacks if the database hasn't been seeded yet by the admin
    const defaultPublicSettings = {
      storeName: 'LANForge',
      storeEmail: 'support@lanforge.com',
      storePhone: '',
      storeAddress: '',
      currency: 'USD',
      taxRate: 0.08,
      taxEnabled: true,
      flatShippingRate: 29.99,
      freeShippingThreshold: 500,
      maintenanceMode: false
    };

    // Since we've migrated to BusinessInfo for settings
    const BusinessInfo = require('../models/BusinessInfo').default;
    const businessInfo = await BusinessInfo.findOne();

    res.json({ 
      settings: { 
        ...defaultPublicSettings, 
        ...(businessInfo ? businessInfo.toObject() : {}) 
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving public settings' });
  }
});

export default router;
