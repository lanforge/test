import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDesktop } from '@fortawesome/free-solid-svg-icons';

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  priceValue?: number;
  image?: string;
  specs: string[];
  imageColor: string;
  series: string;
  tags: string[];
}

const ProductShowcase: React.FC = () => {
  const [products, setProducts] = React.useState<Product[]>([]);

  React.useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/products/featured`)
      .then(res => res.json())
      .then(data => {
        if (data.products) {
          const mapped = data.products.map((p: any) => ({
            id: p._id,
            name: p.name,
            description: p.shortDescription || p.description,
            priceValue: p.price, // Store numeric price for sorting
            price: `$${p.price.toFixed(2)}`,
            image: p.images?.[0] || null, // Primary photo
            specs: p.parts && p.parts.length > 0 
              ? [
                  p.parts.find((part: any) => part.type === 'cpu'),
                  p.parts.find((part: any) => part.type === 'gpu'),
                  p.parts.find((part: any) => part.type === 'ram')
                ].filter(Boolean).map((part: any) => {
                  const modelStr = part.partModel || part.model || (part.name ? part.name.replace(new RegExp(`^${part.brand}\\s*`, 'i'), '') : '');
                  return `${part.type.toUpperCase()}: ${part.brand} ${modelStr}`.trim();
                })
              : (p.specs ? Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).slice(0, 3) : []),
            imageColor: '#3a86ff',
            series: p.subcategory || p.category || 'LANForge Series',
            tags: p.tags || []
          }));
          // Sort products by price (least expensive to most expensive)
          mapped.sort((a: any, b: any) => a.priceValue - b.priceValue);
          setProducts(mapped);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const seriesOrder = [
    { label: 'LANForge Series', tag: 'lanforge series' },
    { label: 'LANForge Mini Series', tag: 'mini series' },
    { label: 'Pre Configured', tag: 'preconfig' }
  ];

  // Group products by tags matching the seriesOrder
  const seriesGroups = products.reduce((groups, product) => {
    const productTagsLower = product.tags?.map(t => t.toLowerCase()) || [];
    const productSeriesLower = product.series?.toLowerCase() || '';

    seriesOrder.forEach(target => {
      const isMatch = productTagsLower.includes(target.tag) || productSeriesLower === target.tag || productTagsLower.includes(target.label.toLowerCase()) || productSeriesLower === target.label.toLowerCase();
      if (isMatch) {
        if (!groups[target.label]) {
          groups[target.label] = [];
        }
        groups[target.label].push(product);
      }
    });
    
    return groups;
  }, {} as Record<string, Product[]>);

  return (
    <section className="section py-32 relative overflow-hidden bg-gray-950" id="products">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }} />
      </div>
      
      <div className="container-narrow relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-cyan-500/50 mb-6 shadow-[0_0_40px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">Premium Builds</span>
          </div>
          
          <h2 className="heading-2 mb-6">
            Featured <span className="text-gradient-neon">Builds</span>
          </h2>
          
          <p className="body-large max-w-3xl mx-auto">
            Choose from our curated selection of premium gaming PCs or customize every component to create your perfect system.
          </p>
        </motion.div>
        
        {seriesOrder.map((seriesObj, seriesIndex) => {
          const series = seriesObj.label;
          const seriesProducts = seriesGroups[series];
          if (!seriesProducts) return null;
          
          return (
            <motion.div 
              key={series}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: seriesIndex * 0.2 }}
              className="mb-20 last:mb-0"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="heading-3 mb-2">{series === 'Pre Configured' ? 'Preconfigured PCs' : series}</h3>
                  <p className="text-gray-400">
                    {series === 'LANForge Series' && 'Flagship performance for serious gamers'}
                    {series === 'LANForge Mini Series' && 'Compact powerhouses for space-conscious setups'}
                    {series === 'Pre Configured' && 'Pre-configured systems ready for immediate delivery'}
                  </p>
                </div>
                <div className="hidden md:block">
                  <span className="text-sm text-gray-500">{seriesProducts.length} models</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {seriesProducts.map((product, productIndex) => (
                  <div
                    key={product.id}
                    className="bg-black/40 backdrop-blur-md border border-cyan-500/50 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50 group"
                  >
                    <div className="p-6">
                      {/* Series badge */}
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-cyan-500/50 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: product.imageColor }}
                        />
                        <span className="text-xs font-medium text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">{product.series}</span>
                      </div>
                      
                      {/* Product image */}
                      <div className="relative mb-6">
                        <div 
                          className="w-full h-48 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden"
                          style={{ backgroundColor: `${product.imageColor}20` }}
                        >
                          {product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              className="w-full h-full object-cover relative z-10"
                            />
                          ) : (
                            <div className="text-6xl opacity-30 relative z-10"><FontAwesomeIcon icon={faDesktop} /></div>
                          )}
                          <div 
                            className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-xl"
                            style={{ backgroundColor: product.imageColor }}
                          />
                        </div>
                        
                        {/* Price tag */}
                        <div className="absolute top-4 right-4 z-20">
                          <div className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-xl border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50">
                            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">{product.price}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Product info */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xl font-bold text-white mb-2">{product.name}</h4>
                          <p className="text-gray-400 text-sm">{product.description}</p>
                        </div>
                        
                        {/* Specs */}
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-gray-500">Key Specs</div>
                          <ul className="space-y-2">
                            {product.specs.map((spec, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                                <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                                {spec}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
                          <div className="skew-x-[-10deg] bg-black/40 backdrop-blur-md border border-cyan-500/50 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50">
                            <button 
                              id={`showcase-add-btn-${product.id}`}
                              className="skew-x-[10deg] px-6 py-2 text-sm font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 hover:from-cyan-300 hover:to-cyan-500 transition-all duration-300"
                              onClick={() => {
                                let sessionId = localStorage.getItem('cartSessionId');
                                if (!sessionId) {
                                  sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
                                  localStorage.setItem('cartSessionId', sessionId);
                                }
                                fetch(`${process.env.REACT_APP_API_URL}/carts/${sessionId}`)
                                  .then(res => res.json())
                                  .then(data => {
                                    const existingItems = data.cart?.items || [];
                                    const mappedItems = existingItems.map((i: any) => ({
                                      product: i.product?._id || i.product,
                                      pcPart: i.pcPart?._id || i.pcPart,
                                      accessory: i.accessory?._id || i.accessory,
                                      customBuild: i.customBuild?._id || i.customBuild,
                                      quantity: i.quantity
                                    }));
                                    mappedItems.push({
                                      product: product.id,
                                      quantity: 1
                                    });
                                    return fetch(`${process.env.REACT_APP_API_URL}/carts/${sessionId}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ items: mappedItems })
                                    });
                                  })
                                  .then(() => {
                                    const btn = document.getElementById(`showcase-add-btn-${product.id}`);
                                    if (btn) {
                                      btn.innerHTML = 'Added!';
                                      btn.classList.add('!text-emerald-400', 'from-emerald-400', 'to-emerald-400');
                                      setTimeout(() => {
                                        window.location.href = '/cart';
                                      }, 500);
                                    } else {
                                      window.location.href = '/cart';
                                    }
                                  })
                                  .catch(err => console.error(err));
                              }}
                            >
                              Add to Cart
                            </button>
                          </div>
                          <Link to={`/products/${product.id}`}>
                            <div className="skew-x-[-10deg] bg-black/40 backdrop-blur-md border border-cyan-500/50 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50">
                              <button className="skew-x-[10deg] px-6 py-2 text-sm font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 hover:from-cyan-300 hover:to-cyan-500 transition-all duration-300">
                                Details
                              </button>
                            </div>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
        
        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 text-center"
        >
          <div className="bg-black/40 backdrop-blur-md border border-cyan-500/50 rounded-xl p-8 max-w-3xl mx-auto shadow-[0_0_40px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50">
            <h3 className="heading-3 mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">Don't see what you're looking for?</h3>
            <p className="body-large mb-8 text-gray-300">
              Build your perfect PC from scratch with our configurator. Choose every component and create a system tailored to your exact needs.
            </p>
            <Link to="/configurator">
              <div className="skew-x-[-10deg] bg-black/40 backdrop-blur-md border border-cyan-500/50 rounded-lg overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50 inline-block">
                <button className="skew-x-[10deg] px-8 py-4 text-lg font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 hover:from-cyan-300 hover:to-cyan-500 transition-all duration-300">
                  <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Start Custom Build
                </button>
              </div>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProductShowcase;
