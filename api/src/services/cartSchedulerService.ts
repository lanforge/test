import { Agenda } from 'agenda';
import { MongoBackend } from '@agendajs/mongo-backend';
import Cart from '../models/Cart';
import Customer from '../models/Customer';
import { sendAbandonedCartEmail } from './emailService';
import { env } from '../config/env';

let agenda: Agenda;

export const startAbandonedCartJob = async () => {
  agenda = new Agenda({
    backend: new MongoBackend({
      address: env.MONGODB_URI || 'mongodb://localhost:27017/lanforge',
      collection: 'agendaJobs'
    })
  });

  agenda.define('process abandoned carts', async () => {
    try {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      
      // Find carts that are active and older than 4 hours
      // and haven't been marked as abandoned yet
      const abandonedCarts = await Cart.find({
        status: 'active',
        updatedAt: { $lt: fourHoursAgo }
      }).populate('customer');

      for (const cart of abandonedCarts) {
        cart.status = 'abandoned';
        await cart.save();

        if (cart.customer && cart.items && cart.items.length > 0) {
          const customer = await Customer.findById(cart.customer);
          if (customer && customer.email) {
            const cartUrl = `${env.FRONTEND_URL || 'http://localhost:3000'}/cart`;
            await sendAbandonedCartEmail(
              customer.email, 
              customer.firstName || 'Customer', 
              cartUrl
            );
          }
        }
      }
    } catch (error) {
      console.error('Error processing abandoned carts:', error);
    }
  });

  await agenda.start();

  // Run the job every 15 minutes to check for carts that became abandoned
  await agenda.every('15 minutes', 'process abandoned carts');
};
