import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Order from '../models/Order';
import { createShipment, getLiveRates, purchaseLabel, trackShipment, getRates, refundLabel } from '../services/shippoService';
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
          displayTitle = 'UPS GROUND (NO SAVER)';
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
          const finalEstimatedDays = displayTitle.includes('GROUND') ? '3-5' : displayTitle.includes('2 Day') ? '2' : '1';

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

// GET /api/shipping/order/:orderId/rates — admin/staff
router.get(
  '/order/:orderId/rates',
  protect,
  staffOrAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const order = await Order.findById(req.params.orderId);
      if (!order) {
        res.status(404).json({ message: 'Order not found' });
        return;
      }

      const addressTo = order.shippingAddress;
      const cleanAddressTo = {
        name: `${addressTo.firstName} ${addressTo.lastName}`,
        street1: addressTo.address,
        city: addressTo.city,
        state: addressTo.state,
        zip: addressTo.zip,
        country: addressTo.country || 'US',
      };

      const defaultLineItems = [
        {
          currency: 'USD',
          manufacture_country: 'US',
          quantity: 1,
          sku: 'PC-BUILD-1',
          title: 'Custom PC Build',
          total_price: String(order.subtotal || 1000),
          weight: '50',
          weight_unit: 'lb'
        }
      ];

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

      const shipment: any = await createShipment(
        { ...defaultLineItems[0], name: 'LANForge', street1: '88 Sabal Creek Trl', city: 'Ponte Vedra', state: 'FL', zip: '32081', country: 'US' },
        cleanAddressTo,
        parcels
      );

      console.log('Shippo shipment response:', JSON.stringify(shipment, null, 2));

      const rates = shipment.rates || [];
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

        if (!existingRate || parseFloat(existingRate.amount) > currentAmount) {
          rateCategories.set(displayTitle, {
            ...rate,
            objectId: rate.object_id || rate.objectId,
            title: displayTitle,
            estimatedDays: estimatedDays,
            amount: currentAmount
          });
        }
      }

      const finalRates = Array.from(rateCategories.values());
      finalRates.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));

      res.json({ rates: finalRates });
    } catch (error: any) {
      console.error('Fetch order rates error:', error);
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

      // Recreate shipment to get fresh rates
      // The rate in the database may have expired (Shippo rates expire)
      let activeRateObjectId = rateObjectId;
      
      try {
        const addressTo = order.shippingAddress;
        const cleanAddressTo = {
          name: `${addressTo.firstName} ${addressTo.lastName}`,
          street1: addressTo.address,
          city: addressTo.city,
          state: addressTo.state,
          zip: addressTo.zip,
          country: addressTo.country || 'US',
        };

        const defaultLineItems = [
          {
            currency: 'USD',
            manufacture_country: 'US',
            quantity: 1,
            sku: 'PC-BUILD-1',
            title: 'Custom PC Build',
            total_price: String(order.subtotal || 1000),
            weight: '50',
            weight_unit: 'lb'
          }
        ];

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

        const { insurance } = req.body;
        const extraPayload = insurance ? { insurance: { amount: String(order.total), currency: "USD", content: "PC Build and Components" } } : undefined;

        const shipment: any = await createShipment(
          { ...defaultLineItems[0], name: 'LANForge', street1: '88 Sabal Creek Trl', city: 'Ponte Vedra', state: 'FL', zip: '32081', country: 'US' },
          cleanAddressTo,
          parcels,
          extraPayload
        );

        if (shipment && shipment.rates) {
          let oldRate = order.shippingRates?.find((r: any) => r.objectId === rateObjectId);
          
          if (!oldRate) {
            try {
              const { getRate } = await import('../services/shippoService');
              const fetchedOldRate = await getRate(rateObjectId);
              let displayTitle = '';
              const nameToMatch = (fetchedOldRate.title || fetchedOldRate.servicelevel?.name || '').toLowerCase();
              if (nameToMatch.includes('ground')) displayTitle = 'UPS Ground';
              else if (nameToMatch.includes('2nd day') || nameToMatch.includes('2 day')) displayTitle = 'UPS 2 Day Air';
              else if (nameToMatch.includes('next day')) displayTitle = 'UPS Next Day Air';
              
              if (displayTitle) {
                oldRate = { title: displayTitle };
              }
            } catch (e) {
              console.warn('Could not fetch old rate from shippo for matching:', e);
            }
          }

          if (oldRate) {
            // Match the newly generated rate with the old rate by title
            const matchingNewRate = shipment.rates.find((r: any) => {
              let displayTitle = '';
              const nameToMatch = (r.title || r.servicelevel?.name || '').toLowerCase();
              if (nameToMatch.includes('ground')) displayTitle = 'UPS Ground';
              else if (nameToMatch.includes('2nd day') || nameToMatch.includes('2 day')) displayTitle = 'UPS 2 Day Air';
              else if (nameToMatch.includes('next day')) displayTitle = 'UPS Next Day Air';
              
              return displayTitle && displayTitle === oldRate.title;
            });
            
            if (matchingNewRate) {
              activeRateObjectId = matchingNewRate.object_id || matchingNewRate.objectId;
            }
          }
        }
      } catch (rateErr) {
        console.warn('Failed to refresh shipping rates, attempting purchase with original rate ID:', rateErr);
      }

      const { insurance } = req.body;
      const transaction = await purchaseLabel(activeRateObjectId, insurance ? order.total : undefined, `Order ${order.orderNumber}`);
      
      if (transaction.messages) {
        const errorMessages = transaction.messages.filter((m: any) => m.source === 'Shippo');
        if (errorMessages.length > 0) {
           console.warn('Shippo transaction messages:', errorMessages);
        }
      }

      // Update order tracking
      order.trackingNumber = transaction.trackingNumber || (transaction as any).tracking_number;
      // Make sure we have tracking information available from transaction or shipping response
      order.carrier = (transaction as any).tracking_status?.provider || (transaction as any).trackingStatus?.provider || 'Unknown';
      order.carrierTrackingUrl = (transaction as any).tracking_url_provider || (transaction as any).trackingUrlProvider || '';
      order.labelUrl = transaction.labelUrl || (transaction as any).label_url;
      order.shippoTransactionId = transaction.object_id || transaction.objectId;
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

// POST /api/shipping/refund — admin/staff
router.post(
  '/refund',
  protect,
  staffOrAdmin,
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { orderId } = req.body;
      const order = await Order.findById(orderId);
      
      if (!order) {
        res.status(404).json({ message: 'Order not found' });
        return;
      }

      if (!order.trackingNumber && !order.carrierTrackingUrl) {
        res.status(400).json({ message: 'Order does not have a generated label to refund' });
        return;
      }

      let responseMessage = 'Label refunded successfully';
      
      if (!order.shippoTransactionId) {
        // If it's an old label generated before we started tracking transaction IDs
        responseMessage = 'Local label data cleared. (Old label: Please manually void in Shippo dashboard if necessary)';
      } else {
        await refundLabel(order.shippoTransactionId);
      }

      // Clear shipping tracking details from order
      order.trackingNumber = '';
      order.carrier = '';
      order.carrierTrackingUrl = '';
      order.trackingUrl = '';
      order.labelUrl = '';
      order.shippoTransactionId = '';
      
      // Optionally reset status to previous state or keep it as shipped since refunding doesn't automatically mean unshipped.
      // We'll leave the status alone, or the admin can change it manually.

      await order.save();

      res.json({ message: responseMessage, order });
    } catch (error: any) {
      console.error('Refund label error:', error);
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
      const metadata = trackingStatus.metadata;
      
      const statusStr = trackingStatus.tracking_status?.status || '';
      const substatusCode = trackingStatus.tracking_status?.substatus?.code || '';

      let order = null;

      if (trackingNumber) {
        order = await Order.findOne({ trackingNumber });
      }

      if (!order && metadata) {
        // Try to find by metadata, e.g. "Order 000123"
        const metadataStr = metadata.toString();
        const match = metadataStr.match(/(?:Order\s+)?([A-Z0-9-]+)/i);
        if (match && match[1]) {
          const orderNum = match[1];
          order = await Order.findOne({ orderNumber: orderNum });
        }
      }

      if (order) {
        const upperStatus = statusStr.toUpperCase();
        const upperSubstatus = substatusCode.toUpperCase();
        
        let changed = false;
        if (upperStatus === 'DELIVERED' && order.status !== 'delivered') {
          order.status = 'delivered';
          changed = true;
        } else if ((upperStatus === 'OUT_FOR_DELIVERY' || upperSubstatus === 'OUT_FOR_DELIVERY') && order.status !== 'out-for-delivery' && order.status !== 'delivered') {
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
    
    res.status(200).send('Webhook received');
  } catch (error: any) {
    console.error('Shippo webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

export default router;
