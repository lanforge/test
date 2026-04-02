import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://damian:wJwxO0xQYgrLV9AH@altoev.u9lcgej.mongodb.net/lanforge-beta?retryWrites=true&w=majority&appName=Altoev';

async function removeNames() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    if (!mongoose.connection.db) {
      throw new Error('Database connection not established.');
    }

    // Use native MongoDB driver to unset the 'name' field from all documents in the 'pcparts' collection
    const result = await mongoose.connection.db.collection('pcparts').updateMany(
      { name: { $exists: true } },
      { $unset: { name: 1 } }
    );

    console.log(`Successfully removed "name" field from ${result.modifiedCount} PC parts.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error removing names:', error);
    process.exit(1);
  }
}

removeNames();
