import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import PCPart from './src/models/PCPart';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to MongoDB');

  const parts = await PCPart.find({});
  let missingCostCount = 0;
  let fixedCount = 0;

  for (const part of parts) {
    if (!part.cost || part.cost === 0) {
      missingCostCount++;
      console.log(`Part missing cost: [${part.type}] ${part.brand} ${part.partModel} - Retail Price: $${part.price}`);
      
      if (part.price && part.price > 0) {
        // If it has a retail price but no cost, we can reverse-engineer the cost
        // Retail Price = Cost * 1.10 (plus some rounding, but roughly / 1.10)
        // Let's just assume cost is price / 1.10 for the sake of having a valid internal cost
        const reversedCost = part.price / 1.10;
        part.cost = parseFloat(reversedCost.toFixed(2));
        await part.save();
        console.log(`  -> Fixed! Set cost to $${part.cost}`);
        fixedCount++;
      } else {
        console.log(`  -> Cannot fix: no retail price either.`);
      }
    }
  }

  console.log(`\nFound ${missingCostCount} parts missing internal cost.`);
  console.log(`Fixed ${fixedCount} parts by reverse-calculating from retail price.`);

  process.exit(0);
}

run().catch(console.error);