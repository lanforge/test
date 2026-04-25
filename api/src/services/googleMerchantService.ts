import { google } from 'googleapis';
import Product, { IProduct } from '../models/Product';
import { env } from '../config/env';

import { Agenda } from 'agenda';
import { MongoBackend } from '@agendajs/mongo-backend';
import { generateXml } from '../scripts/generate-google-xml';

let agenda: Agenda;

export const startGoogleMerchantCron = async () => {
  agenda = new Agenda({
    backend: new MongoBackend({
      address: process.env.MONGODB_URI || 'mongodb://localhost:27017/lanforge',
      collection: 'agendaJobs'
    })
  });

  agenda.define('generate google xml feed', async () => {
    try {
      console.log('[GoogleMerchant] Auto-generating XML feed...');
      await generateXml();
      console.log('[GoogleMerchant] XML feed generated successfully.');
    } catch (error) {
      console.error('[GoogleMerchant] Error generating XML feed:', error);
    }
  });

  await agenda.start();
  
  // Run every 24 hours
  await agenda.every('24 hours', 'generate google xml feed');
};

export const syncGoogleMerchantProducts = async (merchantId: string) => {
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/content']
    });
    
    const content = google.content({ version: 'v2.1', auth });
    
    const products = await Product.find({ isActive: true });
    const baseUrl = env.FRONTEND_URL || 'https://lanforge.co';

    const entries = products.map((p: IProduct) => {
      const link = `${baseUrl}/products/${p.slug}`;
      let imageLink = '';
      if (p.images && p.images.length > 0) {
        imageLink = p.images[0].startsWith('http') ? p.images[0] : `${baseUrl}${p.images[0]}`;
      }

      return {
        batchId: Math.floor(Math.random() * 1000000),
        merchantId,
        method: 'insert',
        product: {
          offerId: p._id.toString(),
          title: p.name,
          description: p.description || p.shortDescription || p.name,
          link: link,
          imageLink: imageLink,
          contentLanguage: 'en',
          targetCountry: 'US',
          channel: 'online',
          availability: p.stock > 0 ? 'in stock' : 'out of stock',
          condition: 'new',
          price: {
            value: p.price.toFixed(2),
            currency: 'USD'
          },
          brand: 'LANForge',
          mpn: p.sku || p._id.toString()
        }
      };
    });

    // We can send max 1000 products per batch
    const results = [];
    for (let i = 0; i < entries.length; i += 1000) {
      const batch = entries.slice(i, i + 1000);
      const res = await content.products.custombatch({
        requestBody: {
          entries: batch as any
        }
      });
      results.push(res.data);
    }
    
    return { success: true, count: entries.length, results };
  } catch (error: any) {
    console.error('Google Merchant Sync Error:', error);
    throw new Error(error.message || 'Failed to sync with Google Merchant Center');
  }
};
