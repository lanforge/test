import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import Hero from '../components/Hero';
import ProductShowcase from '../components/ProductShowcase';
import Reviews from '../components/Reviews';
import SEO from '../components/SEO';

const SectionDivider: React.FC = () => (
  <div className="relative h-px w-full bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
);

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-950">
      <SEO
        title="LANForge | Custom Gaming PC Builder"
        description="Shop ready-to-ship LANForge gaming PCs or configure a custom system built, tested, and supported by our in-house team."
        url="https://lanforge.co/"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'LANForge',
          url: 'https://lanforge.co',
          logo: 'https://lanforge.co/logo512.png',
          description:
            'Custom gaming PC builder offering ready-to-ship and configurable systems.',
          sameAs: ['https://twitter.com/LANForge', 'https://instagram.com/LANForge'],
        }}
      />

      <Hero />

      <SectionDivider />

      <ProductShowcase />

      <SectionDivider />

      {/* Quality band */}
      <section className="py-16 bg-gray-950">
        <div className="container-narrow">
          <div className="card p-8 md:p-10">
            <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
                  Built in-house
                </p>
                <h2 className="mb-4 text-2xl font-bold text-white md:text-4xl">
                  Clean assembly, real testing, and support after delivery.
                </h2>
                <p className="max-w-2xl text-gray-400">
                  We keep the promise simple: assemble the PC carefully, validate it
                  before shipping, and help if you need support later.
                </p>
              </div>

              <div className="grid gap-3 text-sm text-gray-300">
                {[
                  '3-year warranty',
                  'Stress tested before shipping',
                  'Practical setup and upgrade support',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-950/70 px-4 py-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-xs text-cyan-400">
                      <FontAwesomeIcon icon={faCheck} />
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Build CTA */}
      <section className="py-20 bg-gray-950">
        <div className="container-narrow">
          <div className="card-glow p-10 text-center md:p-14">
            <h2 className="heading-2 mb-4">Ready to build yours?</h2>
            <p className="body-large mx-auto mb-8 max-w-2xl">
              Start with the configurator and send us a build that is ready to assemble.
            </p>
            <Link to="/configurator" className="btn btn-primary px-8 py-4 text-lg">
              Start a Custom Build
            </Link>
          </div>
        </div>
      </section>

      <SectionDivider />

      <Reviews />
    </div>
  );
};

export default HomePage;