import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faScrewdriverWrench } from '@fortawesome/free-solid-svg-icons';
import api from '../utils/api';

interface Cart {
  _id: string;
  sessionId: string;
  user?: { firstName: string; lastName: string; email: string };
  status: 'active' | 'abandoned' | 'converted';
  items: any[];
  totalQuantity?: number;
  subtotal?: number;
  total?: number;
  updatedAt: string;
  discountCode?: string;
  customDiscountAmount?: number;
  creatorCode?: string;
}

const AdminCartsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [carts, setCarts] = useState<Cart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCarts, setTotalCarts] = useState(0);

  const fetchCarts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/carts/admin/all', {
        params: { status: statusFilter !== 'all' ? statusFilter : undefined, page, limit: 20 }
      });
      setCarts(response.data.carts || []);
      setTotalPages(response.data.pages || 1);
      setTotalCarts(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch carts', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCarts();
  }, [page, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'converted': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'active': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'abandoned': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const calculateCartTotal = (cart: Cart) => {
    return cart.items.reduce((total, item) => {
      let itemPrice = 0;
      if (item.product?.price) itemPrice = item.product.price;
      else if (item.customBuild?.total) itemPrice = item.customBuild.total;
      return total + (itemPrice * (item.quantity || 1));
    }, 0);
  };

  const calculateCartItemsCount = (cart: Cart) => {
    return cart.items.reduce((total, item) => total + (item.quantity || 1), 0);
  };

  const [selectedCart, setSelectedCart] = useState<Cart | null>(null);
  const [editDiscountCode, setEditDiscountCode] = useState('');
  const [editCustomDiscount, setEditCustomDiscount] = useState<number>(0);
  const [editCreatorCode, setEditCreatorCode] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'abandoned' | 'converted'>('active');
  const [editItems, setEditItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (productSearch.length > 2) {
      const delay = setTimeout(() => {
        api.get(`/products/search?q=${productSearch}`)
          .then(res => setSearchResults(res.data.products || []))
          .catch(err => console.error(err));
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
    }
  }, [productSearch]);

  const handleAddItem = (product: any) => {
    setEditItems([...editItems, {
      product: product,
      quantity: 1
    }]);
    setProductSearch('');
    setSearchResults([]);
  };

  const handleEditClick = (cart: Cart) => {
    setSelectedCart(cart);
    setEditDiscountCode(cart.discountCode || '');
    setEditCustomDiscount(cart.customDiscountAmount || 0);
    setEditCreatorCode(cart.creatorCode || '');
    setEditStatus(cart.status);
    setEditItems([...cart.items]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...editItems];
    updated.splice(index, 1);
    setEditItems(updated);
  };

  const handleSaveCart = async () => {
    if (!selectedCart) return;
    try {
      // Map items back to just IDs for the API
      const mappedItems = editItems.map(item => ({
        product: item.product?._id || item.product,
        pcPart: item.pcPart?._id || item.pcPart,
        accessory: item.accessory?._id || item.accessory,
        customBuild: item.customBuild?._id || item.customBuild,
        quantity: item.quantity || 1
      }));

      await api.put(`/carts/admin/${selectedCart._id}`, {
        discountCode: editDiscountCode,
        customDiscountAmount: editCustomDiscount,
        creatorCode: editCreatorCode,
        status: editStatus,
        items: mappedItems
      });
      setSelectedCart(null);
      fetchCarts();
    } catch (error) {
      console.error('Failed to update cart', error);
      alert('Failed to update cart');
    }
  };

  if (selectedCart) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedCart(null)}
              className="text-gray-400 hover:text-white"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Edit Cart</h1>
              <p className="text-gray-400 mt-1">Session: {selectedCart.sessionId}</p>
            </div>
          </div>
          <button
            onClick={handleSaveCart}
            className="px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
          >
            Save Changes
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Cart Items</h2>
                <div className="text-gray-400 text-sm">
                  {editItems.reduce((acc, i) => acc + (i.quantity || 1), 0)} items
                </div>
              </div>
              
              <div className="mb-6 relative">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="input w-full bg-gray-900/50 border-gray-700"
                  placeholder="Search to add product..."
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                    {searchResults.map(prod => (
                      <button
                        key={prod._id}
                        onClick={() => handleAddItem(prod)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-700 text-sm text-gray-300 flex justify-between items-center border-b border-gray-700/50 last:border-0"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{prod.name}</span>
                          <span className="text-xs text-gray-400">{prod.brand} - {prod.category}</span>
                        </div>
                        <span className="text-emerald-400 font-bold">{formatCurrency(prod.price)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {editItems.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl">
                  <p className="text-gray-500">Cart is empty.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {editItems.map((item, idx) => {
                    const itemName = item.product?.name || item.customBuild?.name || 'Unknown Item';
                    const itemPrice = item.product?.price || item.customBuild?.total || 0;
                    return (
                      <div key={idx} className="flex items-center justify-between bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400">
                            {item.product ? <FontAwesomeIcon icon={faBox} /> : <FontAwesomeIcon icon={faScrewdriverWrench} />}
                          </div>
                          <div>
                            <div className="font-medium text-white">{itemName}</div>
                            <div className="text-sm text-gray-400">Quantity: {item.quantity}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className="font-bold text-white">{formatCurrency(itemPrice)}</span>
                          <button 
                            onClick={() => handleRemoveItem(idx)}
                            className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-bold text-white mb-6">Cart Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="input w-full bg-gray-900/50 border-gray-700"
                  >
                    <option value="active">Active</option>
                    <option value="abandoned">Abandoned</option>
                    <option value="converted">Converted</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Discount Code</label>
                  <input
                    type="text"
                    value={editDiscountCode}
                    onChange={(e) => setEditDiscountCode(e.target.value)}
                    className="input w-full bg-gray-900/50 border-gray-700"
                    placeholder="e.g. SUMMER10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Custom Discount ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editCustomDiscount}
                    onChange={(e) => setEditCustomDiscount(parseFloat(e.target.value) || 0)}
                    className="input w-full bg-gray-900/50 border-gray-700"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Creator Code</label>
                  <input
                    type="text"
                    value={editCreatorCode}
                    onChange={(e) => setEditCreatorCode(e.target.value)}
                    className="input w-full bg-gray-900/50 border-gray-700"
                    placeholder="e.g. STREAMERXYZ"
                  />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-bold text-white mb-4">Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white">
                    {formatCurrency(editItems.reduce((total, item) => {
                      const price = item.product?.price || item.customBuild?.total || 0;
                      return total + (price * (item.quantity || 1));
                    }, 0))}
                  </span>
                </div>
                {editCustomDiscount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Custom Discount</span>
                    <span className="text-emerald-400">-{formatCurrency(editCustomDiscount)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                <span className="text-gray-400">Calculated Total</span>
                <span className="text-2xl font-bold text-gradient-neon">
                  {formatCurrency(Math.max(0, editItems.reduce((total, item) => {
                    const price = item.product?.price || item.customBuild?.total || 0;
                    return total + (price * (item.quantity || 1));
                  }, 0) - editCustomDiscount))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Active & Abandoned Carts</h1>
          <p className="text-gray-400 mt-1">Monitor shopping cart activity</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Tracked Carts</p>
              <p className="text-2xl font-bold text-white mt-1">{totalCarts}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="input px-3 py-2 bg-gray-900/70 border-gray-700 text-sm rounded-lg"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="abandoned">Abandoned</option>
                <option value="converted">Converted</option>
              </select>
              <button 
                onClick={fetchCarts}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg py-2 font-medium transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Carts table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="py-3 px-4 text-left text-gray-400 font-medium text-sm">Session/User</th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium text-sm">Items</th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium text-sm">Value</th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium text-sm">Last Active</th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium text-sm">Status</th>
                <th className="py-3 px-4 text-right text-gray-400 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">Loading carts...</td></tr>
              ) : carts.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">No carts found</td></tr>
              ) : (
                carts.map(cart => (
                  <tr key={cart._id} className="hover:bg-gray-800/30">
                    <td className="py-3 px-4">
                      <p className="text-white font-medium">{cart.user ? `${cart.user.firstName} ${cart.user.lastName}` : 'Guest'}</p>
                      <p className="text-gray-500 text-xs font-mono truncate max-w-[150px]">{cart.sessionId}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{calculateCartItemsCount(cart)} items</td>
                    <td className="py-3 px-4 text-white font-bold">{formatCurrency(calculateCartTotal(cart))}</td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {new Date(cart.updatedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(cart.status)}`}>
                        {cart.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={() => handleEditClick(cart)}
                        className="px-3 py-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors mr-2"
                      >
                        Edit
                      </button>
                      {cart.status === 'abandoned' && cart.user && (
                        <button className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                          Send Reminder
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            Showing {carts.length > 0 ? (page - 1) * 20 + 1 : 0} to {Math.min(page * 20, totalCarts)} of {totalCarts}
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

export default AdminCartsPage;
