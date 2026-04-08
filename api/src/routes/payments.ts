import { Router, Request, Response } from 'express';
import Order from '../models/Order';
import Invoice from '../models/Invoice';
import Payment from '../models/Payment';
import stripeService, { createPaymentIntent, confirmPaymentIntent, constructWebhookEvent, createRefund } from '../services/stripeService';
import { createPayPalOrder, capturePayPalOrder } from '../services/paypalService';
import { authorizeAffirmCharge, captureAffirmCharge } from '../services/affirmService';
import { sendOrderConfirmation } from '../services/emailService';

const router = Router();

// POST /api/payments/stripe/create-checkout-intent
router.post('/stripe/create-checkout-intent', async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, metadata } = req.body;
    const intent = await createPaymentIntent(Math.max(1, amount), 'usd', metadata || {});
    res.json({ clientSecret: intent.client_secret });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/payments/stripe/update-intent
router.post('/stripe/update-intent', async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientSecret, metadata, amount } = req.body;
    // Extract the intent ID from the client secret (format: pi_xxx_secret_yyy)
    const paymentIntentId = clientSecret.split('_secret_')[0];
    
    const updateData: any = {};
    if (metadata) updateData.metadata = metadata;
    if (amount !== undefined) updateData.amount = Math.round(Math.max(0.5, amount) * 100);

    await stripeService.paymentIntents.update(paymentIntentId, updateData);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Update intent error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/payments/stripe/create-intent
router.post('/stripe/create-intent', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    const intent = await createPaymentIntent(order.total, 'usd', {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
    });

    res.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/payments/stripe/confirm
router.post('/stripe/confirm', async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentIntentId, orderId } = req.body;
    const intent = await confirmPaymentIntent(paymentIntentId);

    if (intent.status === 'succeeded') {
      const order = await Order.findByIdAndUpdate(
        orderId,
        { paymentStatus: 'paid', paymentId: paymentIntentId, status: 'order-confirmed' },
        { new: true }
      );
      if (order) {
        import('./orders').then(({ notifyOrderUpdated }) => {
          notifyOrderUpdated(order._id.toString());
          notifyOrderUpdated(order.orderNumber);
        });
      }

      if (order) {
        await Payment.create({
          amount: intent.amount / 100,
          currency: intent.currency,
          paymentMethod: 'stripe',
          gatewayTransactionId: intent.id,
          order: orderId,
          customer: order.customer,
          status: 'completed',
          metadata: intent.metadata
        });

        // Send confirmation email
        try {
          const emailData = {
            orderNumber: order.orderNumber,
            customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
            email: order.shippingAddress.email,
            items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
            subtotal: order.subtotal,
            shipping: order.shipping,
            shippingInsurance: order.shippingInsurance,
            tax: order.tax,
            discount: order.discount,
            total: order.total,
            shippingAddress: order.shippingAddress,
          };
          await sendOrderConfirmation(emailData);
        } catch (e) {
          console.error('Order confirmation email failed:', e);
        }
      }

      res.json({ success: true, order });
    } else {
      res.status(400).json({ message: 'Payment not completed', status: intent.status });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/payments/paypal/create-order
router.post('/paypal/create-order', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    const paypalOrder = await createPayPalOrder(
      order.total,
      'USD',
      `LANForge Order #${order.orderNumber}`
    );

    res.json(paypalOrder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/payments/webhook/stripe — raw body required
router.post('/webhook/stripe', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  try {
    const event = constructWebhookEvent(req.body as Buffer, sig);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as any;
        const orderId = intent.metadata?.orderId;
        const isManualInvoice = intent.metadata?.type === 'manual_invoice';
        
        if (orderId) {
          const order = await Order.findById(orderId);
          
          if (order && order.paymentStatus !== 'paid') {
            order.paymentStatus = 'paid';
            order.paymentId = intent.id;
            order.status = 'order-confirmed';
            await order.save();
            
            import('./orders').then(({ notifyOrderUpdated }) => {
              notifyOrderUpdated(order._id.toString());
              notifyOrderUpdated(order.orderNumber);
            });

            await Payment.create({
              amount: intent.amount / 100, // Stripe amount is in cents
              currency: intent.currency,
              paymentMethod: 'stripe',
              gatewayTransactionId: intent.id,
              order: orderId,
              customer: order.customer,
              status: 'completed',
              metadata: intent.metadata
            });

        // Send confirmation email
        try {
          const emailData = {
            orderNumber: order.orderNumber,
            customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
            email: order.shippingAddress.email,
            items: order.items.map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price })),
            subtotal: order.subtotal,
            shipping: order.shipping,
            shippingInsurance: order.shippingInsurance,
            tax: order.tax,
            discount: order.discount,
            total: order.total,
            shippingAddress: order.shippingAddress,
          };
          await sendOrderConfirmation(emailData);
        } catch (e) {
          console.error('Order confirmation email failed (Webhook):', e);
        }
      }
    } else if (isManualInvoice) {
          const invoiceId = intent.metadata?.invoiceId;
          if (invoiceId) {
            const invoice = await Invoice.findByIdAndUpdate(invoiceId, {
              status: 'paid',
              paymentId: intent.id
            });
            
            if (invoice) {
              await Payment.create({
                amount: intent.amount / 100,
                currency: intent.currency,
                paymentMethod: 'stripe',
                gatewayTransactionId: intent.id,
                invoice: invoiceId,
                status: 'completed',
                metadata: intent.metadata
              });
            }
          } else {
            await Payment.create({
              amount: intent.amount / 100,
              currency: intent.currency,
              paymentMethod: 'stripe',
              gatewayTransactionId: intent.id,
              status: 'completed',
              metadata: intent.metadata
            });
          }
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as any;
        const orderId = intent.metadata?.orderId;
        const isManualInvoice = intent.metadata?.type === 'manual_invoice';
        
        if (orderId) {
          const order = await Order.findByIdAndUpdate(orderId, { paymentStatus: 'failed' });
          
          if (order) {
            await Payment.create({
              amount: intent.amount / 100, // Stripe amount is in cents
              currency: intent.currency,
              paymentMethod: 'stripe',
              gatewayTransactionId: intent.id,
              order: orderId,
              customer: order.customer,
              status: 'failed',
              metadata: { ...intent.metadata, error: intent.last_payment_error }
            });
          }
        } else if (isManualInvoice) {
          const invoiceId = intent.metadata?.invoiceId;
          
          if (invoiceId) {
            const invoice = await Invoice.findById(invoiceId);
            if (invoice) {
              await Payment.create({
                amount: intent.amount / 100,
                currency: intent.currency,
                paymentMethod: 'stripe',
                gatewayTransactionId: intent.id,
                invoice: invoiceId,
                status: 'failed',
                metadata: { ...intent.metadata, error: intent.last_payment_error }
              });
            }
          }
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    res.status(400).json({ message: `Webhook error: ${error.message}` });
  }
});

// POST /api/payments (Manual creation)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, currency, paymentMethod, gatewayTransactionId, orderId, invoiceId, customerId, status, metadata } = req.body;
    
    // Check if order is already paid to prevent duplicate emails/payments
    if (orderId) {
      const existingOrder = await Order.findById(orderId);
      if (existingOrder && existingOrder.paymentStatus === 'paid') {
        res.status(200).json({ message: 'Order already paid', order: existingOrder });
        return;
      }
    }

    const payment = await Payment.create({
      amount,
      currency: currency || 'usd',
      paymentMethod: paymentMethod || 'manual',
      gatewayTransactionId: gatewayTransactionId || `manual_${Date.now()}`,
      order: orderId,
      invoice: invoiceId,
      customer: customerId,
      status: status || 'completed',
      metadata
    });

    // Optionally update order or invoice status
    if (orderId && status === 'completed') {
      const order = await Order.findByIdAndUpdate(orderId, { paymentStatus: 'paid', paymentId: payment.gatewayTransactionId, status: 'order-confirmed' }, { new: true });
      if (order) {
        import('./orders').then(({ notifyOrderUpdated }) => {
          notifyOrderUpdated(order._id.toString());
          notifyOrderUpdated(order.orderNumber);
        });
      }
      
      if (order) {
        // Send confirmation email
        try {
          const emailData = {
            orderNumber: order.orderNumber,
            customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
            email: order.shippingAddress.email,
            items: order.items.map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price })),
            subtotal: order.subtotal,
            shipping: order.shipping,
            shippingInsurance: order.shippingInsurance || 0,
            tax: order.tax,
            discount: order.discount,
            total: order.total,
            shippingAddress: order.shippingAddress,
          };
          await sendOrderConfirmation(emailData);
        } catch (e) {
          console.error('Order confirmation email failed (Manual Creation):', e);
        }
      }
    } else if (invoiceId && status === 'completed') {
      await Invoice.findByIdAndUpdate(invoiceId, { status: 'paid', paymentId: payment.gatewayTransactionId });
    }

    res.status(201).json({ payment });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/payments/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('order', 'orderNumber status total customer')
      .populate('invoice', 'invoiceNumber status amount')
      .populate('customer', 'firstName lastName email');
    
    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }
    
    res.json(payment);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/payments/:id/refund
router.post('/:id/refund', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, reason, forceLocal } = req.body;
    
    const payment = await Payment.findById(id);
    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }

    if (payment.paymentMethod === 'stripe' || forceLocal) {
      let refundId = `local_refund_${Date.now()}`;
      let refundStatus = 'succeeded';
      let refundedAmount = amount || payment.amount;

      if (payment.paymentMethod === 'stripe' && !forceLocal) {
        const refund = await createRefund(payment.gatewayTransactionId, amount);
        refundId = refund.id;
        refundStatus = refund.status || 'succeeded';
        refundedAmount = refund.amount / 100;
      }
      
      const refundMetadata = payment.metadata || {};
      refundMetadata.refunds = refundMetadata.refunds || [];
      refundMetadata.refunds.push({
        id: refundId,
        amount: refundedAmount,
        status: refundStatus,
        reason: reason || 'requested_by_customer',
        createdAt: new Date()
      });

      payment.metadata = refundMetadata;
      
      // Calculate total refunded amount
      const totalRefunded = refundMetadata.refunds.reduce((acc: number, r: any) => acc + (r.amount || 0), 0);
      
      if (totalRefunded >= payment.amount) {
        payment.status = 'refunded';
      }
      
      payment.markModified('metadata');
      await payment.save();

      // Optionally, update order status if fully refunded
      if (payment.status === 'refunded' && payment.order) {
        await Order.findByIdAndUpdate(payment.order, { paymentStatus: 'refunded' });
      }

      res.json({ success: true, payment });
    } else {
      res.status(400).json({ message: `Refunds for ${payment.paymentMethod} are not implemented yet.` });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/payments
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { order, invoice, status, paymentMethod } = req.query;
    const query: any = {};
    
    if (order) query.order = order;
    if (invoice) query.invoice = invoice;
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    const payments = await Payment.find(query)
      .populate('order', 'orderNumber status total')
      .populate('invoice', 'invoiceNumber status amount')
      .sort({ createdAt: -1 });
      
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
