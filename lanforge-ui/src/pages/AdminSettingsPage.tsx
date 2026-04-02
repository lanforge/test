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
    buildFeePercentage: 10,
    socialLinks: { facebook: '', twitter: '', instagram: '', youtube: '' }
  });

  const [pageStatuses, setPageStatuses] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any>({ enabled: false });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const [businessRes, pageRes] = await Promise.all([
        api.get('/business'),
        api.get('/page-status')
      ]);

      if (businessRes.data.businessInfo) {
        const bizInfo = businessRes.data.businessInfo;
        setSettings(prev => ({
          ...prev,
          ...bizInfo,
          taxEnabled: bizInfo.taxEnabled === true
        }));
      }

      if (pageRes.data.pages) {
        const pages = pageRes.data.pages;
        const maint = pages.find((p: any) => p.path === 'maintenance_mode');
        if (maint) {
          setMaintenance(maint);
        }
        setPageStatuses(pages.filter((p: any) => p.path !== 'maintenance_mode'));
      }
    } catch (error) {
      console.error('Failed to fetch info', error);
      setMessage({ type: 'error', text: 'Failed to load information.' });
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
      const payload: Record<string, any> = {
        ...settings,
        taxEnabled: settings.taxEnabled === true
      };
      
      await api.put('/business', payload);
      
      // Save maintenance mode
      await api.put('/page-status/maintenance_mode', {
        enabled: maintenance.enabled,
        reopenAt: maintenance.reopenAt
      });

      // Save page statuses
      for (const p of pageStatuses) {
        await api.put(`/page-status/${encodeURIComponent(p.path)}`, {
          enabled: p.enabled
        });
      }

      await fetchSettings();
      
      setMessage({ type: 'success', text: 'Settings saved successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save settings', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
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

      {/* Maintenance Mode & Page Toggles */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Maintenance & Availability</span>
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-white">Maintenance Mode</h3>
                <p className="text-sm text-gray-400">When enabled, the site will be inaccessible to non-admin users.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={maintenance?.enabled || false}
                  onChange={(e) => {
                    setMaintenance((prev: any) => ({ ...prev, enabled: e.target.checked }));
                  }}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
              </label>
            </div>
            
            {maintenance?.enabled && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <label className="block text-sm font-medium text-gray-400 mb-2">Auto-Reopen Time (EST)</label>
                <input
                  type="datetime-local"
                  className="input bg-gray-900 border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl"
                  value={maintenance?.reopenAt ? (() => {
                    try {
                      const estString = new Date(maintenance.reopenAt).toLocaleString("sv-SE", { timeZone: "America/New_York" });
                      return estString.replace(' ', 'T').slice(0, 16);
                    } catch (e) {
                      return '';
                    }
                  })() : ''}
                  onChange={(e) => {
                    const estDateTimeLocalStr = e.target.value;
                    if (!estDateTimeLocalStr) {
                      setMaintenance((prev: any) => ({ ...prev, reopenAt: undefined }));
                      return;
                    }
                    
                    const d4 = new Date(estDateTimeLocalStr + "-04:00");
                    const d5 = new Date(estDateTimeLocalStr + "-05:00");
                    const fmt = (d: Date) => d.toLocaleString("sv-SE", { timeZone: "America/New_York" }).replace(' ', 'T').slice(0, 16);
                    
                    let finalIso = d5.toISOString();
                    if (fmt(d4) === estDateTimeLocalStr) {
                      finalIso = d4.toISOString();
                    } else if (fmt(d5) === estDateTimeLocalStr) {
                      finalIso = d5.toISOString();
                    }

                    setMaintenance((prev: any) => ({ ...prev, reopenAt: finalIso }));
                  }}
                />
                <p className="text-xs text-gray-500 mt-2">Enter the exact time in EST (Eastern Standard/Daylight Time). Leave blank to require manual reopening.</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium text-white mb-4">Page Toggles</h3>
            <p className="text-sm text-gray-400 mb-4">Toggle switches to disable specific pages. Disabled pages will show a maintenance or 404 message.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pageStatuses.map((page: any) => {
                return (
                  <div key={page.path} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                    <div>
                      <span className="text-sm font-medium text-white">{page.name}</span>
                      <span className="block text-xs text-gray-500">{page.path}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={page.enabled}
                        onChange={(e) => {
                          const isEnabled = e.target.checked;
                          setPageStatuses(prev => 
                            prev.map(p => p.path === page.path ? { ...p, enabled: isEnabled } : p)
                          );
                        }}
                      />
                      <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                );
              })}
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
              <label className="block text-sm font-medium text-gray-400 mb-2">System Integration & Validation (%)</label>
              <div className="relative">
                <input
                  type="number"
                  className="input w-full pr-8 bg-gray-900 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
                  value={settings.buildFeePercentage || 0}
                  onChange={e => handleChange('buildFeePercentage', parseFloat(e.target.value))}
                />
                <span className="absolute right-4 top-2.5 text-gray-500">%</span>
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
