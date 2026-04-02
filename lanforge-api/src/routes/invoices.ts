import { Router, Request, Response } from 'express';
import Invoice from '../models/Invoice';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// GET all invoices (admin only)
router.get('/', protect, adminOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
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
