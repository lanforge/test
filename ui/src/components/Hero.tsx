import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-gray-950 py-20 md:py-32">
      <div className="absolute inset-0 bg-gradient-radial from-emerald-400/10 via-transparent to-transparent" />

      <div className="container-narrow relative z-10">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-20 items-center">
          {/* Content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gray-900 border border-gray-800 mb-6 shadow-lg">
                <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                <span className="text-sm font-medium text-white">Custom gaming PCs</span>
              </div>
              
              <h1 className="heading-1 mb-6 max-w-3xl">
                Build a PC that fits what you actually play.
              </h1>
              
              <p className="body-large max-w-xl mb-10">
                Start with a clean configuration, choose the parts that matter, and
                we will assemble, test, and ship the finished system.
              </p>
            </motion.div>

            {/* Actions */}
            <motion.div
              className="flex flex-col sm:flex-row sm:items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Link to="/configurator" className="btn btn-primary px-8 py-4 text-lg">
                Start a Custom Build
              </Link>
              <Link to="/pcs" className="text-gray-400 hover:text-cyan-400 transition-colors">
                Shop prebuilt PCs
              </Link>
            </motion.div>

            <motion.div
              className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <span>3-year warranty</span>
              <span>Built in-house</span>
              <span>Stress tested before shipping</span>
            </motion.div>
          </div>

          {/* Image Display */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="card-glow p-4 sm:p-5">
              <div className="relative rounded-xl overflow-hidden bg-gray-950 border border-gray-800">
                <img 
                  src="/Tradeify-Picture.png" 
                  alt="LANForge Gaming PC" 
                  className="w-full h-auto object-contain"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;