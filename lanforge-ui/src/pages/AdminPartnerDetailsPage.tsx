import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface Partner {
  _id: string;
  name: string;
  email: string;
  creatorCode: string;
  commissionRate: number;
  isPartner: boolean;
  customerDiscountType?: 'percentage' | 'fixed' | 'free_shipping' | '';
  customerDiscountValue?: number;
  website?: string;
  logo?: string;
  description?: string;
  twitter?: string;
  twitch?: string;
  youtube?: string;
  instagram?: string;
  tiktok?: string;
  stats: {
    clicks: number;
    referrals: number;
    totalRevenue: number;
    commissionEarned: number;
    commissionPaid: number;
  };
  isActive: boolean;
  createdAt: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  guestEmail?: string;
}

const AdminPartnerDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState<Partial<Partner>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [partnerRes, ordersRes] = await Promise.all([
          api.get(`/partners/admin/${id}`),
          api.get(`/partners/${id}/orders`)
        ]);

        setPartner(partnerRes.data.partner);
        setFormData(partnerRes.data.partner);
        setOrders(ordersRes.data.orders || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load partner details');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      const res = await api.put(`/partners/${id}`, formData);
      setPartner(res.data.partner);
      setFormData(res.data.partner);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update partner');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this partner? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/partners/${id}`);
      navigate('/admin/partners');
    } catch (err) {
      console.error(err);
      setError('Failed to delete partner');
    }
  };

  if (isLoading) {
    return <div className="text-gray-400">Loading partner details...</div>;
  }

  if (!partner) {
    return <div className="text-red-400">Partner not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/admin/partners" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex items-center space-x-3">
            {partner.logo && (
              <img src={partner.logo} alt={partner.name} className="w-10 h-10 object-contain bg-white rounded p-1" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">{partner.name}</h1>
              <p className="text-gray-400 text-sm">Creator Code: <span className="text-emerald-400 font-mono">{partner.creatorCode}</span></p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors font-medium text-sm border border-red-500/20"
          >
            Delete
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 space-y-6">
            <h2 className="text-lg font-bold text-white mb-4">Partner Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  className="input w-full bg-gray-900/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="input w-full bg-gray-900/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Creator Code</label>
                <input
                  type="text"
                  name="creatorCode"
                  value={formData.creatorCode || ''}
                  onChange={handleChange}
                  className="input w-full bg-gray-900/50 uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  name="commissionRate"
                  value={formData.commissionRate || 0}
                  onChange={handleChange}
                  className="input w-full bg-gray-900/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Website URL</label>
                <input
                  type="url"
                  name="website"
                  value={formData.website || ''}
                  onChange={handleChange}
                  className="input w-full bg-gray-900/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Logo URL</label>
                <input
                  type="text"
                  name="logo"
                  value={formData.logo || ''}
                  onChange={handleChange}
                  className="input w-full bg-gray-900/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                <select
                  name="isPartner"
                  value={formData.isPartner ? 'true' : 'false'}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPartner: e.target.value === 'true' }))}
                  className="input w-full bg-gray-900/50"
                >
                  <option value="true">Brand Partner</option>
                  <option value="false">Affiliate</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Customer Discount Type</label>
                <select
                  name="customerDiscountType"
                  value={formData.customerDiscountType || ''}
                  onChange={handleChange}
                  className="input w-full bg-gray-900/50"
                >
                  <option value="">None</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                  <option value="free_shipping">Free Shipping</option>
                </select>
              </div>
              
              {formData.customerDiscountType && formData.customerDiscountType !== 'free_shipping' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Discount Value</label>
                  <input
                    type="number"
                    name="customerDiscountValue"
                    value={formData.customerDiscountValue || 0}
                    onChange={handleChange}
                    className="input w-full bg-gray-900/50"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                <label className="flex items-center space-x-3 mt-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive || false}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </div>
                  <span className="text-sm text-gray-300">
                    {formData.isActive ? 'Active (Visible)' : 'Inactive (Hidden)'}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                rows={3}
                className="input w-full bg-gray-900/50"
              />
            </div>
          </div>

          <div className="card p-6 space-y-6">
            <h2 className="text-lg font-bold text-white mb-4">Social Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Twitter</label>
                <input type="text" name="twitter" value={formData.twitter || ''} onChange={handleChange} className="input w-full bg-gray-900/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Twitch</label>
                <input type="text" name="twitch" value={formData.twitch || ''} onChange={handleChange} className="input w-full bg-gray-900/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">YouTube</label>
                <input type="text" name="youtube" value={formData.youtube || ''} onChange={handleChange} className="input w-full bg-gray-900/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Instagram</label>
                <input type="text" name="instagram" value={formData.instagram || ''} onChange={handleChange} className="input w-full bg-gray-900/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">TikTok</label>
                <input type="text" name="tiktok" value={formData.tiktok || ''} onChange={handleChange} className="input w-full bg-gray-900/50" />
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">Orders Using Code</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Order</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {orders.length === 0 ? (
                  <tr><td colSpan={5} className="py-4 px-6 text-center text-gray-500">No orders found with this creator code.</td></tr>
                ) : (
                  orders.map(order => (
                    <tr key={order._id} className="hover:bg-gray-800/30">
                      <td className="py-3 px-6">
                        <Link to={`/admin/orders/${order._id}`} className="text-emerald-400 hover:underline font-medium">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-6 text-gray-300">
                        {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : (order.guestEmail || 'Guest')}
                      </td>
                      <td className="py-3 px-6 text-gray-400 text-sm">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-6 text-white font-medium">
                        ${order.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-6">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-800 text-gray-300 border border-gray-700 uppercase tracking-wide">
                          {order.status.replace('-', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Stats */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-bold text-white mb-6">Performance Stats</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                <p className="text-sm text-gray-400 mb-1">Total Referrals</p>
                <p className="text-2xl font-bold text-white">{partner.stats?.referrals || orders.length}</p>
              </div>
              
              <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                <p className="text-sm text-gray-400 mb-1">Total Revenue Generated</p>
                <p className="text-2xl font-bold text-emerald-400">
                  ${(partner.stats?.totalRevenue || orders.reduce((sum, o) => sum + o.total, 0)).toFixed(2)}
                </p>
              </div>

              <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                <p className="text-sm text-gray-400 mb-1">Commission Earned</p>
                <p className="text-2xl font-bold text-blue-400">
                  ${(partner.stats?.commissionEarned || 0).toFixed(2)}
                </p>
              </div>

              <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                <p className="text-sm text-gray-400 mb-1">Commission Paid</p>
                <p className="text-xl font-bold text-white">
                  ${(partner.stats?.commissionPaid || 0).toFixed(2)}
                </p>
              </div>

              <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                <p className="text-sm text-gray-400 mb-1">Link Clicks</p>
                <p className="text-xl font-bold text-white">{partner.stats?.clicks || 0}</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-800">
              <p className="text-sm text-gray-500">
                Partner since {new Date(partner.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPartnerDetailsPage;