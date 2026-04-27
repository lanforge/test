import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDesktop } from '@fortawesome/free-solid-svg-icons';
import { trackEvent } from '../utils/analytics';
import api from '../utils/api';

interface Product {
  id: string;
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
  const [selectedColors, setSelectedColors] = React.useState<Record<string, string>>({});
  const [addingProductId, setAddingProductId] = React.useState<string | null>(null);
  const [cartError, setCartError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/products?limit=100`)
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

  const handleAddToCart = async (product: Product) => {
    setCartError(null);
    setAddingProductId(product.id);

    try {
      let sessionId = localStorage.getItem('cartSessionId');
      if (!sessionId) {
        sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('cartSessionId', sessionId);
      }

      const { data } = await api.get(`/carts/${sessionId}`);
      const existingItems = data.cart?.items || [];
      const mappedItems = existingItems.map((i: any) => ({
        product: i.product?._id || i.product,
        pcPart: i.pcPart?._id || i.pcPart,
        accessory: i.accessory?._id || i.accessory,
        customBuild: i.customBuild?._id || i.customBuild,
        quantity: i.quantity,
        notes: i.notes,
      }));

      const color = selectedColors[product.id] || 'Black';
      mappedItems.push({
        product: product.id,
        quantity: 1,
        notes: `Case Color: ${color}`,
      });

      await api.put(`/carts/${sessionId}`, { items: mappedItems });
      trackEvent('add_to_cart', window.location.pathname + window.location.search, product.id.toString());
      window.location.href = '/cart';
    } catch (err) {
      console.error(err);
      setCartError('Could not add this PC to your cart. Please try again.');
      setAddingProductId(null);
    }
  };

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
    <section className="section py-16 sm:py-24 lg:py-32 relative overflow-hidden bg-gray-950" id="products">
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
          className="text-center mb-10 sm:mb-12 lg:mb-16"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gray-900 border border-gray-800 mb-6 shadow-lg">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-white">Premium Builds</span>
          </div>
          
          <h2 className="heading-2 mb-6">
            Featured <span className="text-cyan-400">Builds</span>
          </h2>
          
          <p className="body-large max-w-3xl mx-auto">
            Choose from our curated selection of premium gaming PCs or customize every component to create your perfect system.
          </p>
          {cartError && (
            <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {cartError}
            </div>
          )}
        </motion.div>
        
        {seriesOrder.map((seriesObj, seriesIndex) => {
          const series = seriesObj.label;
          let seriesProducts = seriesGroups[series];
          if (!seriesProducts) return null;
          
          const isPreconfigured = series === 'Pre Configured';
          if (isPreconfigured) {
            seriesProducts = seriesProducts.slice(0, 3);
          }
          
          return (
            <motion.div 
              key={series}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: seriesIndex * 0.2 }}
              className="mb-12 sm:mb-16 lg:mb-20 last:mb-0"
            >
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">{series === 'Pre Configured' ? 'Preconfigured PCs' : series}</h3>
                  <p className="text-sm sm:text-base text-gray-400">
                    {series === 'LANForge Series' && 'Flagship performance for serious gamers'}
                    {series === 'LANForge Mini Series' && 'Compact powerhouses for space-conscious setups'}
                    {series === 'Pre Configured' && 'Pre-configured systems ready for immediate delivery'}
                  </p>
                </div>
                <div className="hidden md:block">
                  <span className="text-sm text-gray-500">{seriesProducts.length} models</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {seriesProducts.map((product, productIndex) => (
                  <div
                    key={product.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg group"
                  >
                    <div className="p-4 sm:p-5 lg:p-6">
                      {/* Series badge */}
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900 border border-gray-800 mb-4 shadow-lg">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: product.imageColor }}
                        />
                        <span className="text-xs font-medium text-white">{product.series}</span>
                      </div>
                      
                      {/* Product image */}
                      <div className="relative mb-4 sm:mb-6">
                        <div 
                          className="w-full h-40 sm:h-44 lg:h-48 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden"
                          style={{ backgroundColor: `${product.imageColor}20` }}
                        >
                          {product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              className="w-full h-full object-contain p-2 relative z-10"
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
                        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-20">
                          <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gray-900 border border-gray-800 shadow-lg">
                            <span className="text-base sm:text-lg font-bold text-white">{product.price}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Product info */}
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <h4 className="text-lg sm:text-xl font-bold text-white mb-2">{product.name}</h4>
                        </div>
                        
                        {/* Specs */}
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="text-xs sm:text-sm font-medium text-gray-500">Key Specs</div>
                          <ul className="space-y-1.5 sm:space-y-2">
                            {product.specs.map((spec, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
                                <div className="w-1 h-1 bg-emerald-400 rounded-full flex-shrink-0" />
                                <span className="line-clamp-1">{spec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {/* Color Selection */}
                        <div className="pt-2 relative z-20">
                          <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Case Color</div>
                          <div className="flex gap-2 relative z-20">
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedColors(prev => ({ ...prev, [product.id]: 'Black' })); }}
                              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 cursor-pointer transition-all ${(!selectedColors[product.id] || selectedColors[product.id] === 'Black') ? 'border-cyan-400 scale-110 shadow-lg' : 'border-gray-600 hover:border-gray-400'}`}
                              style={{ backgroundColor: '#111' }}
                              title="Black"
                            />
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedColors(prev => ({ ...prev, [product.id]: 'White' })); }}
                              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 cursor-pointer transition-all ${(selectedColors[product.id] === 'White') ? 'border-cyan-400 scale-110 shadow-lg' : 'border-gray-600 hover:border-gray-400'}`}
                              style={{ backgroundColor: '#f3f4f6' }}
                              title="White"
                            />
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center justify-between gap-2 pt-3 sm:pt-4 border-t border-gray-800/50">
                          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden shadow-lg">
                            <button
                              type="button"
                              className="px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold text-white hover:text-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-300"
                              onClick={() => handleAddToCart(product)}
                              disabled={addingProductId === product.id}
                            >
                              {addingProductId === product.id ? 'Adding...' : 'Add to Cart'}
                            </button>
                          </div>
                          <Link to={`/products/${product.id}`}>
                            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden shadow-lg">
                              <button className="px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold text-white hover:text-cyan-400 transition-all duration-300">
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

              {isPreconfigured && (
                <div className="mt-8 flex justify-center">
                  <Link to="/pcs">
                    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden shadow-lg">
                      <button className="px-8 py-3 text-sm font-bold text-white hover:text-cyan-400 transition-all duration-300">
                        View All
                      </button>
                    </div>
                  </Link>
                </div>
              )}
            </motion.div>
          );
        })}
        
        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 sm:mt-16 lg:mt-20 text-center"
        >
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 sm:p-8 max-w-3xl mx-auto shadow-lg">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 text-white">Don't see what you're looking for?</h3>
            <p className="text-base sm:text-lg mb-6 sm:mb-8 text-gray-300">
              Build your perfect PC from scratch with our configurator. Choose every component and create a system tailored to your exact needs.
            </p>
            <Link to="/configurator" className="inline-block w-full sm:w-auto">
              <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden shadow-lg">
                <button className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold text-white hover:text-cyan-400 transition-all duration-300 w-full sm:w-auto">
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
