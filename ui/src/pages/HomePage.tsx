import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMicrochip,
  faTruckFast,
  faHeadset,
  faCertificate,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import Hero from '../components/Hero';
import ProductShowcase from '../components/ProductShowcase';
import Reviews from '../components/Reviews';
import FAQ from '../components/FAQ';
import Warranty from '../components/Warranty';
import SEO from '../components/SEO';

const SectionDivider: React.FC = () => (
  <div className="relative w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
);

const SectionLabel: React.FC<{ eyebrow: string; title: string; description?: string }> = ({
  eyebrow,
  title,
  description,
}) => (
  <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
    <span className="inline-block text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-cyan-400 mb-3">
      {eyebrow}
    </span>
    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
      {title}
    </h2>
    {description && (
      <p className="text-base sm:text-lg text-gray-400 leading-relaxed">
        {description}
      </p>
    )}
  </div>
);

const HomePage: React.FC = () => {
  const valueProps = [
    {
      icon: faMicrochip,
      title: 'Premium Components',
      description:
        'Hand-picked parts from trusted brands. Every build uses the latest hardware tested for reliability.',
    },
    {
      icon: faCertificate,
      title: '3 Year Warranty',
      description:
        'Industry-leading coverage on every system. Parts, labor, and free shipping for repairs included.',
    },
    {
      icon: faTruckFast,
      title: 'Fast Build & Ship',
      description:
        'Most builds complete within 5 business days. Carefully packaged and shipped to your door.',
    },
    {
      icon: faHeadset,
      title: 'Lifetime Support',
      description:
        'Real technicians, not bots. Get help with setup, upgrades, or troubleshooting any time.',
    },
  ];

  return (
    <div className="bg-gray-950">
      <SEO
        title="LANForge | Custom Gaming PC Builder"
        description="Build your dream gaming PC with our interactive configurator. High‑performance custom builds for gamers and creators."
        url="https://lanforge.co/"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'LANForge',
          url: 'https://lanforge.co',
          logo: 'https://lanforge.co/logo512.png',
          description:
            'Premium custom gaming PC builder. Design your ultimate gaming rig with cutting-edge components.',
          sameAs: ['https://twitter.com/LANForge', 'https://instagram.com/LANForge'],
        }}
      />

      {/* Hero */}
      <Hero />

      <SectionDivider />

      {/* Why LANForge — value props */}
      <section className="bg-gray-950 py-20 sm:py-24">
        <div className="container-narrow">
          <SectionLabel
            eyebrow="Why LANForge"
            title="Built better, backed longer"
            description="A small team of builders obsessed with quality. No drop-shipping, no shortcuts — every PC is assembled, cabled, and tested in-house."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {valueProps.map((prop, idx) => (
              <div
                key={idx}
                className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-5">
                  <FontAwesomeIcon icon={prop.icon} className="text-cyan-400 text-xl" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{prop.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{prop.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Featured PCs */}
      <section className="bg-gray-900/30 py-20 sm:py-24">
        <div className="container-narrow">
          <SectionLabel
            eyebrow="Our Lineup"
            title="Featured Pre-Built PCs"
            description="Curated systems for every budget and use case. Each ships ready-to-game out of the box."
          />
          <ProductShowcase />
        </div>
      </section>

      <SectionDivider />

      {/* Build CTA */}
      <section className="bg-gray-950 py-20 sm:py-24">
        <div className="container-narrow">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border border-gray-800 p-10 sm:p-14 lg:p-16">
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`,
                backgroundSize: '60px 60px',
              }}
            />
            <div className="relative grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <span className="inline-block text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-cyan-400 mb-3">
                  Custom Configurator
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                  Design a PC that's truly yours
                </h2>
                <p className="text-base sm:text-lg text-gray-400 leading-relaxed mb-8">
                  Pick every component — CPU, GPU, cooling, lighting, the works. Real-time
                  pricing and compatibility checks make it impossible to go wrong.
                </p>
                <Link
                  to="/configurator"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold transition-colors"
                >
                  Start Building
                  <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'CPUs', count: '40+' },
                  { label: 'GPUs', count: '25+' },
                  { label: 'Cases', count: '30+' },
                  { label: 'Configs', count: '∞' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-gray-950/60 border border-gray-800 rounded-lg p-5 text-center"
                  >
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                      {item.count}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wider">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Reviews */}
      <section className="bg-gray-900/30 py-20 sm:py-24">
        <div className="container-narrow">
          <SectionLabel
            eyebrow="Customer Stories"
            title="Trusted by gamers everywhere"
            description="See what our customers have to say about their LANForge experience."
          />
          <Reviews />
        </div>
      </section>

      <SectionDivider />

      {/* Warranty */}
      <section className="bg-gray-950 py-20 sm:py-24">
        <div className="container-narrow">
          <Warranty />
        </div>
      </section>

      <SectionDivider />

      {/* FAQ */}
      <section className="bg-gray-900/30 py-20 sm:py-24">
        <div className="container-narrow">
          <SectionLabel
            eyebrow="FAQ"
            title="Questions, answered"
            description="Common questions about our PCs, builds, shipping, and support."
          />
          <FAQ />
        </div>
      </section>
    </div>
  );
};

export default HomePage;