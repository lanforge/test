import express from 'express';
import mongoose from 'mongoose';
import AnalyticsEvent from '../models/AnalyticsEvent';
import { protect, adminOnly } from '../middleware/auth';

const router = express.Router();

// @route   POST /api/analytics/event
// @desc    Record an analytics event
// @access  Public
router.post('/event', async (req, res) => {
  try {
    const { sessionId, cartSessionId, userId, eventType, pageUrl, productId, discountCode } = req.body;

    if (!sessionId || !eventType || !pageUrl) {
      res.status(202).json({ success: false });
      return;
    }

    const eventPayload: any = {
      sessionId: String(sessionId),
      eventType: String(eventType),
      pageUrl: String(pageUrl),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    if (cartSessionId) eventPayload.cartSessionId = String(cartSessionId);
    if (productId) eventPayload.productId = String(productId);
    if (discountCode) eventPayload.discountCode = String(discountCode);
    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
      eventPayload.userId = userId;
    }

    const event = new AnalyticsEvent(eventPayload);

    await event.save();
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error saving analytics event:', error);
    res.status(202).json({ success: false });
  }
});

// @route   GET /api/analytics
// @desc    Get analytics events
// @access  Private/Admin
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    // Return recent events, perhaps with some aggregation
    // For now, return the last 1000 events sorted by timestamp descending
    const events = await AnalyticsEvent.find().sort({ timestamp: -1 }).limit(1000);
    
    // Also compute some basic stats to display
    const pageViews = await AnalyticsEvent.countDocuments({ eventType: 'page_view' });
    const addCarts = await AnalyticsEvent.countDocuments({ eventType: 'add_to_cart' });
    
    // Most popular pages
    const popularPages = await AnalyticsEvent.aggregate([
      { $match: { eventType: 'page_view' } },
      { $group: { _id: '$pageUrl', views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 10 }
    ]);

    // Sessions (Group events by sessionId to show path)
    const sessions = await AnalyticsEvent.aggregate([
      { $sort: { timestamp: 1 } }, // Sort by time ascending so events are in order
      { 
        $group: { 
          _id: '$sessionId',
          events: {
            $push: {
              eventType: '$eventType',
              pageUrl: '$pageUrl',
              productId: '$productId',
              discountCode: '$discountCode',
              timestamp: '$timestamp'
            }
          },
          startTime: { $first: '$timestamp' },
          endTime: { $last: '$timestamp' }
        }
      },
      { $sort: { endTime: -1 } }, // Most recent sessions first
      { $limit: 100 }
    ]);
    
    res.json({
      events,
      sessions,
      stats: {
        pageViews,
        addCarts,
        popularPages
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
});

// @route   GET /api/analytics/session/:sessionId
// @desc    Get detailed analytics for a specific session
// @access  Private/Admin
router.get('/session/:sessionId', protect, adminOnly, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get all events for this session
    const events = await AnalyticsEvent.find({ sessionId }).sort({ timestamp: 1 });

    if (!events.length) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    // Identify user and cart if available
    // We look for the first event that has them, assuming they might have logged in midway
    let userId = null;
    let cartSessionId = null;

    for (const event of events) {
      if (event.userId && !userId) userId = event.userId;
      if (event.cartSessionId && !cartSessionId) cartSessionId = event.cartSessionId;
    }

    // Fetch user details if exists
    let user = null;
    if (userId) {
      const User = require('../models/User').default;
      user = await User.findById(userId).select('firstName lastName email');
    }

    // Fetch cart details if exists
    let cart = null;
    if (cartSessionId) {
      const Cart = require('../models/Cart').default;
      cart = await Cart.findOne({ sessionId: cartSessionId })
        .populate('items.product', 'name price')
        .populate('items.pcPart', 'name type price')
        .populate('items.accessory', 'name type price')
        .populate('items.customBuild', 'name total frontendTotal');
    }

    // Extract all discount codes used during session
    const discountCodes = [...new Set(events.filter(e => e.discountCode).map(e => e.discountCode))];

    res.json({
      sessionId,
      events,
      startTime: events[0].timestamp,
      endTime: events[events.length - 1].timestamp,
      user,
      cart,
      discountCodes,
      cartSessionId
    });
  } catch (error) {
    console.error('Error fetching session analytics:', error);
    res.status(500).json({ message: 'Server error fetching session analytics' });
  }
});

export default router;
