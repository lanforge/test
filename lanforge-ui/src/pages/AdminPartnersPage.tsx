import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import AdminAddPartnerModal from '../components/AdminAddPartnerModal';

interface Partner {
  _id: string;
  name: string;
  website: string;
  logo: string;
  isActive: boolean;
}

interface AffiliateApp {
  _id: string;
  name: string;
  email: string;
  socialLinks: string[];
  audienceSize: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const AdminPartnersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'partners' | 'affiliates'>('partners');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Partners state
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(true);

  // Affiliates state
  const [affiliates, setAffiliates] = useState<AffiliateApp[]>([]);
  const [affiliateStatus, setAffiliateStatus] = useState('all');
  const [isLoadingAffiliates, setIsLoadingAffiliates] = useState(true);

  const fetchPartners = async () => {
    setIsLoadingPartners(true);
    try {
      const response = await api.get('/partners/admin/all');
      setPartners(response.data.partners || []);
    } catch (error) {
      console.error('Failed to fetch partners', error);
    } finally {
      setIsLoadingPartners(false);
    }
  };

  const fetchAffiliates = async () => {
    setIsLoadingAffiliates(true);
    try {
      const response = await api.get('/affiliates/admin/all', {
        params: { status: affiliateStatus !== 'all' ? affiliateStatus : undefined }
      });
      setAffiliates(response.data.applications || []);
    } catch (error) {
      console.error('Failed to fetch affiliates', error);
    } finally {
      setIsLoadingAffiliates(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'partners') {
      fetchPartners();
    } else {
      fetchAffiliates();
    }
  }, [activeTab, affiliateStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'rejected': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Partners & Affiliates</h1>
          <p className="text-gray-400 mt-1">Manage brand partners and affiliate applications</p>
        </div>
        {activeTab === 'partners' && (
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium"
            >
              + Add Partner
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('partners')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'partners'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            Brand Partners
          </button>
          <button
            onClick={() => setActiveTab('affiliates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'affiliates'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            Affiliate Applications
          </button>
        </nav>
      </div>

      {activeTab === 'partners' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Partners list */}
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">Partner Name</th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">Website</th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">Status</th>
                  <th className="py-3 px-4 text-right text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {isLoadingPartners ? (
                  <tr><td colSpan={4} className="p-6 text-center text-gray-500">Loading partners...</td></tr>
                ) : partners.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-gray-500">No partners found</td></tr>
                ) : (
                  partners.map(p => (
                    <tr key={p._id} className="hover:bg-gray-800/30">
                      <td className="py-3 px-4 text-white font-medium flex items-center space-x-3">
                        <img src={p.logo} alt={p.name} className="w-8 h-8 object-contain bg-white rounded p-1" />
                        <Link to={`/admin/partners/${p._id}`} className="hover:text-emerald-400 transition-colors">
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-emerald-400 text-sm">
                        {p.website ? (
                          <a href={p.website} target="_blank" rel="noreferrer" className="hover:underline">{p.website}</a>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${p.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/30'}`}>
                          {p.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link to={`/admin/partners/${p._id}`} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors inline-block" title="View Details">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'affiliates' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Filters */}
          <div className="card p-4">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                  <select
                    value={affiliateStatus}
                    onChange={(e) => setAffiliateStatus(e.target.value)}
                    className="input px-3 py-2 bg-gray-900/70 border-gray-700 text-sm rounded-lg"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button 
                    onClick={fetchAffiliates}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg py-2 font-medium transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="py-3 px-4 text-left text-gray-400 font-medium text-sm">Applicant</th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium text-sm">Audience Size</th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium text-sm">Socials</th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium text-sm">Date</th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium text-sm">Status</th>
                  <th className="py-3 px-4 text-right text-gray-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {isLoadingAffiliates ? (
                  <tr><td colSpan={6} className="p-6 text-center text-gray-500">Loading applications...</td></tr>
                ) : affiliates.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-gray-500">No applications found</td></tr>
                ) : (
                  affiliates.map(app => (
                    <tr key={app._id} className="hover:bg-gray-800/30">
                      <td className="py-3 px-4">
                        <p className="text-white font-medium">{app.name}</p>
                        <p className="text-gray-400 text-sm">{app.email}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{app.audienceSize}</td>
                      <td className="py-3 px-4 text-blue-400 text-sm">
                        {app.socialLinks.map((link, idx) => (
                          <a key={idx} href={link} target="_blank" rel="noreferrer" className="block hover:underline truncate max-w-[150px]">{link}</a>
                        ))}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(app.status)}`}>
                          {app.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700">
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AdminAddPartnerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchPartners}
      />
    </div>
  );
};

export default AdminPartnersPage;
