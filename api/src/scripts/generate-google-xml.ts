import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Product from '../models/Product';
import connectDB from '../config/db';

async function generateXml() {
  await connectDB();
  
  const products = await Product.find({ isActive: true })
    .select('name slug description shortDescription price images category sku stock');

  const baseUrl = process.env.FRONTEND_URL || 'https://lanforge.co';

  let xml = '<?xml version="1.0"?>\n';
  xml += '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n';
  xml += '  <channel>\n';
  xml += '    <title>LANForge Products</title>\n';
  xml += `    <link>${baseUrl}</link>\n`;
  xml += '    <description>LANForge Custom PCs and Accessories</description>\n';

  const escapeXml = (unsafe: string) => {
    if (!unsafe) return '';
    let escaped = '';
    for (let i = 0; i < unsafe.length; i++) {
      const c = unsafe[i];
      if (c === '<') escaped += '&' + 'lt;';
      else if (c === '>') escaped += '&' + 'gt;';
      else if (c === '&') escaped += '&' + 'amp;';
      else if (c === "'") escaped += '&' + 'apos;';
      else if (c === '"') escaped += '&' + 'quot;';
      else escaped += c;
    }
    return escaped;
  };

  for (const p of products) {
    const link = `${baseUrl}/products/${p.slug}`;
    let imageLink = '';
    if (p.images && p.images.length > 0) {
      imageLink = p.images[0].startsWith('http') ? p.images[0] : `${baseUrl}${p.images[0]}`;
    }
      
    const availability = p.stock > 0 ? 'in_stock' : 'out_of_stock';
    
    xml += '    <item>\n';
    xml += `      <g:id>${p._id}</g:id>\n`;
    xml += `      <g:title>${escapeXml(p.name)}</g:title>\n`;
    const desc = p.description || p.shortDescription || p.name;
    xml += `      <g:description>${escapeXml(desc)}</g:description>\n`;
    xml += `      <g:link>${link}</g:link>\n`;
    if (imageLink) {
      xml += `      <g:image_link>${escapeXml(imageLink)}</g:image_link>\n`;
    }
    xml += `      <g:condition>new</g:condition>\n`;
    xml += `      <g:availability>${availability}</g:availability>\n`;
    xml += `      <g:price>${p.price.toFixed(2)} USD</g:price>\n`;
    xml += `      <g:brand>LANForge</g:brand>\n`;
    if (p.sku) {
      xml += `      <g:mpn>${escapeXml(p.sku)}</g:mpn>\n`;
    }
    xml += '    </item>\n';
  }

  xml += '  </channel>\n';
  xml += '</rss>';

  const uiPublicPath = path.join(__dirname, '../../../ui/public/google-merchant.xml');
  fs.writeFileSync(uiPublicPath, xml);
  console.log(`Generated XML at ${uiPublicPath}`);
  
  // Try to copy to ui build folder as well
  const uiBuildPath = path.join(__dirname, '../../../ui/build/google-merchant.xml');
  if (fs.existsSync(path.join(__dirname, '../../../ui/build'))) {
    fs.writeFileSync(uiBuildPath, xml);
    console.log(`Generated XML at ${uiBuildPath}`);
  }
}

// Only run standalone if executed directly
if (require.main === module) {
  generateXml().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export { generateXml };
