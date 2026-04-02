const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI);

const paymentSchema = new mongoose.Schema({}, { strict: false });
const Payment = mongoose.model('Payment', paymentSchema);

const orderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', orderSchema);

async function run() {
  const payment = await Payment.findOne({ status: 'failed' }).sort({ createdAt: -1 });
  console.log('Latest Failed Payment:');
  console.log(JSON.stringify(payment, null, 2));

  if (payment && payment.order) {
    const order = await Order.findById(payment.order);
    console.log('Related Order Payment Status:', order ? order.paymentStatus : 'Not found');
  }
  process.exit(0);
}

run();
