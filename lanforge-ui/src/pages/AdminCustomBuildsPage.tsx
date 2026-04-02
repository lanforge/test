import React, { useState, useEffect } from 'react';
import api from '../utils/api';

interface CustomBuild {
  _id: string;
  buildId: string;
  customer?: { firstName: string; lastName: string; email: string };
  status: 'draft' | 'saved' | 'ordered' | 'completed';
  total: number;
  totalCost?: number;
  parts: any[];
  updatedAt: string;
}

const AdminCustomBuildsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [builds, setBuilds] = useState<CustomBuild[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBuilds, setTotalBuilds] = useState(0);

  const fetchBuilds = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/custom-builds/admin/all', {
        params: { search: searchTerm, status: statusFilter !== 'all' ? statusFilter : undefined, page, limit: 20 }
      });
      setBuilds(response.data.builds || []);
      setTotalPages(response.data.pages || 1);
      setTotalBuilds(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch custom builds', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBuilds();
  }, [page, statusFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchBuilds();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'ordered': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'saved': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Custom Builds</h1>
          <p className="text-gray-400 mt-1">Manage user-configured custom PCs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Custom Builds</p>
              <p className="text-2xl font-bold text-white mt-1">{totalBuilds}</p>
            </div>
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            <div className="flex-1 flex items-center bg-gray-900/70 border border-gray-700 rounded-lg focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <svg className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search build ID or customer..."
                className="w-full pl-2 pr-4 py-2 bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button onClick={fetchBuilds} className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors" title="Refresh">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select 
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="input px-3 py-2 bg-gray-900/70 border-gray-700 text-sm rounded-lg"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="saved">Saved</option>
              <option value="ordered">Ordered</option>
              <option value="completed">Completed</option>
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

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Build ID</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Customer</th>
                <th className="text-right py-4 px-6 text-gray-400 font-medium text-sm">Price</th>
                <th className="text-right py-4 px-6 text-gray-400 font-medium text-sm">Margin</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Last Updated</th>
                <th className="text-center py-4 px-6 text-gray-400 font-medium text-sm">Status</th>
                <th className="text-right py-4 px-6 text-gray-400 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-400">Loading builds...</td></tr>
              ) : builds.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-400">No custom builds found.</td></tr>
              ) : builds.map(build => {
                const margin = build.total - (build.totalCost || 0);
                const marginPct = build.total > 0 ? (margin / build.total) * 100 : 0;

                return (
                  <tr key={build._id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <span className="text-emerald-400 font-mono text-sm">{build.buildId}</span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-white">{build.customer ? `${build.customer.firstName} ${build.customer.lastName}` : 'Guest'}</p>
                      {build.customer && <p className="text-gray-400 text-xs">{build.customer.email}</p>}
                    </td>
                    <td className="py-4 px-6 text-right text-white font-medium">
                      {formatCurrency(build.total)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <p className={`font-medium ${margin > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>{formatCurrency(margin)}</p>
                      <p className="text-xs text-gray-500">{marginPct.toFixed(1)}%</p>
                    </td>
                    <td className="py-4 px-6 text-gray-400 text-sm">
                      {new Date(build.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(build.status)}`}>
                        {build.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700">
                        View Details
                      </button>
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
            Showing {builds.length > 0 ? (page - 1) * 20 + 1 : 0} to {Math.min(page * 20, totalBuilds)} of {totalBuilds} builds
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

export default AdminCustomBuildsPage;
