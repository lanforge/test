import { Router, Request, Response } from 'express';
import BuildRequest from '../models/BuildRequest';
import { protect, staffOrAdmin } from '../middleware/auth';

const router = Router();

// POST /api/build-requests - Create a new build request
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, budget, details, address, usage, preferredBrands, timeline } = req.body;
    
    if (!name || !email || !details) {
      res.status(400).json({ error: 'Name, email, and details are required' });
      return;
    }

    const newRequest = new BuildRequest({ 
      name, email, phone, budget, details, address, usage, preferredBrands, timeline 
    });
    await newRequest.save();

    // Send notification
    try {
      const { sendNotification } = await import('../services/notificationService');
      await sendNotification(`New Build Request from ${name} (${email})\nBudget: ${budget || 'N/A'}\nUsage: ${usage || 'N/A'}\nDetails: ${details}`);
    } catch (notifErr) {
      console.error('Failed to send notification:', notifErr);
    }

    res.status(201).json({ message: 'Build request submitted successfully' });
  } catch (error) {
    console.error('Error creating build request:', error);
    res.status(500).json({ error: 'Server error creating build request' });
  }
});

// GET /api/build-requests - Get all requests (admin only)
router.get('/', protect, staffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const requests = await BuildRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching build requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/build-requests/:id - Update status (admin only)
router.put('/:id', protect, staffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const request = await BuildRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!request) {
      res.status(404).json({ error: 'Build request not found' });
      return;
    }
    
    res.json(request);
  } catch (error) {
    console.error('Error updating build request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/build-requests/:id - Delete a request (admin only)
router.delete('/:id', protect, staffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const request = await BuildRequest.findByIdAndDelete(req.params.id);
    if (!request) {
      res.status(404).json({ error: 'Build request not found' });
      return;
    }
    res.json({ message: 'Build request deleted' });
  } catch (error) {
    console.error('Error deleting build request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
