import mongoose from 'mongoose';

async function testMongo() {
  await mongoose.connect('mongodb://127.0.0.1:27017/lanforge', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const part = await mongoose.connection.collection('pcparts').findOne({});
  const cases = await mongoose.connection.collection('pcparts').findOne({type: /case/i});
  console.log('CPU:', part ? part._id : 'None');
  console.log('Case:', cases ? cases._id : 'None');

  mongoose.disconnect();
}

testMongo().catch(console.error);
