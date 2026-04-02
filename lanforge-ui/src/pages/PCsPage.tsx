import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDesktop, faBolt, faShieldHalved, faTruckFast, faWrench } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  image?: string;
  specs: string[];
  imageColor: string;
  tags: string[];
  basePrice: number;
}

const PCsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [expandedSpecs, setExpandedSpecs] = useState<Record<number, boolean>>({});
  const [selectedSeries, setSelectedSeries] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('price-asc');

  React.useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/products?limit=100`)
      .then(res => res.json())
      .then(data => {
        if (data.products) {
          const mapped = data.products.map((p: any) => ({
            id: p._id,
            name: p.name,
            description: p.shortDescription || p.description,
            price: `$${p.price.toFixed(2)}`,
            basePrice: p.price,
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
            imageColor: '#10b981', // Fallback color
            tags: p.tags || []
          }));
          setProducts(mapped);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const toggleSpecs = (productId: number) => {
    setExpandedSpecs(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const seriesOrder = [
    { label: 'LANForge Series', tag: 'lanforge series' },
    { label: 'LANForge Mini Series', tag: 'mini series' },
    { label: 'Pre Configured', tag: 'preconfig' }
  ];
  const allSeries = ['All', ...seriesOrder.map(s => s.label)];

  // Filter and sort products
  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return a.basePrice - b.basePrice;
      case 'price-desc':
        return b.basePrice - a.basePrice;
      case 'name-asc':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  // Group by series for display
  const productsBySeries = sortedProducts.reduce((groups, product) => {
    const productTagsLower = product.tags?.map(t => t.toLowerCase()) || [];
    const productSeriesLower = (product as any).series?.toLowerCase() || '';

    seriesOrder.forEach(target => {
      const isMatch = productTagsLower.includes(target.tag) || productSeriesLower === target.tag || productTagsLower.includes(target.label.toLowerCase()) || productSeriesLower === target.label.toLowerCase();
      if (isMatch && (selectedSeries === 'All' || selectedSeries === target.label)) {
        if (!groups[target.label]) {
          groups[target.label] = [];
        }
        groups[target.label].push(product);
      }
    });
    
    return groups;
  }, {} as Record<string, Product[]>);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-10 md:py-16">
        <div className="absolute inset-0 bg-gradient-radial from-emerald-400/10 via-transparent to-transparent" />
        <div className="container-narrow relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="heading-1 mb-6">
              High-Performance Gaming PCs
            </h1>
            <p className="body-large max-w-3xl mx-auto mb-10">
              Discover our complete lineup of custom-built gaming PCs, optimized for maximum performance, 
              stunning visuals, and seamless gameplay. Every system is hand-built and tested for excellence.
            </p>
            
          </motion.div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="section">
        <div className="container-narrow">
          {seriesOrder.map((seriesObj, seriesIndex) => {
            const series = seriesObj.label;
            const seriesProducts = productsBySeries[series];
            if (!seriesProducts || seriesProducts.length === 0) return null;
            
            return (
            <motion.div
              key={series}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: seriesIndex * 0.1 }}
              className="mb-16"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="heading-2 mb-2">{series === 'Pre Configured' ? 'Preconfigured PCs' : series}</h2>
                  <p className="text-gray-400">
                    {series === 'LANForge Series' && 'Flagship performance for serious gamers'}
                    {series === 'LANForge Mini Series' && 'Compact powerhouses for space-conscious setups'}
                    {series === 'Pre Configured' && 'Pre-configured systems ready for immediate delivery'}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">{seriesProducts.length} models available</p>
                </div>
                <div className="badge-primary hidden md:inline-flex">
                  {seriesProducts.length} PCs
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {seriesProducts.map((product) => {
                  const isExpanded = expandedSpecs[product.id] || false;
                  
                  return (
                    <motion.div
                      key={product.id}
                      whileHover={{ y: -5 }}
                      className="card-glow group"
                    >
                      <div className="p-6">
                        {/* Product Image */}
                        <div className="mb-6">
                          <div 
                            className="relative h-48 rounded-xl overflow-hidden bg-gray-900"
                            style={{ backgroundColor: !product.image ? product.imageColor : undefined }}
                          >
                            {product.image ? (
                              <img 
                                src={product.image} 
                                alt={product.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-6xl opacity-30"><FontAwesomeIcon icon={faDesktop} /></div>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                              {product.tags.filter(t => seriesOrder.some(s => s.label.toLowerCase() === t.toLowerCase() || s.tag === t.toLowerCase())).map(tag => (
                                <div key={tag} className="badge-accent inline-block">
                                  {tag === 'Pre Configured' ? 'Preconfigured' : tag}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Product Info */}
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
                              <p className="text-gray-400 mb-4">{product.description}</p>
                            </div>
                            <div className="text-2xl font-bold text-gradient-neon">
                              {product.price}
                            </div>
                          </div>

                          {/* Specs */}
                          <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-300">Key Specifications</h4>
                              <button
                                onClick={() => toggleSpecs(product.id)}
                                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                              >
                                {isExpanded ? 'Show Less' : 'View All Specs'}
                              </button>
                            </div>
                            <ul className="space-y-2">
                              {(isExpanded ? product.specs : product.specs.slice(0, 3)).map((spec, idx) => (
                                <li key={idx} className="flex items-start">
                                  <svg className="w-4 h-4 text-emerald-400 mt-1 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="text-gray-300 text-sm">{spec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3">
                    <Link 
                      to={`/products/${product.id}`}
                      className="btn btn-primary w-full"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </Link>
                    <button className="btn btn-outline w-full">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Customize
                    </button>
                    <button 
                      id={`add-btn-${product.id}`}
                      className="btn btn-secondary w-full transition-all duration-300"
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
                            const btn = document.getElementById(`add-btn-${product.id}`);
                            if (btn) {
                              const originalText = btn.innerHTML;
                              btn.innerHTML = '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Added!';
                              btn.classList.add('bg-emerald-600', 'text-white');
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
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Add to Cart
                    </button>
                  </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )})}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 bg-gray-900/30">
        <div className="container-narrow">
          <div className="text-center mb-12">
            <h2 className="heading-2 mb-4">Why Choose LANForge?</h2>
            <p className="body-large max-w-3xl mx-auto">
              Every PC is built with precision, tested for performance, and backed by our industry-leading warranty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                <div className="text-2xl"><FontAwesomeIcon icon={faWrench} /></div>
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Hand-Built Quality</h3>
              <p className="text-gray-400 text-sm">
                Every system is meticulously assembled and tested by our expert technicians.
              </p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                <div className="text-2xl"><FontAwesomeIcon icon={faBolt} /></div>
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Performance Optimized</h3>
              <p className="text-gray-400 text-sm">
                Fine-tuned for maximum FPS, low latency, and smooth gameplay across all titles.
              </p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                <div className="text-2xl"><FontAwesomeIcon icon={faShieldHalved} /></div>
              </div>
              <h3 className="text-lg font-bold text-white mb-3">3-Year Warranty</h3>
              <p className="text-gray-400 text-sm">
                Comprehensive coverage including parts, labor, and lifetime technical support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10">
        <div className="container-narrow">
          <div className="card-glow p-8 md:p-12 text-center">
            <h2 className="heading-2 mb-4">Ready to Level Up Your Gaming?</h2>
            <p className="body-large max-w-2xl mx-auto mb-8">
              Build your dream PC with our configurator or choose from our ready-to-ship models. 
              Free shipping and lifetime support included.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/configurator" className="btn btn-primary">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Build Your PC
              </Link>
              <Link to="/contact" className="btn btn-outline">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PCsPage;
