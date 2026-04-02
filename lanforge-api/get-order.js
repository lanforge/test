const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI);

const orderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', orderSchema);

async function run() {
  const order = await Order.findOne({}).sort({ createdAt: -1 });
  if (order) {
    console.log(order._id.toString());
  } else {
    console.log('No order found');
  }
  process.exit(0);
}

run();