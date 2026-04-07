import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface Address {
  type: string;
  firstName?: string;
  lastName?: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  addresses: Address[];
  loyaltyPoints: number;
  loyaltyTier: string;
  totalSpent: number;
  totalOrders: number;
  tags: string[];
  notes?: string;
  isActive: boolean;
  marketingOptIn: boolean;
  birthday?: string;
  createdAt: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  trackingNumber?: string;
}

interface Payment {
  _id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  gatewayTransactionId: string;
  status: string;
  createdAt: string;
}

const AdminCustomerDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchCustomerDetails();
    }
  }, [id]);

  const fetchCustomerDetails = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get(`/customers/${id}`);
      setCustomer(response.data.customer);
      setOrders(response.data.orders || []);
      setPayments(response.data.payments || []);
    } catch (err: any) {
      console.error('Failed to fetch customer details:', err);
      setError('Failed to load customer details.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  if (isLoading) {
    return <div className="p-6 text-white text-center">Loading customer details...</div>;
  }

  if (error && !customer) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-lg">
          {error}
        </div>
        <button onClick={() => navigate('/admin/customers')} className="mt-4 text-emerald-500 hover:text-emerald-400">
          &larr; Back to Customers
        </button>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-6 pb-20 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/admin/customers')}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              {customer.firstName} {customer.lastName}
              {!customer.isActive && (
                <span className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-full border border-red-500/20">
                  Inactive
                </span>
              )}
            </h1>
            <p className="text-gray-400 mt-1">
              Customer since {new Date(customer.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Addresses */}
        <div className="space-y-6 lg:col-span-1">
          {/* Customer Overview */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-white mb-4">Overview</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Email Address</p>
                <div className="flex items-center gap-2 text-white">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {customer.email}
                </div>
              </div>
              
              {customer.phone && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Phone Number</p>
                  <div className="flex items-center gap-2 text-white">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {customer.phone}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-800 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Spent</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(customer.totalSpent)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                  <p className="text-xl font-bold text-white">{customer.totalOrders}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <p className="text-sm text-gray-500 mb-1">Loyalty Tier & Points</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    customer.loyaltyTier === 'Platinum' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50' :
                    customer.loyaltyTier === 'Gold' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' :
                    customer.loyaltyTier === 'Silver' ? 'bg-gray-300/20 text-gray-300 border border-gray-400/50' :
                    'bg-amber-700/20 text-amber-600 border border-amber-700/50'
                  }`}>
                    {customer.loyaltyTier}
                  </span>
                  <span className="text-white font-medium">{customer.loyaltyPoints} pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-white mb-4">Saved Addresses</h2>
            <div className="space-y-4">
              {customer.addresses && customer.addresses.length > 0 ? (
                customer.addresses.map((address, idx) => (
                  <div key={idx} className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                        {address.type}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 space-y-1">
                      <p className="font-medium text-white">{address.firstName || customer.firstName} {address.lastName || customer.lastName}</p>
                      <p>{address.street}</p>
                      <p>{address.city}, {address.state} {address.zip}</p>
                      <p>{address.country}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic text-sm">No saved addresses</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Orders & Payments */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Orders History */}
          <div className="card overflow-hidden">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">Recent Orders</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900/50">
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Order</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Payment</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {orders.length > 0 ? (
                    orders.map(order => (
                      <tr key={order._id} className="hover:bg-gray-800/30 cursor-pointer transition-colors" onClick={() => navigate(`/admin/orders/${order._id}`)}>
                        <td className="py-4 px-6">
                          <span className="text-emerald-400 hover:underline font-medium">{order.orderNumber}</span>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-300">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-xs capitalize px-2 py-1 rounded-full bg-gray-800 text-gray-300">
                            {(order.status || 'unknown').replace(/-/g, ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm">
                          <span className={`capitalize ${order.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-white font-medium text-right">
                          {formatCurrency(order.total)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No orders found for this customer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History */}
          <div className="card overflow-hidden">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">Payment History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900/50">
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Transaction ID</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Method</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {payments.length > 0 ? (
                    payments.map(payment => (
                      <tr key={payment._id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-4 px-6 text-sm font-mono text-gray-400">
                          {payment.gatewayTransactionId}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-300">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6 text-sm capitalize text-gray-300">
                          {payment.paymentMethod}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`text-xs capitalize px-2 py-1 rounded-full ${
                            payment.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            payment.status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-white font-medium text-right">
                          {formatCurrency(payment.amount)} {payment.currency.toUpperCase()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No payments found for this customer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCustomerDetailsPage;