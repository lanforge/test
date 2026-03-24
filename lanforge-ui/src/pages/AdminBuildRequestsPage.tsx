import React, { useState, useEffect } from 'react';
import api from '../utils/api';

interface BuildRequest {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  budget?: string;
  details: string;
  status: 'pending' | 'reviewed' | 'contacted' | 'completed';
  createdAt: string;
}

const AdminBuildRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<BuildRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/build-requests');
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching build requests', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.put(`/build-requests/${id}`, { status: newStatus });
      fetchRequests();
    } catch (error) {
      console.error('Error updating status', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this request?')) {
      try {
        await api.delete(`/build-requests/${id}`);
        fetchRequests();
      } catch (error) {
        console.error('Error deleting request', error);
      }
    }
  };

  if (isLoading) {
    return <div className="text-gray-400 p-8 text-center animate-pulse">Loading build requests...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Build Requests</h1>
          <p className="text-gray-400 mt-1">Manage incoming custom build requests</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/50 border-b border-gray-800">
                <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name / Contact</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Budget</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-gray-500">
                    No build requests found.
                  </td>
                </tr>
              ) : (
                requests.map(request => (
                  <tr key={request._id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-4 px-6 text-sm text-gray-400 whitespace-nowrap">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-medium text-white">{request.name}</div>
                      <div className="text-xs text-gray-400">{request.email}</div>
                      {request.phone && <div className="text-xs text-gray-400">{request.phone}</div>}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-300 whitespace-nowrap">
                      {request.budget || 'Not specified'}
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-gray-300 max-w-xs truncate" title={request.details}>
                        {request.details}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={request.status}
                        onChange={(e) => handleStatusChange(request._id, e.target.value)}
                        className={`text-xs font-medium rounded-full py-1 px-3 border outline-none cursor-pointer ${
                          request.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                          request.status === 'reviewed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          request.status === 'contacted' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        <option value="pending" className="bg-gray-900 text-white">Pending</option>
                        <option value="reviewed" className="bg-gray-900 text-white">Reviewed</option>
                        <option value="contacted" className="bg-gray-900 text-white">Contacted</option>
                        <option value="completed" className="bg-gray-900 text-white">Completed</option>
                      </select>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDelete(request._id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Delete Request"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminBuildRequestsPage;
