import dotenv from 'dotenv';
import path from 'path';

// Load .env before everything else
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import User from '../models/User';
import connectDB from '../config/db';
import bcrypt from 'bcryptjs';

async function updatePassword() {
  try {
    await connectDB();

    console.log('Finding user...');
    const user = await User.findOne();

    if (!user) {
      console.log('No user found in the database!');
      process.exit(1);
    }

    console.log(`Updating password for user: ${user.email}`);

    // Hash manually to avoid Mongoose validation weirdness
    const hashedPassword = await bcrypt.hash('Admin@LANForge2026!', 12);
    
    // Update directly in the DB to bypass model validation
    await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });

    console.log('Password successfully updated!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating password:', error);
    process.exit(1);
  }
}

updatePassword();