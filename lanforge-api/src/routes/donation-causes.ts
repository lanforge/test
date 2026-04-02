import express from 'express';
import DonationCause from '../models/DonationCause';
import { protect, adminOnly } from '../middleware/auth';

const router = express.Router();

// @route   GET /api/donation-causes
// @desc    Get all donation causes
// @access  Public
router.get('/', async (req, res) => {
  try {
    const causes = await DonationCause.find({});
    res.json(causes);
  } catch (error) {
    console.error('Error fetching donation causes:', error);
    res.status(500).json({ message: 'Server error fetching donation causes' });
  }
});

// @route   GET /api/donation-causes/active
// @desc    Get active donation causes
// @access  Public
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const activeCauses = await DonationCause.find({
      isActive: true,
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gt: now } }
      ]
    });
    res.json(activeCauses);
  } catch (error) {
    console.error('Error fetching active donation causes:', error);
    res.status(500).json({ message: 'Server error fetching active donation causes' });
  }
});

// @route   POST /api/donation-causes
// @desc    Create a donation cause
// @access  Private/Admin
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, description, imageUrl, isActive, lanforgeContributionPerPC, endDate } = req.body;

    const causeExists = await DonationCause.findOne({ name });

    if (causeExists) {
      return res.status(400).json({ message: 'Donation cause already exists' });
    }

    const cause = await DonationCause.create({
      name,
      description,
      imageUrl,
      isActive,
      lanforgeContributionPerPC,
      endDate,
    });

    res.status(201).json(cause);
  } catch (error) {
    console.error('Error creating donation cause:', error);
    res.status(500).json({ message: 'Server error creating donation cause' });
  }
});

// @route   PUT /api/donation-causes/:id
// @desc    Update a donation cause
// @access  Private/Admin
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, description, imageUrl, isActive, lanforgeContributionPerPC, endDate } = req.body;

    const cause = await DonationCause.findById(req.params.id);

    if (cause) {
      cause.name = name || cause.name;
      cause.description = description !== undefined ? description : cause.description;
      cause.imageUrl = imageUrl !== undefined ? imageUrl : cause.imageUrl;
      cause.isActive = isActive !== undefined ? isActive : cause.isActive;
      cause.lanforgeContributionPerPC = lanforgeContributionPerPC !== undefined ? lanforgeContributionPerPC : cause.lanforgeContributionPerPC;
      if (endDate !== undefined) cause.endDate = endDate;

      const updatedCause = await cause.save();
      res.json(updatedCause);
    } else {
      res.status(404).json({ message: 'Donation cause not found' });
    }
  } catch (error) {
    console.error('Error updating donation cause:', error);
    res.status(500).json({ message: 'Server error updating donation cause' });
  }
});

// @route   DELETE /api/donation-causes/:id
// @desc    Delete a donation cause
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const cause = await DonationCause.findById(req.params.id);

    if (cause) {
      await DonationCause.deleteOne({ _id: cause._id });
      res.json({ message: 'Donation cause removed' });
    } else {
      res.status(404).json({ message: 'Donation cause not found' });
    }
  } catch (error) {
    console.error('Error deleting donation cause:', error);
    res.status(500).json({ message: 'Server error deleting donation cause' });
  }
});

export default router;
