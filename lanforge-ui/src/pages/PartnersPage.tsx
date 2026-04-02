import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandshake, faNewspaper } from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';

interface OrganizationPartner {
  id: number;
  name: string;
  description: string;
  logoColor: string;
  category: string;
  partnershipType: string;
  since: string;
  website: string;
}

interface IndividualPartner {
  id: number;
  name: string;
  role: string;
  expertise: string[];
  avatarColor: string;
  social: {
    twitter?: string;
    twitch?: string;
    youtube?: string;
    instagram?: string;
  };
  achievements: string[];
}

const PartnersPage: React.FC = () => {
  const [organizationPartners, setOrganizationPartners] = React.useState<OrganizationPartner[]>([]);
  const [individualPartners, setIndividualPartners] = React.useState<IndividualPartner[]>([]);

  React.useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/partners`)
      .then(res => res.json())
      .then(data => {
        if (data.partners) {
          const orgs = data.partners
            .filter((p: any) => p.isPartner)
            .map((p: any) => ({
              id: p._id,
              name: p.name,
              description: p.description || '',
              logoColor: '#ff6b35',
              category: 'Partner',
              partnershipType: 'Official Partner',
              since: new Date(p.createdAt).getFullYear().toString(),
              website: p.website || '#'
            }));
            
          const inds = data.partners
            .filter((p: any) => !p.isPartner)
            .map((p: any) => ({
              id: p._id,
              name: p.name,
              role: 'Affiliate',
              expertise: [],
              avatarColor: '#3a86ff',
              social: {
                twitter: p.twitter,
                twitch: p.twitch,
                youtube: p.youtube,
                instagram: p.instagram
              },
              achievements: []
            }));
            
          setOrganizationPartners(orgs);
          setIndividualPartners(inds);
        }
      })
      .catch(err => console.error(err));
  }, []);
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
              Our Partners
            </h1>
            <p className="body-large max-w-3xl mx-auto mb-10">
              Collaborating with industry leaders and experts to deliver exceptional PC building experiences
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
              <div className="card p-6 text-center">
                <div className="text-3xl font-bold text-gradient-neon mb-2">12</div>
                <div className="text-gray-400">Organization Partners</div>
              </div>
              <div className="card p-6 text-center">
                <div className="text-3xl font-bold text-gradient-neon mb-2">8</div>
                <div className="text-gray-400">Individual Experts</div>
              </div>
              <div className="card p-6 text-center">
                <div className="text-3xl font-bold text-gradient-neon mb-2">2025</div>
                <div className="text-gray-400">Partnerships Started</div>
              </div>
              <div className="card p-6 text-center">
                <div className="text-3xl font-bold text-gradient-neon mb-2">Global</div>
                <div className="text-gray-400">Network Reach</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Organization Partners */}
      <section className="section">
        <div className="container-narrow">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-16"
          >
            <div className="text-center mb-12">
              <h2 className="heading-2 mb-4">Organization Partners</h2>
              <p className="body-large max-w-3xl mx-auto">
                Collaborating with industry leaders to bring you the best components and technology
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {organizationPartners.map((partner, idx) => (
                <motion.div
                  key={partner.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 + idx * 0.05 }}
                  className="card-glow p-6"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: partner.logoColor }}
                    >
                      {partner.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">{partner.name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">
                          {partner.category}
                        </span>
                        <span className="px-3 py-1 bg-emerald-500/20 rounded-full text-sm text-emerald-400">
                          {partner.partnershipType}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">Partner since {partner.since}</div>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-6">{partner.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <a 
                      href={partner.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gradient-neon font-medium hover:underline"
                    >
                      Visit Website →
                    </a>
                    <div className="text-sm text-gray-400">
                      Official Partner
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Individual Partners */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="text-center mb-12">
              <h2 className="heading-2 mb-4">Individual Experts</h2>
              <p className="body-large max-w-3xl mx-auto">
                Working with industry experts to provide specialized knowledge and unique perspectives
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {individualPartners.map((partner, idx) => (
                <motion.div
                  key={partner.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 + idx * 0.05 }}
                  className="card-glow p-6"
                >
                  <div className="text-center mb-6">
                    <div 
                      className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white"
                      style={{ backgroundColor: partner.avatarColor }}
                    >
                      {partner.name.split(' ').map(n => n.charAt(0)).join('')}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{partner.name}</h3>
                    <div className="text-gradient-neon font-medium mb-2">{partner.role}</div>
                    <div className="text-sm text-gray-400">LANForge Partner</div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Expertise</h4>
                    <div className="flex flex-wrap gap-2">
                      {partner.expertise.map((skill, skillIdx) => (
                        <span 
                          key={skillIdx}
                          className="px-3 py-1 bg-gray-800/50 rounded-full text-sm text-gray-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Notable Achievements</h4>
                    <ul className="space-y-2">
                      {partner.achievements.map((achievement, achievementIdx) => (
                        <li key={achievementIdx} className="flex items-start gap-2">
                          <span className="text-emerald-400 mt-1">•</span>
                          <span className="text-gray-300 text-sm">{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4">
                    {partner.social.twitter && (
                      <a 
                        href={`https://twitter.com/${partner.social.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white"
                      >
                        𝕏
                      </a>
                    )}
                    {partner.social.twitch && (
                      <a 
                        href={`https://twitch.tv/${partner.social.twitch}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white"
                      >
                        <span className="text-purple-400">Tw</span>
                      </a>
                    )}
                    {partner.social.youtube && (
                      <a 
                        href={`https://youtube.com/${partner.social.youtube}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white"
                      >
                        <span className="text-red-400">YT</span>
                      </a>
                    )}
                    {partner.social.instagram && (
                      <a 
                        href={`https://instagram.com/${partner.social.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white"
                      >
                        <span className="text-pink-400">IG</span>
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10">
        <div className="container-narrow">
          <div className="card-glow p-8 md:p-12 text-center">
            <h2 className="heading-2 mb-4">Become a LANForge Partner</h2>
            <p className="body-large max-w-2xl mx-auto mb-8">
              Join our network of industry leaders and experts. Whether you're an organization or individual,
              we're always looking for passionate partners to collaborate with.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/contact" className="btn btn-primary">
                <span className="mr-2"><FontAwesomeIcon icon={faHandshake} /></span>
                Partner Inquiry
              </a>
              <a href="/press" className="btn btn-outline">
                <span className="mr-2"><FontAwesomeIcon icon={faNewspaper} /></span>
                Media Kit
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PartnersPage;
                   