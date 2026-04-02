import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

import DonationCause from './src/models/DonationCause';

const seedDonations = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI is not defined in .env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Create a random donation cause
    const randomCause = {
      name: `Gamers Outreach ${Math.floor(Math.random() * 1000)}`,
      description: 'Helping provide equipment, technology, and software to help kids cope with treatment inside hospitals.',
      imageUrl: 'https://gamersoutreach.org/wp-content/uploads/2018/12/gamers_outreach_logo.png',
      isActive: true,
      lanforgeContributionPerPC: 10 // e.g. $10 per PC ordered
    };

    const createdCause = await DonationCause.create(randomCause);
    console.log('Successfully imported random donation cause:', createdCause.name);
    console.log(createdCause);

    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding donation cause:', error);
    process.exit(1);
  }
};

seedDonations();
