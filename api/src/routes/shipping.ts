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
          weight: '50',
          weight_unit: 'lb'
        }
      ];

      // Revert to shipments.create as live-rates consistently returns 0
      // using the exact dimensions matching user curl examples
      const parcels = [{
        length: '24',
        width: '16',
        height: '24',
        distance_unit: 'in',
        distanceUnit: 'in',
        weight: '50',
        mass_unit: 'lb',
        massUnit: 'lb'
      }];

      // Sanitize addressTo to prevent Shippo from silently failing due to invalid phone or email formats
      const cleanAddressTo = {
        name: addressTo.name,
        street1: addressTo.street1,
        street2: addressTo.street2 || '',
        city: addressTo.city,
        state: addressTo.state,
        zip: addressTo.zip,
        country: addressTo.country,
      };

      const shipment: any = await createShipment(
        { ...defaultLineItems[0], name: 'LANForge', street1: '88 Sabal Creek Trl', city: 'Ponte Vedra', state: 'FL', zip: '32081', country: 'US' },
        cleanAddressTo,
        parcels
      );
      const rates = shipment.rates || [];
      
      // Fetch shipping markup setting, default to 20%
      const markupSetting = await Settings.findOne({ key: 'shippingMarkupPercentage' });
      const markupPercentage = markupSetting && typeof markupSetting.value === 'number' ? markupSetting.value : 20;
      const markupMultiplier = 1 + (markupPercentage / 100);

      const rateCategories = new Map<string, any>();

      for (const rate of rates) {
        let displayTitle = '';
        let estimatedDays: string = String(rate.estimated_days);
        const nameToMatch = (rate.title || rate.servicelevel?.name || '').toLowerCase();

        if (nameToMatch.includes('ground')) {
          displayTitle = 'UPS Ground';
          estimatedDays = '3-5';
        } else if (nameToMatch.includes('2nd day') || nameToMatch.includes('2 day')) {
          displayTitle = 'UPS 2 Day Air';
          estimatedDays = '2';
        } else if (nameToMatch.includes('next day')) {
          displayTitle = 'UPS Next Day Air';
          estimatedDays = '1';
        } else {
          continue; // Filter out other methods
        }

        const currentAmount = parseFloat(rate.amount);
        const existingRate = rateCategories.get(displayTitle);

        // Keep the cheapest rate for each category if there are duplicates
        if (!existingRate || parseFloat(existingRate.amount) > currentAmount) {
          // Explicitly assign the correct estimatedDays regardless of what Shippo returns
          const finalEstimatedDays = displayTitle.includes('Ground') ? '3-5' : displayTitle.includes('2 Day') ? '2' : '1';

          rateCategories.set(displayTitle, {
            ...rate,
            objectId: rate.object_id || rate.objectId || rate.title || `live_rate_${rateCategories.size}`,
            title: displayTitle,
            estimatedDays: finalEstimatedDays,
            amount: currentAmount
          });
        }
      }

      const markedUpRates = Array.from(rateCategories.values()).map(rate => ({
        ...rate,
        amount: (rate.amount * markupMultiplier).toFixed(2)
      }));

      // Sort by amount ascending
      markedUpRates.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));

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

      const { insurance } = req.body;
      const transaction = await purchaseLabel(rateObjectId, insurance ? order.total : undefined);
      
      // Update order tracking
      order.trackingNumber = transaction.trackingNumber || (transaction as any).tracking_number;
      // Make sure we have tracking information available from transaction or shipping response
      order.carrier = (transaction as any).tracking_status?.provider || (transaction as any).trackingStatus?.provider || 'Unknown';
      order.carrierTrackingUrl = (transaction as any).tracking_url_provider || (transaction as any).trackingUrlProvider || '';
      order.labelUrl = transaction.labelUrl || (transaction as any).label_url;
      // Store our custom tracking URL
      if (process.env.FRONTEND_URL) {
        order.trackingUrl = `${process.env.FRONTEND_URL}/track/${order.orderNumber}`;
      } else {
        order.trackingUrl = `http://localhost:3000/track/${order.orderNumber}`;
      }
      order.status = 'shipped'; // Update status to shipped
      
      await order.save();

      res.json({ transaction, order });
    } catch (error: any) {
      console.error('Purchase label error:', error);
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
      const statusStr = trackingStatus.tracking_status?.status || trackingStatus.tracking_status?.substatus?.status || trackingStatus.tracking_status?.status_details;

      if (trackingNumber) {
        const order = await Order.findOne({ trackingNumber });
        if (order) {
          const upperStatus = statusStr ? statusStr.toString().toUpperCase() : '';
          
          let changed = false;
          if (upperStatus === 'DELIVERED' && order.status !== 'delivered') {
            order.status = 'delivered';
            changed = true;
          } else if (upperStatus === 'OUT_FOR_DELIVERY' && order.status !== 'out-for-delivery') {
            order.status = 'out-for-delivery';
            changed = true;
          } else if (upperStatus === 'TRANSIT' && order.status !== 'shipped' && order.status !== 'out-for-delivery' && order.status !== 'delivered') {
            order.status = 'shipped';
            changed = true;
          } else if (upperStatus === 'RETURNED' && order.status !== 'returned') {
            order.status = 'returned';
            changed = true;
          }

          if (changed) {
            await order.save();
            
            // If delivered, we should update loyalty points for the customer
            if (order.status === 'delivered' && order.customer) {
              const Customer = (await import('../models/Customer')).default;
              const LoyaltyTransaction = (await import('../models/LoyaltyTransaction')).default;
              
              const customer = await Customer.findById(order.customer);
              if (customer) {
                const before = customer.loyaltyPoints;
                if (order.loyaltyPointsEarned > 0) {
                  customer.loyaltyPoints += order.loyaltyPointsEarned;
                }
                customer.totalSpent += order.total;
                customer.totalOrders += 1;
                await customer.save();

                if (order.loyaltyPointsEarned > 0) {
                  await LoyaltyTransaction.create({
                    customer: customer._id,
                    order: order._id,
                    points: order.loyaltyPointsEarned,
                    type: 'earn',
                    reason: `Order ${order.orderNumber} delivered`,
                    balanceBefore: before,
                    balanceAfter: customer.loyaltyPoints,
                  });
                }
              }
            }
          }
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
