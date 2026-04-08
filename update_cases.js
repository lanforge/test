const mongoose = require('mongoose');
require('dotenv').config({path: 'api/.env'});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const result = await db.collection('pcparts').updateMany(
    { type: { $regex: /^case$/i } },
    { $set: { "specs.availableColors": ["Black", "White"] } }
  );
  console.log('Updated cases:', result.modifiedCount);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
