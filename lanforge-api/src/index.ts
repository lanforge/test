import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import connectDB from './config/db';
import { startPriceScrapingJob } from './services/scraperService';

// Routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import customerRoutes from './routes/customers';
import paymentRoutes from './routes/payments';
import emailRoutes from './routes/email';
import discountRoutes from './routes/discounts';
import inventoryRoutes from './routes/inventory';
import loyaltyRoutes from './routes/loyalty';
import uploadRoutes from './routes/uploads';
import adminRoutes from './routes/admin';
import categoryRoutes from './routes/categories';
import pcPartsRoutes from './routes/pc-parts';
import customBuildRoutes from './routes/custom-builds';
import pagesRoutes from './routes/pages';
import shippingRoutes from './routes/shipping';
import faqRoutes from './routes/faqs';
import reviewRoutes from './routes/reviews';
import accessoryRoutes from './routes/accessories';
import partnerRoutes from './routes/partners';
import affiliateRoutes from './routes/affiliates';
import serviceRoutes from './routes/services';
import cartRoutes from './routes/carts';
import checkoutRoutes from './routes/checkout';
import newsletterRoutes from './routes/newsletter';
import rmaRoutes from './routes/rma';
import giftCardRoutes from './routes/giftcards';
import businessRoutes from './routes/business';
import buildRequestRoutes from './routes/build-requests';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Trust proxy (needed for rate-limiter behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);

// Rate limiting — general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for auth login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later.',
});
app.use('/api/auth/login', authLimiter);

// Raw body for Stripe webhook (must come before express.json)
app.use('/api/payments/webhook/stripe', express.raw({ type: 'application/json' }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Coming Soon Middleware ──────────────────────────────────────────────────
app.use(async (req, res, next) => {
  try {
    // Only check if it's an API route that isn't admin, auth, settings, or build-requests
    if (
      req.path.startsWith('/api/') &&
      !req.path.startsWith('/api/admin') &&
      !req.path.startsWith('/api/auth') &&
      !req.path.startsWith('/api/settings/public') &&
      !req.path.startsWith('/api/business/public') &&
      !req.path.startsWith('/api/build-requests') &&
      !req.path.startsWith('/api/newsletter')
    ) {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        const BusinessInfo = require('./models/BusinessInfo').default;
        const businessInfo = await BusinessInfo.findOne();
        if (businessInfo && businessInfo.comingSoonMode === true) {
          res.status(503).json({ error: 'Service Unavailable - Coming Soon Mode is active' });
          return;
        }
      }
    }
  } catch (error) {
    console.error('Error in coming soon middleware:', error);
  }
  next();
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/pc-parts', pcPartsRoutes);
app.use('/api/custom-builds', customBuildRoutes);
app.use('/api/pages', pagesRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/accessories', accessoryRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/rma', rmaRoutes);
app.use('/api/giftcards', giftCardRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/build-requests', buildRequestRoutes);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 — unmatched routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler (must have 4 params for Express to recognise it)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(err.statusCode ?? 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 LANForge API running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  
  // Start background jobs
  startPriceScrapingJob();
});

export default app;