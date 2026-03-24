import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, any>>({
    storeName: '',
    email: '',
    phone: '',
    address: { street: '', city: '', state: '', zipCode: '', country: 'US' },
    taxRate: 8.0,
    taxEnabled: true,
    currency: 'USD',
    flatShippingRate: 29.99,
    freeShippingThreshold: 500,
    socialLinks: { facebook: '', twitter: '', instagram: '', youtube: '' },
    comingSoonMode: false,
    comingSoonDate: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/business');
      if (response.data.businessInfo) {
        // Ensure we properly map boolean properties
        const bizInfo = response.data.businessInfo;
        setSettings(prev => ({
          ...prev,
          ...bizInfo,
          // Explicitly map booleans to avoid undefined overriding default state
          taxEnabled: bizInfo.taxEnabled === true,
          comingSoonMode: bizInfo.comingSoonMode === true, // Force to true or false
          comingSoonDate: bizInfo.comingSoonDate || ''
        }));
      }
    } catch (error) {
      console.error('Failed to fetch business info', error);
      setMessage({ type: 'error', text: 'Failed to load business information.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: any) => {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      setSettings(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setSettings(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      // Ensure specific types and remove empty string objects that might throw errors
      const payload: Record<string, any> = {
        ...settings,
        comingSoonMode: settings.comingSoonMode === true,
        taxEnabled: settings.taxEnabled === true
      };
      
      // If date is empty string, make it null or undefined
      if (payload.comingSoonDate === '') {
        delete payload.comingSoonDate;
      }
      
      const response = await api.put('/business', payload);
      
      // Update local state with whatever the server returned to ensure it matches
      if (response.data && response.data.businessInfo) {
        setSettings(prev => ({
          ...prev,
          ...response.data.businessInfo,
          taxEnabled: response.data.businessInfo.taxEnabled === true,
          comingSoonMode: response.data.businessInfo.comingSoonMode === true,
          comingSoonDate: response.data.businessInfo.comingSoonDate || ''
        }));
      }
      
      setMessage({ type: 'success', text: 'Business info saved successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save business info', error);
      setMessage({ type: 'error', text: 'Failed to save business information. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-gray-400 p-8 text-center animate-pulse">Loading business information...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Global Settings</h1>
          <p className="text-gray-400 mt-1">Manage global business details and store modes</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium flex items-center space-x-2 disabled:opacity-50"
        >
          {isSaving ? (
            <span>Saving...</span>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Store Modes */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Store Modes</span>
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-white">Coming Soon Mode</label>
                <p className="text-xs text-gray-400">Enable this to lock down the site and only show a coming soon page with a build request form.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.comingSoonMode === true}
                  onChange={(e) => handleChange('comingSoonMode', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
            
            {settings.comingSoonMode && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Target Launch Date</label>
                <input
                  type="datetime-local"
                  value={settings.comingSoonDate ? new Date(settings.comingSoonDate).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleChange('comingSoonDate', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>General Information</span>
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Store Name</label>
              <input
                type="text"
                className="input w-full bg-gray-900 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
                value={settings.storeName || ''}
                onChange={e => handleChange('storeName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Support Email</label>
              <input
                type="email"
                className="input w-full bg-gray-900 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
                value={settings.email || ''}
                onChange={e => handleChange('email', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Contact Phone</label>
              <input
                type="tel"
                className="input w-full bg-gray-900 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
                value={settings.phone || ''}
                onChange={e => handleChange('phone', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Currency</label>
              <select
                className="input w-full bg-gray-900 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
                value={settings.currency || 'USD'}
                onChange={e => handleChange('currency', e.target.value)}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (£)</option>
              </select>
            </div>
            
            {/* Address fields */}
            <div className="md:col-span-2 pt-4 border-t border-gray-800">
              <h3 className="text-md font-medium text-white mb-4">Physical Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Street Address</label>
                  <input type="text" className="input w-full bg-gray-900 border-gray-700 rounded-lg" value={settings.address?.street || ''} onChange={e => handleChange('address.street', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">City</label>
                  <input type="text" className="input w-full bg-gray-900 border-gray-700 rounded-lg" value={settings.address?.city || ''} onChange={e => handleChange('address.city', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">State/Province</label>
                  <input type="text" className="input w-full bg-gray-900 border-gray-700 rounded-lg" value={settings.address?.state || ''} onChange={e => handleChange('address.state', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Zip/Postal Code</label>
                  <input type="text" className="input w-full bg-gray-900 border-gray-700 rounded-lg" value={settings.address?.zipCode || ''} onChange={e => handleChange('address.zipCode', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Country</label>
                  <input type="text" className="input w-full bg-gray-900 border-gray-700 rounded-lg" value={settings.address?.country || 'US'} onChange={e => handleChange('address.country', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tax & Shipping */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>Tax & Shipping</span>
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Flat Shipping Rate</label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  className="input w-full pl-8 bg-gray-900 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
                  value={settings.flatShippingRate || 0}
                  onChange={e => handleChange('flatShippingRate', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Free Shipping Threshold</label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  className="input w-full pl-8 bg-gray-900 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
                  value={settings.freeShippingThreshold || 0}
                  onChange={e => handleChange('freeShippingThreshold', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Base Tax Rate (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  className="input w-full pr-8 bg-gray-900 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
                  value={settings.taxRate || 0}
                  onChange={e => handleChange('taxRate', parseFloat(e.target.value))}
                />
                <span className="absolute right-4 top-2.5 text-gray-500">%</span>
              </div>
            </div>
            <div className="flex items-center mt-8">
              <label className="flex items-center space-x-3 cursor-pointer text-gray-300 hover:text-white transition-colors">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded bg-gray-900 border-gray-700 text-emerald-500 focus:ring-emerald-500/20" 
                  checked={settings.taxEnabled || false}
                  onChange={e => handleChange('taxEnabled', e.target.checked)}
                />
                <span>Enable automated tax calculation</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
