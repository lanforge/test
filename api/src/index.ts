import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import mongoSanitize from 'express-mongo-sanitize';
import connectDB from './config/db';
import { startPriceScrapingJob } from './services/scraperService';
import { startAbandonedCartJob } from './services/cartSchedulerService';
import { AppError } from './utils/AppError';
import { env } from './config/env';

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
import purchasedPcsRoutes from './routes/purchased-pcs';
import buildRequestRoutes from './routes/build-requests';
import donationCausesRoutes from './routes/donation-causes';
import pageStatusRoutes from './routes/page-status';
import settingsRoutes from './routes/settings';
import invoicesRoutes from './routes/invoices';
import sitemapRoutes from './routes/sitemap';
import analyticsRoutes from './routes/analytics';
import showcasesRoutes from './routes/showcases';

const app = express();

// Trust proxy for rate limiting behind reverse proxies (Render, Nginx, etc.)
app.set('trust proxy', 1);

// Enable ETags for caching performance
app.set('etag', 'weak');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    xXssProtection: true,
    xFrameOptions: { action: 'deny' },
  })
);
app.use(
  cors({
    origin: env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Rate limiting — general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // Increased drastically for stress testing
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for auth login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
});
app.use('/api/auth/login', authLimiter);

// Strict rate limit for password resets
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: 'Too many password reset attempts, please try again later.',
});
app.use('/api/auth/forgot-password', resetLimiter);

// Strict rate limit for token refreshes
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 refresh requests per 15 minutes
  message: 'Too many refresh token attempts, please try again later.',
});
app.use('/api/auth/refresh', refreshLimiter);

// Strict rate limit for public submission routes
const publicSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many submissions, please try again later.',
});

// Raw body for Stripe webhook (must come before express.json)
app.use('/api/payments/webhook/stripe', express.raw({ type: 'application/json' }));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Sanitize data
app.use(mongoSanitize());

// HTTP request logging (dev only)
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/email', publicSubmissionLimiter, emailRoutes);
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
app.use('/api/affiliates', publicSubmissionLimiter, affiliateRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/newsletter', publicSubmissionLimiter, newsletterRoutes);
app.use('/api/rma', rmaRoutes);
app.use('/api/giftcards', giftCardRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/purchased-pcs', purchasedPcsRoutes);
app.use('/api/build-requests', buildRequestRoutes);
app.use('/api/donation-causes', donationCausesRoutes);
app.use('/api/page-status', pageStatusRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/showcases', showcasesRoutes);

// Sitemap
app.use('/sitemap.xml', sitemapRoutes);

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
app.use((err: AppError | Error | any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500;
  res.status(statusCode).json({
    message: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 LANForge API running on port ${PORT} in ${env.NODE_ENV} mode`);
  
  // Start background jobs
  startPriceScrapingJob();
  startAbandonedCartJob();
});

export default app;