import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faShieldHalved, faTrophy } from '@fortawesome/free-solid-svg-icons';

const Hero: React.FC = () => {
  return (
    <section className="relative min-h-[70vh] sm:min-h-[75vh] lg:min-h-[85vh] flex items-center justify-center overflow-hidden bg-gray-950 pb-32 sm:pb-40 pt-16 sm:pt-20">
      {/* Solid background */}
      <div className="absolute inset-0 bg-gray-950" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }} />
      </div>

      <div className="container-narrow relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="space-y-6 sm:space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-black/40 backdrop-blur-md border border-cyan-500/50 mb-4 sm:mb-6 shadow-[0_0_40px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                <span className="text-xs sm:text-sm font-medium text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">Premium Gaming PCs</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight text-white">
                Build Your Ultimate
                <span className="block text-gradient-neon pt-2 pb-2 leading-[1.2]">Gaming Rig</span>
              </h1>
              
              <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-2xl">
                Custom-built PCs with cutting-edge components for maximum performance. 
                Every system is handcrafted, tested, and optimized for your gaming needs.
              </p>
            </motion.div>

            {/* Stats */}
            <motion.div 
              className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {[
                { number: '5 day', label: 'build time', icon: faBolt, color: 'text-emerald-400' },
                { number: '3 year', label: 'warranty', icon: faShieldHalved, color: 'text-blue-400' },
                { number: '1000+', label: 'systems built', icon: faTrophy, color: 'text-purple-400' }
              ].map((stat, idx) => (
                <div key={idx} className="bg-black/40 backdrop-blur-md border border-cyan-500/50 rounded-xl p-3 sm:p-4 md:p-6 text-center shadow-[0_0_40px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50 flex flex-col items-center justify-center min-h-[120px] sm:min-h-[140px] md:min-h-[160px]">
                  <div className="text-xl sm:text-2xl md:text-3xl mb-2 sm:mb-3 text-white"><FontAwesomeIcon icon={stat.icon} /></div>
                  <div className={`text-lg sm:text-2xl md:text-3xl font-bold ${stat.color} mb-1 sm:mb-2`}>
                    {stat.number}
                  </div>
                  <div className="text-xs sm:text-sm md:text-base font-medium text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">{stat.label}</div>
                </div>
              ))}
            </motion.div>

            {/* Actions */}
            <motion.div 
              className="flex flex-wrap gap-3 sm:gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Link to="/configurator">
                <div className="skew-x-[-10deg] bg-black/40 backdrop-blur-md border border-cyan-500/50 rounded-lg overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50">
                  <button className="skew-x-[10deg] px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 hover:from-cyan-300 hover:to-cyan-500 transition-all duration-300">
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Start Building
                  </button>
                </div>
              </Link>
              <Link to="/pcs">
                <div className="skew-x-[-10deg] bg-black/40 backdrop-blur-md border border-cyan-500/50 rounded-lg overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50">
                  <button className="skew-x-[10deg] px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 hover:from-cyan-300 hover:to-cyan-500 transition-all duration-300">
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    View Pre‑builts
                  </button>
                </div>
              </Link>
            </motion.div>
          </div>

          {/* Image Display */}
          <motion.div 
            className="relative mt-8 lg:mt-0"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="bg-black/40 backdrop-blur-md border border-cyan-500/50 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50">
              <div className="relative">
                <img 
                  src="/Tradeify-Picture.png" 
                  alt="LANForge Gaming PC" 
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent" />
              </div>
            </div>
            
            {/* Badge */}
            <div className="absolute -bottom-3 sm:-bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-black/40 backdrop-blur-xl border border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                <span className="text-xs sm:text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">RTX 5090 READY</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 hidden sm:flex z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-500">SCROLL TO EXPLORE</span>
          <div className="w-6 h-10 border-2 border-gray-700 rounded-full flex justify-center">
            <motion.div 
              className="w-1 h-3 bg-gradient-to-b from-emerald-400 to-blue-500 rounded-full mt-2"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;