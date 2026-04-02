import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface PCPart {
  _id: string;
  type: string;
  brand: string;
  partModel: string;
  sku: string;
  price: number;
  cost?: number;
  stock: number;
  isActive: boolean;
  productUrl?: string;
}

const AdminPartsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [parts, setParts] = useState<PCPart[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalParts, setTotalParts] = useState(0);

  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkCategory, setBulkCategory] = useState('cpu');
  const [bulkTags, setBulkTags] = useState('');
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, successes: 0, failures: 0 });

  const [editingPart, setEditingPart] = useState<PCPart | null>(null);
  const [editJson, setEditJson] = useState('');

  const fetchParts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/pc-parts/admin/all', {
        params: { search: searchTerm, type: typeFilter !== 'all' ? typeFilter : undefined, page, limit: 20 }
      });
      setParts(response.data.parts || []);
      setTotalPages(response.data.pages || 1);
      setTotalParts(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch PC parts', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, [page, typeFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchParts();
  };

  const handleSelectPart = (partId: string) => {
    setSelectedParts(prev =>
      prev.includes(partId)
        ? prev.filter(id => id !== partId)
        : [...prev, partId]
    );
  };

  const handleSelectAll = () => {
    if (selectedParts.length === parts.length) {
      setSelectedParts([]);
    } else {
      setSelectedParts(parts.map(part => part._id));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this part?')) return;
    try {
      await api.delete(`/pc-parts/${id}`);
      fetchParts();
    } catch (error) {
      console.error('Failed to delete part', error);
      alert('Failed to delete part');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedParts.length} parts?`)) return;
    try {
      await api.post('/pc-parts/bulk/delete', { ids: selectedParts });
      setSelectedParts([]);
      fetchParts();
    } catch (error) {
      console.error('Failed to delete parts', error);
      alert('Failed to delete parts');
    }
  };

  const handleBulkActivate = async () => {
    try {
      await api.post('/pc-parts/bulk/update', { ids: selectedParts, update: { isActive: true } });
      setSelectedParts([]);
      fetchParts();
    } catch (error) {
      console.error('Failed to activate parts', error);
      alert('Failed to activate parts');
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { text: 'Out of Stock', color: 'bg-red-500/10 text-red-400 border-red-500/30' };
    if (stock <= 5) return { text: 'Low Stock', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    return { text: 'In Stock', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
  };

  const handleBulkImport = async () => {
    const urls = bulkUrls.split('\n').map(u => u.trim()).filter(u => u);
    if (urls.length === 0) {
      alert('Please enter at least one valid URL');
      return;
    }

    setIsBulkImporting(true);
    setBulkProgress({ current: 0, total: urls.length, successes: 0, failures: 0 });

    let successes = 0;
    let failures = 0;

    for (let i = 0; i < urls.length; i++) {
      setBulkProgress(prev => ({ ...prev, current: i + 1 }));
      try {
        const scrapeRes = await api.post('/pc-parts/scrape-link', { url: urls[i] });
        const details = scrapeRes.data.details;
        
        if (details && details.name) {
          const payload = {
            type: bulkCategory,
            brand: details.brand || 'Unknown',
            model: details.model || details.name,
            sku: `PART-${Math.floor(100000 + Math.random() * 900000)}`,
            price: details.price || 0,
            cost: details.cost || 0,
            stock: 10, // Default stock for mass import
            specs: { _empty: true },
            tags: bulkTags.split(',').map(t => t.trim()).filter(t => t),
            isActive: true,
            productUrl: urls[i]
          };
          
          await api.post('/pc-parts', payload);
          successes++;
        } else {
          failures++;
        }
      } catch (err) {
        console.error(`Failed to import ${urls[i]}`, err);
        failures++;
      }
    }

    setBulkProgress(prev => ({ ...prev, successes, failures }));
    setIsBulkImporting(false);
    fetchParts();
    
    if (failures === 0) {
      setTimeout(() => setShowBulkImport(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">PC Parts Management</h1>
          <p className="text-gray-400 mt-1">Manage individual components and hardware parts</p>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={async () => {
              if (!window.confirm('Are you sure you want to trigger a rescrape for all parts with URLs? This will run in the background.')) return;
              try {
                const res = await api.post('/pc-parts/scrape-all');
                alert(res.data.message);
              } catch (e: any) {
                alert('Failed to start bulk scrape: ' + (e.response?.data?.message || e.message));
              }
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium"
          >
            Re-scrape All
          </button>
          <button 
            onClick={() => setShowBulkImport(!showBulkImport)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
          >
            Bulk Auto-Import
          </button>
          <button 
            onClick={() => navigate('/admin/parts/add')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium"
          >
            + Add Part
          </button>
        </div>
      </div>

      {/* Bulk Import Section */}
      {showBulkImport && (
        <div className="card p-6 bg-gray-900 border border-blue-500/30 shadow-lg shadow-blue-500/10">
          <h2 className="text-xl font-bold text-white mb-4">Bulk Auto-Import Parts</h2>
          <p className="text-gray-400 mb-4 text-sm">Paste product URLs from Amazon or Newegg (one per line). The system will scrape the name, brand, model, and price, then automatically create the parts in your inventory.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-400 mb-2">Product URLs (one per line)</label>
              <textarea 
                className="input w-full bg-gray-800 border-gray-700 h-32 rounded-xl" 
                placeholder="https://amazon.com/dp/...\nhttps://newegg.com/p/..."
                value={bulkUrls}
                onChange={(e) => setBulkUrls(e.target.value)}
                disabled={isBulkImporting}
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Assign Category</label>
              <select
                className="input w-full bg-gray-800 border-gray-700 rounded-xl mb-4"
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                disabled={isBulkImporting}
              >
                <option value="cpu">CPU</option>
                <option value="gpu">GPU</option>
                <option value="motherboard">Motherboard</option>
                <option value="ram">RAM</option>
                <option value="storage">Storage</option>
                <option value="psu">Power Supply</option>
                <option value="case">Case</option>
                <option value="cpu-cooler">Cooling</option>
                <option value="fan">Case Fan</option>
                <option value="os">Operating System</option>
              </select>

              <label className="block text-sm font-medium text-gray-400 mb-2">Assign Tags / Colors</label>
              <input
                type="text"
                className="input w-full bg-gray-800 border-gray-700 rounded-xl mb-2"
                placeholder={['motherboard', 'case', 'cpu-cooler', 'fan'].includes(bulkCategory) ? "e.g. White, RGB" : "e.g. Low-Profile"}
                value={bulkTags}
                onChange={(e) => setBulkTags(e.target.value)}
                disabled={isBulkImporting}
              />
              {['motherboard', 'case', 'cpu-cooler', 'fan'].includes(bulkCategory) && (
                <p className="text-xs text-emerald-400 mb-4">Hint: Use tags to set the color.</p>
              )}
              
              <button 
                onClick={handleBulkImport}
                disabled={isBulkImporting || !bulkUrls.trim()}
                className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 text-white rounded-xl transition-colors font-bold"
              >
                {isBulkImporting ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
          
          {isBulkImporting && (
            <div className="mt-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
              <div className="flex justify-between text-sm text-gray-300 mb-2">
                <span>Processing item {bulkProgress.current} of {bulkProgress.total}...</span>
                <span>{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-2.5">
                <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}></div>
              </div>
            </div>
          )}
          
          {!isBulkImporting && bulkProgress.total > 0 && (
            <div className={`mt-4 p-4 rounded-xl text-sm ${bulkProgress.failures > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
              Import complete! Successfully added {bulkProgress.successes} parts. {bulkProgress.failures > 0 && `${bulkProgress.failures} failed to import.`}
            </div>
          )}
        </div>
      )}

      {/* Search and filters */}
      <div className="card p-4">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            <div className="flex-1 flex items-center bg-gray-900/70 border border-gray-700 rounded-lg focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <svg className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search parts by name/sku..."
                className="w-full pl-2 pr-4 py-2 bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button onClick={fetchParts} className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors" title="Refresh">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input px-3 py-2 bg-gray-900/70 border-gray-700 text-sm rounded-lg"
            >
              <option value="all">All Types</option>
              <option value="CPU">CPU</option>
              <option value="GPU">GPU</option>
              <option value="Motherboard">Motherboard</option>
              <option value="RAM">RAM</option>
              <option value="Storage">Storage</option>
              <option value="Power Supply">Power Supply</option>
              <option value="Case">Case</option>
              <option value="Cooling">Cooling</option>
            </select>
            <button 
              onClick={handleSearch}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg py-2 font-medium transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Parts Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              className="w-4 h-4 rounded bg-gray-800 border-gray-700"
              checked={selectedParts.length === parts.length && parts.length > 0}
              onChange={handleSelectAll}
            />
            <span className="text-gray-400">
              {selectedParts.length > 0 ? `${selectedParts.length} selected` : `${parts.length} parts (this page)`}
            </span>
          </div>
          {selectedParts.length > 0 && (
            <div className="flex items-center space-x-2">
              <button onClick={handleBulkActivate} className="px-3 py-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                Activate
              </button>
              <button onClick={handleBulkDelete} className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Part Name</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Type & Brand</th>
                <th className="text-right py-4 px-6 text-gray-400 font-medium text-sm">Price</th>
                <th className="text-right py-4 px-6 text-gray-400 font-medium text-sm">Stock</th>
                <th className="text-center py-4 px-6 text-gray-400 font-medium text-sm">Status</th>
                <th className="text-right py-4 px-6 text-gray-400 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-400">Loading parts...</td></tr>
              ) : parts.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-400">No parts found.</td></tr>
              ) : parts.map(part => {
                const status = getStockStatus(part.stock);

                return (
                  <tr key={part._id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3 mb-1">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded bg-gray-800 border-gray-700"
                          checked={selectedParts.includes(part._id)}
                          onChange={() => handleSelectPart(part._id)}
                        />
                        <p className="text-white font-medium">{`${part.brand} ${part.partModel}`}</p>
                      </div>
                      <p className="text-gray-400 text-sm font-mono mt-1">{part.sku}</p>
                      {(part as any).productUrl && (
                        <div className="flex items-center gap-3 mt-2">
                          <a 
                            href={(part as any).productUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-emerald-400 text-xs hover:underline inline-flex items-center gap-1"
                          >
                            View Link
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </a>
                          <button
                            onClick={async () => {
                              try {
                                const res = await api.post(`/pc-parts/${part._id}/scrape`);
                                alert(`Scraped successfully: Cost $${res.data.part.cost}, Price $${res.data.part.price}`);
                                fetchParts();
                              } catch (e: any) {
                                alert(`Failed to scrape: ${e.response?.data?.message || e.message}`);
                              }
                            }}
                            className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-colors"
                          >
                            Scrape Pricing
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-white">{part.type}</p>
                      <p className="text-gray-400 text-sm">{part.brand}</p>
                    </td>
                    <td className="py-4 px-6 text-right text-white font-medium">
                      ${part.price?.toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right text-white font-medium">
                      {part.stock}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${part.isActive ? status.color : 'bg-gray-500/10 text-gray-400 border-gray-500/30'}`}>
                        {part.isActive ? status.text : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => navigate(`/admin/parts/edit/${part._id}`)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDelete(part._id)} 
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors" 
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            Showing {parts.length > 0 ? (page - 1) * 20 + 1 : 0} to {Math.min(page * 20, totalParts)} of {totalParts} parts
          </div>
          <div className="flex items-center space-x-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-gray-400 px-2">Page {page} of {totalPages || 1}</span>
            <button 
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPartsPage;