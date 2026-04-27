import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faClipboardCheck, faShieldHalved } from '@fortawesome/free-solid-svg-icons';

const Hero: React.FC = () => {
  const highlights = [
    { label: 'Typical build time', value: '5 business days', icon: faBolt },
    { label: 'Warranty coverage', value: '3 years', icon: faShieldHalved },
    { label: 'Assembly process', value: 'Built and tested in-house', icon: faClipboardCheck },
  ];

  return (
    <section className="relative overflow-hidden bg-gray-950 py-16 md:py-24">
      <div className="absolute inset-0 bg-gradient-radial from-emerald-400/10 via-transparent to-transparent" />

      <div className="container-narrow relative z-10">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-center">
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
              
              <h1 className="heading-1 mb-6">
                Performance PCs, built clean and tested properly.
              </h1>
              
              <p className="body-large max-w-2xl mb-8">
                Choose a ready-to-ship model or configure a system around the games,
                software, and budget you actually use. Every LANForge PC is assembled,
                cabled, and stress tested before it ships.
              </p>
            </motion.div>

            {/* Actions */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Link to="/configurator" className="btn btn-primary">
                Start a Custom Build
              </Link>
              <Link to="/pcs" className="btn btn-outline">
                Shop Prebuilt PCs
              </Link>
            </motion.div>

            {/* Highlights */}
            <motion.div
              className="grid gap-3 sm:grid-cols-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {highlights.map((item) => (
                <div key={item.label} className="card p-4">
                  <div className="text-cyan-400 mb-3">
                    <FontAwesomeIcon icon={item.icon} />
                  </div>
                  <div className="text-sm text-gray-500 mb-1">{item.label}</div>
                  <div className="text-sm text-white leading-snug">{item.value}</div>
                </div>
              ))}
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

              <div className="grid grid-cols-2 gap-3 mt-4">
                {['Thermals checked', 'Cable managed', 'BIOS updated', 'Burn-in tested'].map((item) => (
                  <div key={item} className="rounded-lg bg-gray-950/70 border border-gray-800 px-3 py-2 text-xs text-gray-300">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;