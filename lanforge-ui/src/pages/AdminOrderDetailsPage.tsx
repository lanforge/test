import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface OrderItem {
  _id?: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Address {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
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
  loyaltyPoints?: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  customer?: Customer;
  guestEmail?: string;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress: Address;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  appliedDiscount?: {
    code: string;
    type: string;
    value: number;
  };
  donationAmount: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentId?: string;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
  createdAt: string;
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

const AdminOrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [purchasedPCs, setPurchasedPCs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editing state
  const [items, setItems] = useState<OrderItem[]>([]);
  const [shippingAddress, setShippingAddress] = useState<Address | null>(null);
  const [billingAddress, setBillingAddress] = useState<Address | null>(null);
  const [shipping, setShipping] = useState<number>(0);
  const [donationAmount, setDonationAmount] = useState<number>(0);
  const [status, setStatus] = useState<string>('pending');

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  const fetchOrderDetails = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get(`/orders/${id}`);
      const data = response.data.order;
      setOrder(data);
      setItems(data.items || []);
      setShippingAddress(data.shippingAddress);
      setBillingAddress(data.billingAddress);
      setShipping(data.shipping || 0);
      setDonationAmount(data.donationAmount || 0);
      setStatus(data.status || 'pending');

      try {
        const paymentsResponse = await api.get(`/payments?order=${id}`);
        setPayments(paymentsResponse.data);
      } catch (paymentErr) {
        console.error('Failed to fetch payments:', paymentErr);
      }

      try {
        const pcsResponse = await api.get(`/purchased-pcs/order/${id}`);
        setPurchasedPCs(pcsResponse.data.pcs || []);
      } catch (pcErr) {
        console.error('Failed to fetch purchased PCs:', pcErr);
      }
    } catch (err: any) {
      console.error('Failed to fetch order details:', err);
      setError('Failed to load order details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      // 1. Update order details (items, addresses, amounts)
      const detailsResponse = await api.put(`/orders/${id}`, {
        items,
        shippingAddress,
        billingAddress,
        shipping,
        donationAmount
      });
      
      // 2. Update order status (handles loyalty points, inventory, etc. on backend)
      // Only call status update if it actually changed, or just call it to be safe
      const statusResponse = await api.put(`/orders/${id}/status`, {
        status
      });

      setOrder(statusResponse.data.order || detailsResponse.data.order);
      setItems(statusResponse.data.order?.items || detailsResponse.data.order?.items || items);
      setSuccess('Order updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to update order:', err);
      setError(err.response?.data?.message || 'Failed to update order.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        name: 'New Item',
        sku: 'NEW-SKU',
        price: 0,
        quantity: 1,
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  if (isLoading) {
    return <div className="p-6 text-white text-center">Loading order details...</div>;
  }

  if (error && !order) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-lg">
          {error}
        </div>
        <button onClick={() => navigate('/admin/orders')} className="mt-4 text-emerald-500 hover:text-emerald-400">
          &larr; Back to Orders
        </button>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/admin/orders')}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-4">
              Order {order.orderNumber}
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`text-sm px-3 py-1 font-medium bg-gray-800 border border-gray-700 rounded-lg outline-none ${
                  status === 'delivered' ? 'text-emerald-400' :
                  status === 'shipped' || status === 'out-for-delivery' ? 'text-indigo-400' :
                  status === 'building' ? 'text-blue-400' :
                  status === 'benchmarking' ? 'text-purple-400' :
                  status === 'cancelled' || status === 'returned' ? 'text-red-400' :
                  'text-amber-400'
                }`}
              >
                <option value="order-confirmed" className="text-amber-400 bg-gray-900">Order Confirmed</option>
                <option value="building" className="text-blue-400 bg-gray-900">Building</option>
                <option value="benchmarking" className="text-purple-400 bg-gray-900">Benchmarking</option>
                <option value="shipped" className="text-indigo-400 bg-gray-900">Shipped</option>
                <option value="out-for-delivery" className="text-indigo-400 bg-gray-900">Out for Delivery</option>
                <option value="delivered" className="text-emerald-400 bg-gray-900">Delivered</option>
                <option value="returned" className="text-red-400 bg-gray-900">Returned</option>
                <option value="cancelled" className="text-red-400 bg-gray-900">Cancelled</option>
              </select>
            </h1>
            <p className="text-gray-400 mt-1">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {success && <span className="text-emerald-500">{success}</span>}
          {error && <span className="text-red-500">{error}</span>}
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Items & Totals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">Order Items</h2>
              <button 
                onClick={handleAddItem}
                className="text-sm px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
              >
                + Add Item
              </button>
            </div>
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-4 p-4 border border-gray-800 rounded-lg bg-gray-900/50">
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Name</label>
                        <input 
                          type="text" 
                          value={item.name} 
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          className="input w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        />
                      </div>
                      <div className="w-1/3">
                        <label className="block text-xs text-gray-500 mb-1">SKU</label>
                        <input 
                          type="text" 
                          value={item.sku} 
                          onChange={(e) => handleItemChange(idx, 'sku', e.target.value)}
                          className="input w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-1/3">
                        <label className="block text-xs text-gray-500 mb-1">Price ($)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={item.price} 
                          onChange={(e) => handleItemChange(idx, 'price', parseFloat(e.target.value))}
                          className="input w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        />
                      </div>
                      <div className="w-1/3">
                        <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                        <input 
                          type="number" 
                          min="1"
                          value={item.quantity} 
                          onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value))}
                          className="input w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        />
                      </div>
                      <div className="w-1/3 flex items-end">
                        <div className="w-full text-right py-2 text-white font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <button 
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-center py-6 text-gray-500">No items in this order.</div>
              )}
            </div>
          </div>

          {/* Purchased PCs section */}
          {purchasedPCs.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-bold text-white mb-4">Purchased PCs</h2>
              <div className="space-y-4">
                {purchasedPCs.map((pc: any, idx: number) => (
                  <div key={idx} className="flex flex-col gap-2 p-4 border border-gray-800 rounded-lg bg-gray-900/50">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{pc.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        pc.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' :
                        pc.status === 'shipped' ? 'bg-blue-500/10 text-blue-400' :
                        pc.status === 'cancelled' || pc.status === 'returned' ? 'bg-red-500/10 text-red-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {pc.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Serial Number:</span>
                      <button 
                        onClick={() => navigate(`/admin/purchased-pcs/${pc._id}`)}
                        className="text-blue-400 hover:text-blue-300 underline font-mono"
                      >
                        {pc.serialNumber}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-white mb-4">Order Totals</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>Shipping</span>
                <div className="flex items-center">
                  <span className="mr-2">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={shipping}
                    onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                    className="input w-24 px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-right"
                  />
                </div>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Tax</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount {order.appliedDiscount ? `(${order.appliedDiscount.code})` : ''}</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-gray-400 border-t border-gray-800 pt-3">
                <span>Donation Amount</span>
                <div className="flex items-center">
                  <span className="mr-2">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(parseFloat(e.target.value) || 0)}
                    className="input w-24 px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-right"
                  />
                </div>
              </div>
              <div className="flex justify-between text-white font-bold text-lg pt-3 border-t border-gray-800 mt-3">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500 text-center">
              Click "Save Changes" to recalculate tax and totals.
            </div>
          </div>
        </div>

        {/* Right Column: Customer, Addresses, Payment */}
        <div className="space-y-6">
          {/* Customer Details */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-white mb-4">Customer Details</h2>
            {order.customer ? (
              <div className="space-y-2">
                <p className="text-white font-medium">{order.customer.firstName} {order.customer.lastName}</p>
                <p className="text-gray-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {order.customer.email}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Loyalty Points: <span className="text-emerald-400 font-medium">{order.customer.loyaltyPoints || 0}</span>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-400 italic">Guest Customer</p>
                <p className="text-gray-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {order.guestEmail || order.shippingAddress.email}
                </p>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-white mb-4">Payment Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Method:</span>
                <span className="text-white capitalize font-medium">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status:</span>
                <span className={`capitalize font-medium ${
                  order.paymentStatus === 'paid' ? 'text-emerald-400' :
                  order.paymentStatus === 'pending' ? 'text-amber-400' :
                  order.paymentStatus === 'failed' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {order.paymentStatus}
                </span>
              </div>
              {order.paymentId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Transaction ID:</span>
                  <span className="text-gray-300 text-xs font-mono">{order.paymentId}</span>
                </div>
              )}
            </div>
            
            {payments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <h3 className="text-sm font-bold text-white mb-3">Payment History</h3>
                <div className="space-y-3">
                  {payments.map(payment => (
                    <div key={payment._id} className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white font-medium text-sm">{formatCurrency(payment.amount)} {payment.currency.toUpperCase()}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          payment.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                          payment.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span className="capitalize">{payment.paymentMethod}</span>
                        <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500 font-mono break-all">
                          {payment.gatewayTransactionId}
                        </div>
                        <button
                          onClick={() => navigate(`/admin/payments/${payment._id}`)}
                          className="text-xs text-blue-400 hover:text-blue-300 hover:underline ml-2 whitespace-nowrap"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-white mb-4">Shipping Address</h2>
            {shippingAddress && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">First Name</label>
                    <input 
                      type="text" 
                      value={shippingAddress.firstName} 
                      onChange={(e) => setShippingAddress({...shippingAddress, firstName: e.target.value})}
                      className="input w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Last Name</label>
                    <input 
                      type="text" 
                      value={shippingAddress.lastName} 
                      onChange={(e) => setShippingAddress({...shippingAddress, lastName: e.target.value})}
                      className="input w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Street Address</label>
                  <input 
                    type="text" 
                    value={shippingAddress.address} 
                    onChange={(e) => setShippingAddress({...shippingAddress, address: e.target.value})}
                    className="input w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">City</label>
                    <input 
                      type="text" 
                      value={shippingAddress.city} 
                      onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                      className="input w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">State / Zip</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={shippingAddress.state} 
                        onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                        className="input w-1/2 px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                      />
                      <input 
                        type="text" 
                        value={shippingAddress.zip} 
                        onChange={(e) => setShippingAddress({...shippingAddress, zip: e.target.value})}
                        className="input w-1/2 px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Billing Address */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-white mb-4">Billing Address</h2>
            {billingAddress && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">First Name</label>
                    <input 
                      type="text" 
                      value={billingAddress.firstName} 
                      onChange={(e) => setBillingAddress({...billingAddress, firstName: e.target.value})}
                      className="input w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Last Name</label>
                    <input 
                      type="text" 
                      value={billingAddress.lastName} 
                      onChange={(e) => setBillingAddress({...billingAddress, lastName: e.target.value})}
                      className="input w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Street Address</label>
                  <input 
                    type="text" 
                    value={billingAddress.address} 
                    onChange={(e) => setBillingAddress({...billingAddress, address: e.target.value})}
                    className="input w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">City</label>
                    <input 
                      type="text" 
                      value={billingAddress.city} 
                      onChange={(e) => setBillingAddress({...billingAddress, city: e.target.value})}
                      className="input w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">State / Zip</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={billingAddress.state} 
                        onChange={(e) => setBillingAddress({...billingAddress, state: e.target.value})}
                        className="input w-1/2 px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                      />
                      <input 
                        type="text" 
                        value={billingAddress.zip} 
                        onChange={(e) => setBillingAddress({...billingAddress, zip: e.target.value})}
                        className="input w-1/2 px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetailsPage;
