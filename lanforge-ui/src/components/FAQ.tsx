import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const FAQ: React.FC = () => {
  const [faqItems, setFaqItems] = useState<{ question: string; answer: string }[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [heights, setHeights] = useState<number[]>([]);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/faqs`)
      .then(res => res.json())
      .then(data => {
        if (data.faqs) setFaqItems(data.faqs);
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    // Measure content heights on mount and when content changes
    const newHeights = contentRefs.current.map(ref => 
      ref ? ref.scrollHeight : 0
    );
    setHeights(newHeights);
  }, [faqItems, openIndex]);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="section py-32 relative overflow-hidden bg-gray-950">
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
            <span className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">FAQ</span>
          </div>
          
          <h2 className="heading-2 mb-6">
            Frequently Asked <span className="text-gradient-neon">Questions</span>
          </h2>
          
          <p className="body-large max-w-3xl mx-auto">
            Got questions? We've got answers. Find everything you need to know about our products and services.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {faqItems.map((item, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ 
                duration: 0.4, 
                delay: index * 0.05,
                ease: "easeOut"
              }}
              className="mb-4"
            >
              <motion.div 
                className="bg-black/40 backdrop-blur-md border border-cyan-500/50 rounded-xl overflow-hidden cursor-pointer group shadow-[0_0_40px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50"
                onClick={() => toggleFAQ(index)}
                whileHover={{ borderColor: 'rgba(6,182,212,0.5)' }}
                whileTap={{ scale: 0.995 }}
              >
                <div className="p-6 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 group-hover:from-cyan-300 group-hover:to-cyan-500 transition-all duration-300">
                    {item.question}
                  </h3>
                  <motion.div 
                    className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50"
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.div>
                </div>
                
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ 
                        opacity: 1, 
                        height: heights[index] || 'auto'
                      }}
                      exit={{ 
                        opacity: 0, 
                        height: 0 
                      }}
                      transition={{ 
                        duration: 0.4,
                        ease: [0.04, 0.62, 0.23, 0.98]
                      }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div 
                        ref={el => { contentRefs.current[index] = el; }}
                        className="px-6 pb-6"
                      >
                        <div className="pt-4 border-t border-gray-700/50">
                          <p className="text-gray-300 leading-relaxed">
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-4">
            <p className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
              Still have questions?
            </p>
            <Link to="/contact">
              <div className="skew-x-[-10deg] bg-black/40 backdrop-blur-md border border-cyan-500/50 rounded-lg overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50 inline-block">
                <button className="skew-x-[10deg] px-6 py-3 font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 hover:from-cyan-300 hover:to-cyan-500 transition-all duration-300">
                  Contact Support
                </button>
              </div>
            </Link>
            <Link to="/faq">
              <div className="skew-x-[-10deg] bg-black/40 backdrop-blur-md border border-cyan-500/50 rounded-lg overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50 inline-block">
                <button className="skew-x-[10deg] px-6 py-3 font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 hover:from-cyan-300 hover:to-cyan-500 transition-all duration-300">
                  View All FAQs
                </button>
              </div>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
