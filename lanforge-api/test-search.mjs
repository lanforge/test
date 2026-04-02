import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const search = "AMD Ryzen";

const testSearch = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lanforge');
  
  const searchTerms = search.trim().split(/\s+/);
  const filter: any = {};
  
  filter.$and = searchTerms.map(term => ({
    $or: [
      { partModel: { $regex: term, $options: 'i' } },
      { brand: { $regex: term, $options: 'i' } },
      { sku: { $regex: term, $options: 'i' } },
      { tags: { $regex: term, $options: 'i' } }
    ]
  }));
  
  const PCPart = mongoose.connection.collection('pcparts');
  console.log("Query1: ", JSON.stringify(filter, null, 2));
  const results1 = await PCPart.find(filter).toArray();
  console.log(`Results1 length: ${results1.length}`);
  
  // What about $regex with .* term1 .* term2?
  // Let's create an alternate single regex match for concatenated names
  // We can't easily concatenate and match dynamically without $expr, but let's try another approach:

  const altFilter: any = {};
  altFilter.$or = [
    { partModel: { $regex: search.replace(/\s+/g, '.*'), $options: 'i' } },
    { brand: { $regex: search.replace(/\s+/g, '.*'), $options: 'i' } },
    { $expr: { $regexMatch: { input: { $concat: ["$brand", " ", "$partModel"] }, regex: search.replace(/\s+/g, '.*'), options: 'i' } } }
  ];

  console.log("AltQuery: ", JSON.stringify(altFilter, null, 2));
  const results2 = await PCPart.find(altFilter).toArray();
  console.log(`AltResults length: ${results2.length}`);

  process.exit(0);
};

testSearch().catch(console.error);