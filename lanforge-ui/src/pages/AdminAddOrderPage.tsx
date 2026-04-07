import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AdminAddOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    quantity: 1,
    status: 'order-confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'stripe',
    shipping: 29.99,
    shippingInsurance: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          api.get('/customers'),
          api.get('/products/admin/all')
        ]);
        setCustomers(custRes.data.customers || []);
        setProducts(prodRes.data.products || []);
      } catch (err) {
        console.error('Failed to load form dependencies', err);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!formData.customerId || !formData.productId) {
      setError('Please select a customer and a product.');
      setIsSubmitting(false);
      return;
    }

    const selectedProduct = products.find(p => p._id === formData.productId);
    if (!selectedProduct) return;

    try {
      const payload = {
        customer: formData.customerId,
        items: [{
          product: selectedProduct._id,
          name: selectedProduct.name,
          sku: selectedProduct.sku,
          price: selectedProduct.price,
          quantity: Number(formData.quantity)
        }],
        status: formData.status,
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod,
        subtotal: selectedProduct.price * Number(formData.quantity),
        shipping: Number(formData.shipping),
        shippingInsurance: Number(formData.shippingInsurance),
        tax: 0, // Simplified for manual entry
        total: (selectedProduct.price * Number(formData.quantity)) + Number(formData.shipping) + Number(formData.shippingInsurance),
      };

      await api.post('/orders', payload); // Assuming /orders supports standard admin creation
      navigate('/admin/orders');
    } catch (err: any) {
      console.error('Failed to create order', err);
      setError(err.response?.data?.message || 'Failed to create order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={() => navigate('/admin/orders')}
            className="text-gray-400 hover:text-white flex items-center space-x-2 text-sm mb-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Orders</span>
          </button>
          <h1 className="text-2xl font-bold text-white">Create Manual Order</h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-400 mb-2">Select Customer *</label>
            <select
              name="customerId"
              required
              className="input w-full bg-gray-900 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
              value={formData.customerId}
              onChange={handleChange}
            >
              <option value="">-- Choose a customer --</option>
              {customers.map(c => (
                <option key={c._id} value={c._id}>{c.firstName} {c.lastName} ({c.email})</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 border-t border-gray-800 pt-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">Select Product *</label>
            <select
              name="productId"
              required
              className="input w-full bg-gray-900 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
              value={formData.productId}
              onChange={handleChange}
            >
              <option value="">-- Choose a product --</option>
              {products.map(p => (
                <option key={p._id} value={p._id}>{p.name} - ${p.price}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Quantity</label>
            <input
              type="number"
              name="quantity"
              min="1"
              required
              className="input w-full bg-gray-900 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
              value={formData.quantity}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Shipping Cost ($)</label>
            <input
              type="number"
              name="shipping"
              min="0"
              step="0.01"
              required
              className="input w-full bg-gray-900 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
              value={formData.shipping}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Shipping Insurance ($)</label>
            <input
              type="number"
              name="shippingInsurance"
              min="0"
              step="0.01"
              required
              className="input w-full bg-gray-900 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
              value={formData.shippingInsurance}
              onChange={handleChange}
            />
          </div>

          <div className="border-t border-gray-800 pt-4 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Order Status</label>
              <select
                name="status"
                className="input w-full bg-gray-900 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="order-confirmed">Order Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Payment Status</label>
              <select
                name="paymentStatus"
                className="input w-full bg-gray-900 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
                value={formData.paymentStatus}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Payment Method</label>
              <select
                name="paymentMethod"
                className="input w-full bg-gray-900 border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl"
                value={formData.paymentMethod}
                onChange={handleChange}
              >
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="affirm">Affirm</option>
                <option value="wire_transfer">Wire Transfer</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-800">
          <button
            type="button"
            onClick={() => navigate('/admin/orders')}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors font-medium flex items-center space-x-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminAddOrderPage;
