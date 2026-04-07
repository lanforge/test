import React, { useState, useEffect } from 'react';
import api from '../utils/api';

interface OrderItem {
  name: string;
  sku: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

const AdminOrdersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/orders/admin/all', {
        params: {
          search: searchTerm,
          status: statusFilter,
          page
        }
      });
      setOrders(response.data.orders || []);
      setTotalPages(response.data.pages || 1);
      setTotalOrders(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch orders', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'order-confirmed': return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
      case 'building': return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
      case 'benchmarking': return 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
      case 'shipped': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30';
      case 'out-for-delivery': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30';
      case 'delivered': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
      case 'returned': return 'bg-red-500/10 text-red-400 border border-red-500/30';
      case 'cancelled': return 'bg-red-500/10 text-red-400 border border-red-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/30';
    }
  };

  const getPaymentColor = (payment: string) => {
    switch (payment) {
      case 'paid': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
      case 'pending': return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
      case 'failed': return 'bg-red-500/10 text-red-400 border border-red-500/30';
      case 'refunded': return 'bg-gray-500/10 text-gray-400 border border-gray-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/30';
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders Management</h1>
          <p className="text-gray-400 mt-1">View and manage customer orders</p>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => window.location.href = '/admin/orders/add'}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
          >
            + Create Order
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Orders</p>
              <p className="text-2xl font-bold text-white mt-1">{totalOrders}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

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
                placeholder="Search orders..."
                className="w-full pl-2 pr-4 py-2 bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button onClick={fetchOrders} className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors" title="Refresh">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select 
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="input px-3 py-2 bg-gray-900/70 border-gray-700 text-sm rounded-lg"
            >
              <option value="all">All Statuses</option>
              <option value="order-confirmed">Order Confirmed</option>
              <option value="building">Building</option>
              <option value="benchmarking">Benchmarking</option>
              <option value="shipped">Shipped</option>
              <option value="out-for-delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="returned">Returned</option>
              <option value="cancelled">Cancelled</option>
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

      {/* Orders table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Order Number</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Customer</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Payment</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Total</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-400">Loading orders...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-400">No orders found.</td></tr>
              ) : orders.map((order) => (
                <tr key={order._id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-medium text-white">{order.orderNumber || order._id.slice(-8).toUpperCase()}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-white font-medium">{order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest'}</p>
                      <p className="text-gray-400 text-sm">{order.customer?.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {(order.status || 'unknown').replace(/-/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentColor(order.paymentStatus)}`}>
                      {(order.paymentStatus || 'unknown').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white font-medium">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="py-3 px-4">
                    <button 
                      onClick={() => window.location.href = `/admin/orders/${order._id}`}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" 
                      title="View Details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            Showing {orders.length > 0 ? (page - 1) * 20 + 1 : 0} to {Math.min(page * 20, totalOrders)} of {totalOrders} orders
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

export default AdminOrdersPage;
