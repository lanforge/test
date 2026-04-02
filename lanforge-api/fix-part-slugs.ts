import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import PCPart from './src/models/PCPart';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://damian:wJwxO0xQYgrLV9AH@altoev.u9lcgej.mongodb.net/lanforge-beta?retryWrites=true&w=majority&appName=Altoev';

const generateSlug = (brand: string, modelOrName: string) => {
  const combined = `${brand} ${modelOrName}`;
  return combined
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

async function fixSlugs() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const parts = await PCPart.find({});
    console.log(`Found ${parts.length} PC parts to process.`);

    let updatedCount = 0;

    for (const part of parts) {
      const targetString = part.partModel;
      const expectedSlug = generateSlug(part.brand, targetString);
      
      if (part.slug !== expectedSlug) {
        // Find if this expectedSlug already exists to avoid duplicate key errors
        let finalSlug = expectedSlug;
        let counter = 1;
        let exists = await PCPart.findOne({ slug: finalSlug, _id: { $ne: part._id } });
        
        while (exists) {
          finalSlug = `${expectedSlug}-${counter}`;
          exists = await PCPart.findOne({ slug: finalSlug, _id: { $ne: part._id } });
          counter++;
        }

        console.log(`Updating slug for [${part.brand} ${part.partModel}]: ${part.slug} -> ${finalSlug}`);
        part.slug = finalSlug;
        await part.save();
        updatedCount++;
      }
    }

    console.log(`\nOperation complete. Updated ${updatedCount} slugs.`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating slugs:', error);
    process.exit(1);
  }
}

fixSlugs();
