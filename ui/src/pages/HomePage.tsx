import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMicrochip,
  faCertificate,
  faClipboardCheck,
  faBoxOpen,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import Hero from '../components/Hero';
import ProductShowcase from '../components/ProductShowcase';
import Reviews from '../components/Reviews';
import FAQ from '../components/FAQ';
import Warranty from '../components/Warranty';
import SEO from '../components/SEO';

const SectionDivider: React.FC = () => (
  <div className="relative h-px w-full bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
);

const SectionLabel: React.FC<{ eyebrow: string; title: string; description?: string }> = ({
  eyebrow,
  title,
  description,
}) => (
  <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
    <span className="mb-4 inline-flex items-center gap-3 rounded-full border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
      <span className="h-2 w-2 rounded-full bg-cyan-400" />
      {eyebrow}
    </span>
    <h2 className="heading-2 mb-4">
      {title}
    </h2>
    {description && (
      <p className="body-large">
        {description}
      </p>
    )}
  </div>
);

const HomePage: React.FC = () => {
  const valueProps = [
    {
      icon: faMicrochip,
      title: 'Current Parts',
      description:
        'We source proven components from brands we trust, then match them to the workload instead of chasing buzzwords.',
    },
    {
      icon: faClipboardCheck,
      title: 'Real Testing',
      description:
        'Every system goes through BIOS updates, thermal checks, stress testing, and a final physical inspection.',
    },
    {
      icon: faBoxOpen,
      title: 'Shipped Safely',
      description:
        'PCs leave our shop packed for transit with clear setup notes so unboxing stays simple.',
    },
    {
      icon: faCertificate,
      title: '3-Year Warranty',
      description:
        'Coverage includes parts, labor, troubleshooting, and repair shipping for qualifying warranty work.',
    },
  ];

  const processSteps = [
    {
      title: 'Choose the right starting point',
      description:
        'Start with a ready-to-ship model, customize a listed PC, or use the configurator for a ground-up build.',
    },
    {
      title: 'We assemble and validate it',
      description:
        'Your system is built by our team, cable managed, updated, and tested under load before it is packed.',
    },
    {
      title: 'Support stays available',
      description:
        'Need help with setup, upgrades, or an issue later? Our support team knows the hardware we ship.',
    },
  ];

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

      {/* Why LANForge */}
      <section className="section bg-gray-950">
        <div className="container-narrow">
          <SectionLabel
            eyebrow="Why LANForge"
            title="Straightforward builds. Careful execution."
            description="Clear options, careful assembly, and practical support from the first configuration through long-term ownership."
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {valueProps.map((prop, idx) => (
              <div
                key={idx}
                className="card p-6"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-gray-800 bg-gray-950 text-lg">
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

      <ProductShowcase />

      <SectionDivider />

      {/* Process */}
      <section className="section bg-gray-950">
        <div className="container-narrow">
          <SectionLabel
            eyebrow="How it works"
            title="From configuration to first boot"
            description="A clearer buying process, fewer surprises, and support from people who understand the machines."
          />

          <div className="grid gap-6 md:grid-cols-3">
            {processSteps.map((step, index) => (
              <div key={step.title} className="card p-6">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-sm font-bold text-cyan-400">
                  {index + 1}
                </div>
                <h3 className="mb-3 text-xl font-bold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Build CTA */}
      <section className="section bg-gray-950">
        <div className="container-narrow">
          <div className="card-glow p-8 md:p-12">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <span className="badge-accent mb-4">Custom Configurator</span>
                <h2 className="heading-2 mb-4">
                  Build around the way you play and work
                </h2>
                <p className="body-large mb-8">
                  Select the core parts, compare the price as you go, and send us a
                  configuration that is ready for assembly. If you need guidance, we can
                  help tune the build before checkout.
                </p>
                <Link to="/configurator" className="btn btn-primary gap-2">
                  Start a Custom Build
                  <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Build paths', count: 'Custom' },
                  { label: 'Warranty', count: '3 yr' },
                  { label: 'Support', count: 'Ongoing' },
                  { label: 'Testing', count: 'Included' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-gray-800 bg-gray-950/70 p-5 text-center"
                  >
                    <div className="mb-1 text-2xl font-bold text-white sm:text-3xl">
                      {item.count}
                    </div>
                    <div className="text-xs uppercase tracking-wider text-gray-500 sm:text-sm">
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

      <Reviews />

      <SectionDivider />

      <Warranty />

      <SectionDivider />

      <FAQ />
    </div>
  );
};

export default HomePage;