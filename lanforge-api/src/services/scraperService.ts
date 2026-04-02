import fetch from 'node-fetch';
import PCPart from '../models/PCPart';
import Product from '../models/Product';

const extractPrice = (priceStr: any): number => {
  if (typeof priceStr === 'number') return priceStr;
  if (!priceStr) return 0;
  const str = priceStr.toString();
  // Sometimes it's a range like "$239.99 - $250.00", split by hyphen and take first
  const lowestStr = str.split('-')[0];
  const parsed = parseFloat(lowestStr.replace(/[^0-9.]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

const extractLdJsonPrice = (text: string): number => {
  const ldJsonMatches = text.match(/<script type="application\/ld\+json">(.*?)<\/script>/gi);
  if (!ldJsonMatches) return 0;

  for (const match of ldJsonMatches) {
    try {
      const jsonStr = match.replace(/<script type="application\/ld\+json">/i, '').replace(/<\/script>/i, '');
      const data = JSON.parse(jsonStr);
      
      const checkOffer = (offer: any) => {
        if (offer && offer.price) return extractPrice(offer.price);
        if (offer && offer.lowPrice) return extractPrice(offer.lowPrice);
        return 0;
      };

      if (data.offers) {
        if (Array.isArray(data.offers)) {
          for (const offer of data.offers) {
            const p = checkOffer(offer);
            if (p > 0) return p;
          }
        } else {
          const p = checkOffer(data.offers);
          if (p > 0) return p;
        }
      }
    } catch (e) {}
  }
  return 0;
};

export const scrapeDetailsFromUrl = async (url: string): Promise<any> => {
  if (!url) return null;

  try {
    const encodedUrl = encodeURIComponent(url);
    const scraperUrl = `https://api.scraperapi.com/?api_key=b5009ca3c5200be803a72cc263a83744&url=${encodedUrl}&retry_404=true&output_format=json&autoparse=true`;
    
    const response = await fetch(scraperUrl);
    if (!response.ok) {
       console.error(`[Scraper] Failed to fetch data for URL ${url} (Status: ${response.status})`);
       return null;
    }
    
    const text = await response.text();
    let result: any = {
      name: '',
      brand: '',
      price: 0,
      cost: 0
    };

    try {
      const data = JSON.parse(text);
      
      // Auto-parsed JSON from ScraperAPI (Amazon etc.)
      result.name = data.name || data.title || '';
      result.brand = data.brand || '';
      
      // Clean up Amazon brand text like "Visit the AMD Store"
      if (result.brand && typeof result.brand === 'string') {
        result.brand = result.brand.replace(/^Visit the\s+/i, '').replace(/\s+Store$/i, '').trim();
      }

      const priceString = data.pricing || data.price || data.list_price || (data.product_information && data.product_information.pricing);
      const unitCost = data.UnitCost; 
      
      if (unitCost !== undefined) {
        result.cost = extractPrice(unitCost);
      } else if (priceString) {
        result.cost = extractPrice(priceString);
      }
    } catch (err) {
      // Raw HTML fallback (Newegg, etc)
      
      // Try to get title
      const titleMatch = text.match(/<meta\s+(?:property|itemprop|name)="og:title"\s+content="([^"]+)"/i) 
                      || text.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        result.name = titleMatch[1]
          .replace(/\| Newegg\.com/gi, '')
          .replace(/"/g, '"')
          .replace(/&/g, '&')
          .trim();
      }

      // Try to get brand from title or ld+json
      const brandLdMatch = text.match(/"brand"\s*:\s*\{\s*"@type"\s*:\s*"Brand"\s*,\s*"name"\s*:\s*"([^"]+)"/i);
      if (brandLdMatch && brandLdMatch[1]) {
        result.brand = brandLdMatch[1];
      } else {
        // Simple heuristic: first word of title is often the brand
        const words = result.name.split(' ');
        if (words.length > 0) result.brand = words[0];
      }

      // Extract price
      const ldPrice = extractLdJsonPrice(text);
      if (ldPrice > 0) {
        result.cost = ldPrice;
      } else {
        const metaMatch = text.match(/<meta\s+(?:property|itemprop)="[a-zA-Z0-9:]*price[a-zA-Z0-9:]*"\s+content="([^"]+)"/i);
        const neweggListMatch = text.match(/<li class="price-current">\s*(?:<span[^>]*>.*?<\/span>\s*)?<strong>([0-9,]+)<\/strong>\s*<sup>\.([0-9]{2})<\/sup>/i);
        const ldJsonMatch = text.match(/"price"\s*:\s*"([0-9.]+)"/i) || text.match(/"price"\s*:\s*([0-9.]+)/i);
        const neweggUnitCostMatch = text.match(/"UnitCost"\s*:\s*([0-9.]+)/i);

        if (neweggUnitCostMatch && neweggUnitCostMatch[1]) {
          result.cost = extractPrice(neweggUnitCostMatch[1]);
        } else if (metaMatch && metaMatch[1]) {
          result.cost = extractPrice(metaMatch[1]);
        } else if (neweggListMatch) {
          result.cost = parseFloat(neweggListMatch[1].replace(/,/g, '') + '.' + neweggListMatch[2]);
        } else if (ldJsonMatch && ldJsonMatch[1]) {
          result.cost = extractPrice(ldJsonMatch[1]);
        }
      }
    }

    if (!isNaN(result.cost) && result.cost > 0) {
      const markupCost = result.cost * 1.10; // 10% markup
      result.price = Math.floor(markupCost) + 0.99; // round down and add .99
    }

    // Clean up brand if it got populated via HTML fallback with "Visit the ... Store"
    if (result.brand && typeof result.brand === 'string') {
      result.brand = result.brand.replace(/^Visit the\s+/i, '').replace(/\s+Store$/i, '').trim();
    }

    // Try to extract Model from name using common patterns if not set
    if (!result.model && result.name) {
      // Very basic heuristic for model numbers if we can't find one explicitly
      let nameWithoutBrand = result.name.replace(new RegExp(`^${result.brand}\\s+`, 'i'), '').trim();
      // Often model ends with a dash or comma
      nameWithoutBrand = nameWithoutBrand.split(/[,|-]/)[0].trim();
      
      // Sometimes brand is repeated
      if (result.brand) {
         const brandParts = result.brand.split(' ');
         for (const bp of brandParts) {
             nameWithoutBrand = nameWithoutBrand.replace(new RegExp(`^${bp}\\s+`, 'i'), '').trim();
         }
      }
      
      // Just take the first 3-4 words as a reasonable model approximation, or leave blank to let user fill
      // For "Ryzen 5 9600X", taking first 3 words is "Ryzen 5 9600X"
      const words = nameWithoutBrand.split(' ');
      result.model = words.slice(0, 4).join(' ').replace(/[™®]/g, '');
    }

    return result;

  } catch (err) {
    console.error(`[Scraper] Error scraping URL ${url}:`, err);
    return null;
  }
};

export const scrapeSinglePart = async (part: any): Promise<boolean> => {
  if (!part.productUrl) return false;
  
  try {
    const encodedUrl = encodeURIComponent(part.productUrl);
    const scraperUrl = `https://api.scraperapi.com/?api_key=b5009ca3c5200be803a72cc263a83744&url=${encodedUrl}&retry_404=true&output_format=json&autoparse=true`;
    
    const response = await fetch(scraperUrl);
    if (!response.ok) {
       console.error(`[Scraper] Failed to fetch data for ${part.brand} ${part.partModel} (Status: ${response.status})`);
       return false;
    }
    
    const text = await response.text();
    let cost = 0;

    try {
      // If it's Amazon or an autoparsed site, it will be JSON
      const data = JSON.parse(text);
      const priceString = data.pricing || data.price || data.list_price || (data.product_information && data.product_information.pricing);
      const unitCost = data.UnitCost; 
      
      if (unitCost !== undefined) {
        cost = extractPrice(unitCost);
      } else if (priceString) {
        cost = extractPrice(priceString);
      }
    } catch (err) {
      // If it's Newegg or autoparse fails, it returns raw HTML.
      // We will parse the HTML string using regex to extract the price.
      const ldPrice = extractLdJsonPrice(text);
      if (ldPrice > 0) {
        cost = ldPrice;
      } else {
        const metaMatch = text.match(/<meta\s+(?:property|itemprop)="[a-zA-Z0-9:]*price[a-zA-Z0-9:]*"\s+content="([^"]+)"/i);
        const neweggListMatch = text.match(/<li class="price-current">\s*(?:<span[^>]*>.*?<\/span>\s*)?<strong>([0-9,]+)<\/strong>\s*<sup>\.([0-9]{2})<\/sup>/i);
        const ldJsonMatch = text.match(/"price"\s*:\s*"([0-9.]+)"/i) || text.match(/"price"\s*:\s*([0-9.]+)/i);
        const neweggUnitCostMatch = text.match(/"UnitCost"\s*:\s*([0-9.]+)/i);

        if (neweggUnitCostMatch && neweggUnitCostMatch[1]) {
          cost = extractPrice(neweggUnitCostMatch[1]);
        } else if (metaMatch && metaMatch[1]) {
          cost = extractPrice(metaMatch[1]);
        } else if (neweggListMatch) {
          cost = parseFloat(neweggListMatch[1].replace(/,/g, '') + '.' + neweggListMatch[2]);
        } else if (ldJsonMatch && ldJsonMatch[1]) {
          cost = extractPrice(ldJsonMatch[1]);
        }
      }
    }

    if (!isNaN(cost) && cost > 0) {
      const markupCost = cost * 1.10; // 10% markup
      const retailPrice = Math.floor(markupCost) + 0.99; // round down and add .99
      
      part.cost = cost;
      part.price = retailPrice;
      await part.save();
      console.log(`[Scraper] Successfully updated ${part.brand} ${part.partModel}: New Cost: $${cost}, New Price: $${retailPrice}`);

      // Find all Products (PCs) that contain this part
      const affectedProducts = await Product.find({ parts: part._id }).populate('parts');
      
      for (const product of affectedProducts) {
        // Recalculate cost for the product
        let newProductCost = 0;
        for (const p of product.parts as any[]) {
          newProductCost += p.cost || 0;
        }
        
        // Set the product's new cost and apply 20% markup to nearest 49.99 or 99.99
        product.cost = newProductCost;
        const prodMarkupCost = newProductCost * 1.20;
        product.price = Math.round(prodMarkupCost / 50) * 50 - 0.01;
        
        await product.save();
        console.log(`[Scraper] Synchronized Product ${product.name}: New Cost: $${newProductCost}, New Price: $${product.price}`);
      }

      return true;
    } else {
      console.error(`[Scraper] Could not parse a valid price for ${part.brand} ${part.partModel}. ScraperAPI might have returned a captcha or unsupported format.`);
    }
  } catch (err) {
     console.error(`[Scraper] Error processing part ${part.brand} ${part.partModel}:`, err);
  }
  
  return false;
};

export const startPriceScrapingJob = () => {
  const CYCLE_TIME_MS = 12 * 60 * 60 * 1000; // 12 hours

  const scheduleNextScrape = async () => {
    try {
      // Find all parts that have a product URL
      const parts = await PCPart.find({ productUrl: { $exists: true, $ne: '' } });
      const totalParts = parts.length;
      
      if (totalParts === 0) {
        // No parts to scrape, check again in 1 hour
        setTimeout(scheduleNextScrape, 60 * 60 * 1000);
        return;
      }
      
      console.log(`[Scraper] Scheduling ${totalParts} parts to be scraped evenly over the next 12 hours...`);
      
      // Spread the scrapes evenly across the 12-hour period
      const intervalMs = Math.floor(CYCLE_TIME_MS / totalParts);
      
      let currentIndex = 0;
      
      const scrapeNext = async () => {
        if (currentIndex < parts.length) {
          const part = parts[currentIndex];
          await scrapeSinglePart(part);
          currentIndex++;
          
          // Always wait intervalMs before proceeding to the next part or restarting the cycle
          setTimeout(scrapeNext, intervalMs);
        } else {
          // Cycle complete, fetch updated parts list and restart
          scheduleNextScrape();
        }
      };
      
      // Start the first one
      scrapeNext();
      
    } catch (error) {
      console.error('[Scraper] Failed to schedule scraping job:', error);
      // Try again in 1 hour if DB fails
      setTimeout(scheduleNextScrape, 60 * 60 * 1000);
    }
  };

  // Start the continuous scraping cycle
  scheduleNextScrape();
};
