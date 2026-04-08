import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDesktop } from '@fortawesome/free-solid-svg-icons';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';

interface Part {
  _id: string;
  name: string;
  type: string;
  brand: string;
  partModel?: string;
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  category: string;
  parts: Part[];
  specs?: Record<string, string>;
}

const ProductsPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>('Black');

  useEffect(() => {
    if (!productId) {
      navigate('/pcs');
      return;
    }

    setLoading(true);
    fetch(`${process.env.REACT_APP_API_URL}/products/${productId}`)
      .then(res => res.json())
      .then(data => {
        if (data.product) {
          setProduct(data.product);
        } else {
          navigate('/pcs');
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [productId, navigate]);

  const addToCart = () => {
    if (!product) return;
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
          product: product._id,
          quantity: 1,
          notes: `Case Color: ${selectedColor}`
        });
        return fetch(`${process.env.REACT_APP_API_URL}/carts/${sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: mappedItems })
        });
      })
      .then(() => {
        navigate('/cart');
      })
      .catch(err => console.error(err));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) return null;

  const hasImages = product.images && product.images.length > 0;
  const mainImage = hasImages ? product.images[activeImageIndex] : '';

  const formatPart = (part: Part) => {
    const modelStr = part.partModel || (part.name ? part.name.replace(new RegExp(`^${part.brand}\\s*`, 'i'), '') : '');
    return `${part.brand} ${modelStr}`.trim();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-emerald-500/30 pt-24 pb-16">
      <SEO 
        title={product.name ? `${product.name} | LANForge Products` : "PC Components & Hardware | LANForge"}
        description={product.description || "Browse our selection of premium PC components, gaming hardware, and accessories."}
        url={`https://lanforge.com/products/${product._id}`}
        image={product.images?.[0] || "https://lanforge.com/logo512.png"}
      />
      <div className="container-narrow px-6 max-w-6xl mx-auto">
        
        {/* Breadcrumb */}
        <nav className="flex text-sm text-gray-400 mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link to="/pcs" className="hover:text-white transition-colors">Desktop PCs</Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-3 h-3 mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                </svg>
                <span className="ml-1 text-gray-300">{product.name}</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* Left Column: Images */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="sticky top-24"
          >
            {hasImages ? (
              <div className="relative aspect-[4/3] w-full bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-xl">
                <img 
                  src={mainImage} 
                  alt={product.name} 
                  className="w-full h-full object-contain p-4"
                />
              </div>
            ) : (
              <div className="relative aspect-[4/3] w-full bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-xl flex items-center justify-center">
                <div className="text-8xl opacity-20"><FontAwesomeIcon icon={faDesktop} /></div>
              </div>
            )}
            
            {hasImages && product.images.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                {product.images.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all bg-gray-900 ${
                      idx === activeImageIndex ? 'border-emerald-500' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`${product.name} view ${idx + 1}`} className="w-full h-full object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Right Column: Details & Actions */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col"
          >
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              {product.name}
            </h1>

            <div className="flex items-end gap-4 mb-8">
              <span className="text-3xl font-bold text-white">
                ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-lg text-gray-500 line-through mb-1">
                  ${product.compareAtPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>

            {/* Color Selection */}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-400 mb-2">Case Color</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedColor('Black')}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === 'Black' ? 'border-emerald-400 scale-110' : 'border-gray-600 hover:border-gray-400'}`}
                  style={{ backgroundColor: '#111' }}
                  title="Black"
                />
                <button
                  onClick={() => setSelectedColor('White')}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === 'White' ? 'border-emerald-400 scale-110' : 'border-gray-600 hover:border-gray-400'}`}
                  style={{ backgroundColor: '#f3f4f6' }}
                  title="White"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10 border-b border-gray-800 pb-10">
              <button 
                onClick={addToCart}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Add to Cart
              </button>
              <button 
                onClick={() => {
                  let caseId = '';
                  // Support different permutations of "case"
                  const casePart = product.parts.find(p => {
                    const t = p.type ? p.type.toLowerCase() : '';
                    return t === 'case' || t === 'chassis';
                  });
                  if (casePart) {
                    caseId = casePart._id;
                  }
                  
                  const targetUrl = caseId ? `/configurator?case=${caseId}&base=${product._id}` : `/configurator?base=${product._id}`;
                  navigate(targetUrl);
                }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3.5 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2 border border-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Customize
              </button>
            </div>

            {/* Specs List */}
            <div>
              <h3 className="text-xl font-bold mb-4">Technical Specifications</h3>
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden text-sm">
                
                {product.parts && product.parts.length > 0 && product.parts.map((part, index) => (
                  <div key={part._id || index} className="flex border-b border-gray-800 last:border-0 p-4 hover:bg-gray-800/50 transition-colors">
                    <span className="w-1/3 text-gray-400 font-medium uppercase tracking-wider text-xs flex items-center">
                      {part.type}
                    </span>
                    <span className="w-2/3 text-white font-medium">
                      {formatPart(part)}
                    </span>
                  </div>
                ))}

                {product.specs && Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="flex border-b border-gray-800 last:border-0 p-4 hover:bg-gray-800/50 transition-colors">
                    <span className="w-1/3 text-gray-400 font-medium uppercase tracking-wider text-xs flex items-center">
                      {key}
                    </span>
                    <span className="w-2/3 text-white font-medium">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
