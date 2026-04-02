import { Router, Request, Response } from 'express';
import Order from '../models/Order';
import Invoice from '../models/Invoice';
import Payment from '../models/Payment';
import { createPaymentIntent, confirmPaymentIntent, constructWebhookEvent } from '../services/stripeService';
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
    const { clientSecret, metadata } = req.body;
    // Extract the intent ID from the client secret (format: pi_xxx_secret_yyy)
    const paymentIntentId = clientSecret.split('_secret_')[0];
    
    // We need to use the stripe SDK directly to update the intent
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata
    });
    
    res.json({ success: true });
  } catch (error: any) {
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

// POST /api/payments/paypal/capture
router.post('/paypal/capture', async (req: Request, res: Response): Promise<void> => {
  try {
    const { paypalOrderId, orderId } = req.body;
    const capture = await capturePayPalOrder(paypalOrderId);

    if (capture.status === 'COMPLETED') {
      const captureId = capture.purchase_units[0]?.payments?.captures[0]?.id;
      const amountValue = capture.purchase_units[0]?.payments?.captures[0]?.amount?.value || 0;
      const currencyCode = capture.purchase_units[0]?.payments?.captures[0]?.amount?.currency_code || 'USD';
      
      const order = await Order.findByIdAndUpdate(
        orderId,
        { paymentStatus: 'paid', paymentId: captureId, status: 'order-confirmed' },
        { new: true }
      );

      if (order) {
        await Payment.create({
          amount: Number(amountValue),
          currency: currencyCode.toLowerCase(),
          paymentMethod: 'paypal',
          gatewayTransactionId: captureId,
          order: orderId,
          customer: order.customer,
          status: 'completed'
        });

        try {
          const emailData = {
            orderNumber: order.orderNumber,
            customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
            email: order.shippingAddress.email,
            items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
            subtotal: order.subtotal,
            shipping: order.shipping,
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
      res.status(400).json({ message: 'PayPal capture failed', status: capture.status });
    }
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
          const order = await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'paid',
            paymentId: intent.id,
            status: 'order-confirmed',
          });
          
          if (order) {
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
            console.log(`Invoice ${invoiceId} marked as paid`);
          } else {
            console.log('Manual Invoice Paid (no ID):', intent.metadata);
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

// POST /api/payments/affirm/authorize
router.post('/affirm/authorize', async (req: Request, res: Response): Promise<void> => {
  try {
    const { checkoutToken, orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // 1. Authorize the charge
    const charge = await authorizeAffirmCharge(checkoutToken, order.orderNumber);
    
    // 2. Capture the charge (can also be done later when shipping)
    const capture = await captureAffirmCharge(charge.id, order.orderNumber);

    // 3. Update the order
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { paymentStatus: 'paid', paymentId: capture.id, status: 'order-confirmed' },
      { new: true }
    );

    if (updatedOrder) {
      await Payment.create({
        amount: capture.amount / 100, // Affirm amounts are usually in cents
        currency: capture.currency || 'usd',
        paymentMethod: 'affirm',
        gatewayTransactionId: capture.id,
        order: orderId,
        customer: updatedOrder.customer,
        status: 'completed'
      });

      try {
        const emailData = {
          orderNumber: updatedOrder.orderNumber,
          customerName: `${updatedOrder.shippingAddress.firstName} ${updatedOrder.shippingAddress.lastName}`,
          email: updatedOrder.shippingAddress.email,
          items: updatedOrder.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
          subtotal: updatedOrder.subtotal,
          shipping: updatedOrder.shipping,
          tax: updatedOrder.tax,
          discount: updatedOrder.discount,
          total: updatedOrder.total,
          shippingAddress: updatedOrder.shippingAddress,
        };
        await sendOrderConfirmation(emailData);
      } catch (e) {
        console.error('Order confirmation email failed:', e);
      }
    }

    res.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/payments (Manual creation)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, currency, paymentMethod, gatewayTransactionId, orderId, invoiceId, customerId, status, metadata } = req.body;
    
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
      await Order.findByIdAndUpdate(orderId, { paymentStatus: 'paid', paymentId: payment.gatewayTransactionId, status: 'order-confirmed' });
    } else if (invoiceId && status === 'completed') {
      await Invoice.findByIdAndUpdate(invoiceId, { status: 'paid', paymentId: payment.gatewayTransactionId });
    }

    res.status(201).json({ payment });
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
