import React, { useState, useEffect } from 'react';
import api from '../utils/api';

interface Discount {
  _id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  status: 'active' | 'inactive';
  expiresAt: string;
  usedCount: number;
  usageLimit: number;
}

interface LoyaltyMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  loyaltyPoints: number;
  loyaltyTier: string;
  totalSpent: number;
  createdAt: string;
}

const AdminPromotionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'discounts' | 'loyalty'>('discounts');
  
  // Discounts state
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [discountStatus, setDiscountStatus] = useState('all');
  
  // Loyalty state
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [tierStats, setTierStats] = useState<any>({});
  const [memberTier, setMemberTier] = useState('all');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [newDiscount, setNewDiscount] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'free_shipping',
    value: 0,
    minOrder: 0,
    usageLimit: 100,
    expiresAt: ''
  });

  const fetchDiscounts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/discounts', { params: { status: discountStatus } });
      setDiscounts(res.data.discounts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLoyalty = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/loyalty/members', { params: { tier: memberTier } });
      setMembers(res.data.members || []);
      setTierStats(res.data.tierStats || {});
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'discounts') {
      fetchDiscounts();
    } else {
      fetchLoyalty();
    }
  }, [activeTab, discountStatus, memberTier]);

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/discounts', newDiscount);
      setIsDiscountModalOpen(false);
      setNewDiscount({
        code: '',
        type: 'percentage',
        value: 0,
        minOrder: 0,
        usageLimit: 100,
        expiresAt: ''
      });
      fetchDiscounts();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error creating discount');
    }
  };

  const getTierColor = (tier: string = '') => {
    switch (tier.toLowerCase()) {
      case 'platinum': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'gold': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'silver': return 'bg-gray-400/10 text-gray-300 border-gray-400/30';
      case 'bronze': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Promotions & Loyalty</h1>
          <p className="text-gray-400 mt-1">Manage discounts and customer rewards</p>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium"
            onClick={() => activeTab === 'discounts' ? setIsDiscountModalOpen(true) : null}
          >
            {activeTab === 'discounts' ? '+ Create Discount' : '+ Adjust Points'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('discounts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'discounts'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            Discount Codes
          </button>
          <button
            onClick={() => setActiveTab('loyalty')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'loyalty'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            Loyalty Program
          </button>
        </nav>
      </div>

      {activeTab === 'discounts' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Discount Filters */}
          <div className="card p-4">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search discounts..."
                    className="input pl-12 pr-4 w-full bg-gray-900/70 border-gray-700 text-sm focus:border-emerald-500 rounded-lg py-2"
                    disabled
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button onClick={fetchDiscounts} className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors" title="Refresh">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select
                  value={discountStatus}
                  onChange={(e) => setDiscountStatus(e.target.value)}
                  className="input px-3 py-2 bg-gray-900/70 border-gray-700 text-sm rounded-lg"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <button 
                  onClick={fetchDiscounts}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg py-2 font-medium transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">Code</th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">Type</th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">Value</th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">Usage</th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">Expires</th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {isLoading ? (
                  <tr><td colSpan={6} className="p-4 text-center text-gray-500">Loading discounts...</td></tr>
                ) : discounts.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-center text-gray-500">No discounts found</td></tr>
                ) : (
                  discounts.map(d => (
                    <tr key={d._id} className="hover:bg-gray-800/30">
                      <td className="py-3 px-4 font-bold text-emerald-400">{d.code}</td>
                      <td className="py-3 px-4 text-gray-300 capitalize">{d.type.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-white">
                        {d.type === 'percentage' ? `${d.value}%` : d.type === 'fixed' ? `$${d.value}` : 'Free'}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {d.usedCount} / {d.usageLimit || '∞'}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {new Date(d.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          d.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                        }`}>
                          {d.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isDiscountModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
              <h2 className="text-lg font-bold text-white">Create Discount</h2>
              <button onClick={() => setIsDiscountModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateDiscount} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Code</label>
                <input 
                  type="text" 
                  value={newDiscount.code}
                  onChange={(e) => setNewDiscount({...newDiscount, code: e.target.value.toUpperCase()})}
                  className="input w-full"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                  <select 
                    value={newDiscount.type}
                    onChange={(e) => setNewDiscount({...newDiscount, type: e.target.value as any})}
                    className="input w-full"
                    required
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    {newDiscount.type === 'percentage' ? 'Percentage %' : newDiscount.type === 'fixed' ? 'Amount $' : 'Value (N/A)'}
                  </label>
                  <input 
                    type="number" 
                    value={newDiscount.value}
                    onChange={(e) => setNewDiscount({...newDiscount, value: parseFloat(e.target.value)})}
                    className="input w-full"
                    min="0"
                    disabled={newDiscount.type === 'free_shipping'}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Min Order $</label>
                  <input 
                    type="number" 
                    value={newDiscount.minOrder}
                    onChange={(e) => setNewDiscount({...newDiscount, minOrder: parseFloat(e.target.value)})}
                    className="input w-full"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Usage Limit</label>
                  <input 
                    type="number" 
                    value={newDiscount.usageLimit}
                    onChange={(e) => setNewDiscount({...newDiscount, usageLimit: parseInt(e.target.value)})}
                    className="input w-full"
                    min="1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Expires At</label>
                <input 
                  type="date" 
                  value={newDiscount.expiresAt}
                  onChange={(e) => setNewDiscount({...newDiscount, expiresAt: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setIsDiscountModalOpen(false)} className="flex-1 py-2 px-4 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'loyalty' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Loyalty Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Bronze', 'Silver', 'Gold', 'Platinum'].map(tier => (
              <div key={tier} className="card p-4 border border-gray-700 bg-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{tier} Members</p>
                  <p className="text-xl font-bold text-white mt-1">{tierStats[tier] || 0}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-4">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search loyalty members..."
                    className="input pl-12 pr-4 w-full bg-gray-900/70 border-gray-700 text-sm focus:border-emerald-500 rounded-lg py-2"
                    disabled
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button onClick={fetchLoyalty} className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors" title="Refresh">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select
                  value={memberTier}
                  onChange={(e) => setMemberTier(e.target.value)}
                  className="input px-3 py-2 bg-gray-900/70 border-gray-700 text-sm rounded-lg"
                >
                  <option value="all">All Tiers</option>
                  <option value="Bronze">Bronze</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                </select>
                <button 
                  onClick={fetchLoyalty}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg py-2 font-medium transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">Member</th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">Email</th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">Points</th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">Tier</th>
                  <th className="py-3 px-4 text-left text-gray-400 font-medium">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-500">Loading members...</td></tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-500">No members found</td></tr>
                ) : (
                  members.map(m => (
                    <tr key={m._id} className="hover:bg-gray-800/30">
                      <td className="py-3 px-4 text-white font-medium">{m.firstName} {m.lastName}</td>
                      <td className="py-3 px-4 text-gray-400">{m.email}</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">{m.loyaltyPoints}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getTierColor(m.loyaltyTier)}`}>
                          {(m.loyaltyTier || 'Bronze').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white">${m.totalSpent?.toFixed(2) || '0.00'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromotionsPage;
