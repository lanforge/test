const mongoose = require('mongoose');

async function testApi() {
  await mongoose.connect('mongodb+srv://damian:wJwxO0xQYgrLV9AH@altoev.u9lcgej.mongodb.net/lanforge-beta?retryWrites=true&w=majority&appName=Altoev');
  console.log("Connected to db");
  const pcPartSchema = new mongoose.Schema({}, { strict: false });
  const PCPart = mongoose.model('PCPart', pcPartSchema);
  
  // get a random part to test
  const part = await PCPart.findOne();
  console.log("part before", part.brand, part.partModel);
  process.exit(0);
}

testApi();
