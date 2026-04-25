import { Router, Request, Response } from 'express';
import Invoice from '../models/Invoice';
import Order from '../models/Order';
import Payment from '../models/Payment';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// GET all invoices (admin only)
router.get('/', protect, adminOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const { relatedOrderId } = req.query;
    const filter: any = {};
    if (relatedOrderId) {
      filter.relatedOrderId = relatedOrderId;
    }
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET a single invoice by ID (public, for the payment page)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('relatedOrderId');
    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }
    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST create a new invoice (admin only)
router.post('/', protect, adminOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerName, customerEmail, amount, description, relatedOrderId } = req.body;
    
    // Generate an invoice number (e.g. INV-XXXX)
    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-${1000 + count + 1}`;

    const newInvoice = new Invoice({
      invoiceNumber,
      customerName,
      customerEmail,
      amount,
      description,
      relatedOrderId: relatedOrderId || undefined,
      status: 'pending'
    });

    const savedInvoice = await newInvoice.save();
    res.status(201).json(savedInvoice);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH to mark invoice as paid manually (admin only)
router.patch('/:id/mark-paid', protect, adminOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }

    if (invoice.status === 'paid') {
      res.status(400).json({ message: 'Invoice is already paid' });
      return;
    }

    invoice.status = 'paid';
    const updatedInvoice = await invoice.save();

    // Check if the related order needs its payment status updated
    if (invoice.relatedOrderId) {
      const order = await Order.findById(invoice.relatedOrderId);
      if (order) {
        const payments = await Payment.find({ order: order._id, status: 'completed' });
        const totalPaidFromPayments = payments.reduce((sum, p) => sum + p.amount, 0);
        
        const invoices = await Invoice.find({ relatedOrderId: order._id, status: 'paid' });
        const totalPaidFromInvoices = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        
        const totalPaid = totalPaidFromPayments + totalPaidFromInvoices;
        
        if (totalPaid >= order.total && order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          await order.save();
        }
      }
    }
    
    res.json({ message: 'Invoice marked as paid successfully', invoice: updatedInvoice });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE an invoice (admin only)
router.delete('/:id', protect, adminOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
