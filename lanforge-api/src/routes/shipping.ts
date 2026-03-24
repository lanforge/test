import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Order from '../models/Order';
import { createShipment, getLiveRates, purchaseLabel, trackShipment, getRates } from '../services/shippoService';
import { protect, staffOrAdmin, AuthRequest } from '../middleware/auth';
import Settings from '../models/Settings';

const router = Router();

// POST /api/shipping/rates — public/checkout
router.post(
  '/rates',
  [
    body('addressTo').notEmpty().withMessage('Destination address required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { addressTo, lineItems } = req.body;
      
      // If line items aren't directly provided by the frontend, pass a default line item
      // to the live-rates endpoint as required by Shippo
      const defaultLineItems = [
        {
          currency: 'USD',
          manufacture_country: 'US',
          quantity: 1,
          sku: 'PC-BUILD-1',
          title: 'Custom PC Build',
          total_price: '1000.00',
          weight: '20',
          weight_unit: 'lb'
        }
      ];

      // Revert to shipments.create as live-rates consistently returns 0
      // using the exact dimensions matching user curl examples
      const parcels = [{
        length: '10',
        width: '10',
        height: '10',
        distanceUnit: 'in',
        weight: '1',
        massUnit: 'lb'
      }];
      
      const shipment = await createShipment(
        { ...defaultLineItems[0], name: 'LANForge Shipping', street1: '123 Tech Lane', city: 'Silicon Valley', state: 'CA', zip: '94025', country: 'US' }, 
        addressTo, 
        parcels
      );
      const rates = shipment.rates || [];
      
      // Fetch shipping markup setting, default to 20%
      const markupSetting = await Settings.findOne({ key: 'shippingMarkupPercentage' });
      const markupPercentage = markupSetting && typeof markupSetting.value === 'number' ? markupSetting.value : 20;
      const markupMultiplier = 1 + (markupPercentage / 100);

      const markedUpRates = rates.map((rate: any, index: number) => ({
        ...rate,
        objectId: rate.title || `live_rate_${index}`, // Live Rates endpoint does not provide objectId natively
        amount: (parseFloat(rate.amount) * markupMultiplier).toFixed(2)
      }));

      res.json({ rates: markedUpRates });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// POST /api/shipping/purchase — admin/staff
router.post(
  '/purchase',
  protect,
  staffOrAdmin,
  [
    body('rateObjectId').notEmpty().withMessage('Rate Object ID is required'),
    body('orderId').notEmpty().withMessage('Order ID is required'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { rateObjectId, orderId } = req.body;

      const order = await Order.findById(orderId);
      if (!order) {
        res.status(404).json({ message: 'Order not found' });
        return;
      }

      const transaction = await purchaseLabel(rateObjectId);
      
      // Update order tracking
      order.trackingNumber = transaction.trackingNumber;
      order.carrier = 'Unknown';
      order.status = 'shipped'; // Update status to shipped
      
      await order.save();

      res.json({ transaction, order });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/shipping/track/:carrier/:trackingNumber — public
router.get('/track/:carrier/:trackingNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const { carrier, trackingNumber } = req.params;
    const trackingInfo = await trackShipment(carrier, trackingNumber);
    res.json({ trackingInfo });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/shipping/webhook — public webhook handler for Shippo
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const event = req.body;
    
    // Process Shippo webhook (e.g. 'track_updated')
    if (event && event.event === 'track_updated') {
      const trackingStatus = event.data;
      const trackingNumber = trackingStatus.tracking_number;
      const statusStr = trackingStatus.tracking_status?.status;

      if (trackingNumber) {
        const order = await Order.findOne({ trackingNumber });
        if (order) {
          if (statusStr === 'DELIVERED') {
            order.status = 'delivered';
          } else if (statusStr === 'OUT_FOR_DELIVERY') {
            order.status = 'out-for-delivery';
          }
          await order.save();
        }
      }
    }
    
    res.status(200).send('Webhook received');
  } catch (error: any) {
    console.error('Shippo webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

export default router;
