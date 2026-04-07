import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Payment from './src/models/Payment';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lanforge');
  
  const payment = await Payment.findById('69d55ca5c1549ce2a8c5dbb0');
  console.log("Found Payment:", payment);
  
  const allPayments = await Payment.find().limit(2);
  console.log("All Payments:", allPayments);

  process.exit(0);
};

run();