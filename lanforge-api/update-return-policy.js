const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/lanforge', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  const db = mongoose.connection.db;
  const collection = db.collection('pagecontents');
  
  // Find shipping-returns page
  const page = await collection.findOne({ slug: 'shipping-returns' });
  
  if (page) {
    console.log('Found page:', page.title);
    let newContent = page.content.replace(/30-day return policy/gi, '14-day return policy');
    newContent = newContent.replace(/30 day return policy/gi, '14 day return policy');
    
    await collection.updateOne(
      { slug: 'shipping-returns' },
      { $set: { content: newContent } }
    );
    console.log('Updated shipping-returns page in DB');
  } else {
    console.log('shipping-returns page not found');
  }
  
  mongoose.connection.close();
}).catch(err => {
  console.error('Error connecting to MongoDB:', err);
});
