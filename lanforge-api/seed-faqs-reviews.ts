import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

import FAQ from './src/models/FAQ';
import Review from './src/models/Review';
import Product from './src/models/Product';

const seedFaqsAndReviews = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI is not defined in .env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Seed FAQs
    const faqs = [
      {
        question: 'What is the warranty on a LANForge PC?',
        answer: 'All LANForge PCs come with a 3-year standard warranty that covers parts and labor. Extended warranties are also available during checkout.',
        category: 'Warranty',
        sortOrder: 1,
        isActive: true,
      },
      {
        question: 'How long does shipping take?',
        answer: 'Typically, it takes 3-5 business days to build, test, and quality check your PC. Standard shipping adds an additional 3-5 days depending on your location.',
        category: 'Shipping',
        sortOrder: 2,
        isActive: true,
      },
      {
        question: 'Can I upgrade my PC later?',
        answer: 'Yes! All of our systems use standard off-the-shelf PC components, making them fully upgradable down the line without any proprietary restrictions.',
        category: 'General',
        sortOrder: 3,
        isActive: true,
      },
      {
        question: 'Do you offer financing options?',
        answer: 'We have partnered with Affirm to offer flexible financing options for our customers. You can pre-qualify during checkout.',
        category: 'Payment',
        sortOrder: 4,
        isActive: true,
      },
      {
        question: 'What if my PC gets damaged during shipping?',
        answer: 'Every PC is securely packed with custom foam inserts and shipped fully insured. If any damage occurs in transit, please contact our support team immediately, and we will handle the replacement process.',
        category: 'Shipping',
        sortOrder: 5,
        isActive: true,
      }
    ];

    await FAQ.deleteMany({});
    console.log('Cleared existing FAQs');
    
    await FAQ.insertMany(faqs);
    console.log('Successfully inserted placeholder FAQs');

    // Seed Reviews
    // We intentionally do not link these to a specific product so they show up
    // as "general site reviews" on the homepage and reviews page.
    const reviews = [
      {
        customerName: 'John Doe',
        rating: 5,
        title: 'Amazing Performance',
        comment: 'This PC runs all my games at 4K without breaking a sweat. The cable management is pristine and the temps are super low even under heavy load. Highly recommended!',
        isVerifiedPurchase: true,
        isApproved: true,
      },
      {
        customerName: 'Jane Smith',
        rating: 4,
        title: 'Great build quality',
        comment: 'Very clean wiring and setup. The unboxing experience was fantastic. Only giving 4 stars because shipping was delayed by a day, but the system itself is flawless.',
        isVerifiedPurchase: true,
        isApproved: true,
      },
      {
        customerName: 'Alex Johnson',
        rating: 5,
        title: 'Perfect for streaming',
        comment: 'I can finally stream and game at the same time without any dropped frames. Customer support was also very helpful when I had questions before purchasing.',
        isVerifiedPurchase: false,
        isApproved: true,
      },
      {
        customerName: 'Michael T.',
        rating: 5,
        title: 'Exceeded Expectations',
        comment: 'Upgraded from an old pre-built and the difference is night and day. Quiet, powerful, and looks amazing on my desk.',
        isVerifiedPurchase: true,
        isApproved: true,
      },
      {
        customerName: 'Sarah K.',
        rating: 4,
        title: 'Solid Machine',
        comment: 'Does exactly what I need it to do. Really fast boot times and runs everything on ultra settings.',
        isVerifiedPurchase: true,
        isApproved: true,
      }
    ];

    await Review.deleteMany({});
    console.log('Cleared existing Reviews');

    await Review.insertMany(reviews);
    console.log('Successfully inserted placeholder Reviews');

    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding FAQs and Reviews:', error);
    process.exit(1);
  }
};

seedFaqsAndReviews();
