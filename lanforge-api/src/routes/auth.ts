import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import AuditLog from '../models/AuditLog';
import { protect, AuthRequest } from '../middleware/auth';
import { sendPasswordReset } from '../services/emailService';

const router = Router();

const generateAccessToken = (id: string): string =>
  jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: '15m',
  });

const generateRefreshToken = (id: string): string =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: '7d',
  });

import RefreshToken from '../models/RefreshToken';

// POST /api/auth/login — admin & staff only
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+password');

      if (!user || !(await user.comparePassword(password))) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ message: 'Account is disabled' });
        return;
      }

      // Use updateOne to completely bypass Mongoose schema validation for the already-hashed password
      await User.updateOne(
        { _id: user._id },
        { $set: { lastLogin: new Date() } }
      );

      const token = generateAccessToken(String(user._id));
      const refreshToken = generateRefreshToken(String(user._id));

      // Store refresh token in database
      await RefreshToken.create({
        token: refreshToken,
        user: user._id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      res.json({ token, refreshToken, user });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error during login', error: String(error) });
    }
  }
);

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body as any;
  if (!refreshToken) {
    res.status(401).json({ message: 'Refresh token required' });
    return;
  }
  
  try {
    // Verify token exists in database
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken) {
      res.status(403).json({ message: 'Refresh token is invalid or has been revoked' });
      return;
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as any;
    const token = generateAccessToken(decoded.id);
    res.json({ token });
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  const { refreshToken } = req.body as any;
  if (refreshToken) {
    await RefreshToken.deleteOne({ token: refreshToken });
  }
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({ user: req.user });
});

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  [body('email').isEmail()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        // Don't reveal if email exists
        res.json({ message: 'If that email exists, a reset link has been sent' });
        return;
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
      await user.save({ validateBeforeSave: false });

      try {
        // Send plain token in email, not hashed token
        await sendPasswordReset(user.name, user.email, resetToken);
        
        await AuditLog.create({
          userId: user._id,
          userEmail: user.email,
          action: 'forgot_password_request',
          resource: 'user',
          resourceId: String(user._id),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          status: 'success',
        });
      } catch (e) {
        console.error('Password reset email failed:', e);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save({ validateBeforeSave: false });
      }

      res.json({ message: 'If that email exists, a reset link has been sent' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

export default router;