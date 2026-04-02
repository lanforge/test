import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

import Product from './src/models/Product';
import './src/models/PCPart'; // ensure registered

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lanforge');

  const products = await Product.find({}).populate('parts');
  for (const p of products) {
    let totalPartsCost = 0;
    if (p.parts) {
        for (const part of p.parts as any) {
            totalPartsCost += part.cost || 0;
        }
    }
    console.log(`Product: ${p.name}`);
    console.log(` - Current DB Cost: ${p.cost}`);
    console.log(` - Sum of Parts Cost: ${totalPartsCost}`);
    console.log(` - Parts mapped: ${p.parts ? p.parts.length : 0}`);
  }

  mongoose.disconnect();
}

check();