import React from 'react';
import Hero from '../components/Hero';
import ProductShowcase from '../components/ProductShowcase';
import Reviews from '../components/Reviews';
import FAQ from '../components/FAQ';
import Warranty from '../components/Warranty';
import SEO from '../components/SEO';

const HomePage: React.FC = () => {
  return (
    <>
      <SEO 
        title="LANForge | Custom Gaming PC Builder"
        description="Build your dream gaming PC with our interactive configurator. High‑performance custom builds for gamers and creators."
        url="https://lanforge.com/"
      />
      <Hero />
      <ProductShowcase />
      <Reviews />
      <FAQ />
      <Warranty />
    </>
  );
};

export default HomePage;
