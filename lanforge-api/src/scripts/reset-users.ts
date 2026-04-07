import dotenv from 'dotenv';
import path from 'path';

// Load .env before everything else
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import User from '../models/User';
import connectDB from '../config/db';
import bcrypt from 'bcryptjs';

async function resetUsers() {
  try {
    await connectDB();

    console.log('Deleting all users...');
    await User.deleteMany({});
    console.log('All users deleted.');

    console.log('Creating new admin user...');
    
    // Create new admin user using credentials from .env if available
    const email = process.env.ADMIN_EMAIL || 'admin@lanforge.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin@LANForge2026!';
    
    // User schema automatically hashes password, and we pass unhashed so it passes validation regex
    const adminUser = new User({
      name: 'Admin User',
      email: email,
      password: password,
      role: 'admin',
      isActive: true
    });
    
    await adminUser.save();

    console.log(`New admin user created! Email: ${email}`);
    process.exit(0);
  } catch (error) {
    console.error('Error resetting users:', error);
    process.exit(1);
  }
}

resetUsers();