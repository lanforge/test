import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import '../App.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

const libraries: ("places")[] = ["places"];

const CheckoutForm: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'shipping' | 'billing' | 'shippingMethod' | 'donation' | 'payment'>('shipping');
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [donationOption, setDonationOption] = useState<'none' | 'roundup' | 'fixed' | 'custom'>('none');
  const [customDonation, setCustomDonation] = useState('');
  const [shippingInsurance, setShippingInsurance] = useState(true);
  
  const [shippoRates, setShippoRates] = useState<any[]>([]);
  const [shippingMethod, setShippingMethod] = useState<string>('standard');
  const [shippingMethodCost, setShippingMethodCost] = useState<number>(49.99);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  
  const [discountCode, setDiscountCode] = useState('');
  const [customDiscountAmount, setCustomDiscountAmount] = useState(0);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries,
  });

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onLoadAutocomplete = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place && place.address_components) {
        let address1 = '';
        let locality = '';
        let administrative_area_level_1 = '';
        let postal_code = '';
        let country = 'US';

        for (const component of place.address_components) {
          const componentType = component.types[0];
          switch (componentType) {
            case 'street_number':
              address1 = `${component.long_name} ${address1}`;
              break;
            case 'route':
              address1 += component.short_name;
              break;
            case 'postal_code':
              postal_code = `${component.long_name}`;
              break;
            case 'locality':
              locality = component.long_name;
              break;
            case 'administrative_area_level_1':
              administrative_area_level_1 = component.short_name;
              break;
            case 'country':
              country = component.short_name;
              break;
          }
        }

        setShippingForm((prev) => ({
          ...prev,
          address: address1,
          city: locality,
          state: administrative_area_level_1,
          zip: postal_code,
          country: country,
        }));
      }
    }
  };

  const [shippingForm, setShippingForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zip: '',
    country: 'US'
  });

  const [billingForm, setBillingForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zip: '',
    country: 'US'
  });

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setShippingForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setBillingForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const [cartItems, setCartItems] = useState<any[]>([]);

  const fetchCart = () => {
    let sessionId = localStorage.getItem('cartSessionId');
    if (!sessionId) {
      sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('cartSessionId', sessionId);
    }
    
    fetch(`${process.env.REACT_APP_API_URL}/carts/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.cart && data.cart.items) {
          const mapped = data.cart.items.map((item: any) => {
            const product = item.product || item.pcPart || item.accessory;
            const customBuild = item.customBuild;
            if (customBuild) {
              return {
                id: item._id || customBuild._id || Math.random(),
                type: 'customBuild',
                itemId: customBuild._id,
                name: customBuild.name || 'Custom Build',
                price: item.price || customBuild.total || 0,
                quantity: item.quantity || 1
              };
            }
            return {
              id: item._id || product?._id || Math.random(),
              type: item.product ? 'product' : item.pcPart ? 'pcPart' : item.accessory ? 'accessory' : 'product',
              itemId: product?._id,
              name: product?.name || 'Item',
              price: item.price || product?.price || 0,
              quantity: item.quantity || 1
            };
          });
          setCartItems(mapped);
          setCustomDiscountAmount(data.cart.customDiscountAmount || 0);
        }
      })
      .catch(err => console.error(err));
  };

  React.useEffect(() => {
    fetchCart();
    const interval = setInterval(() => {
      fetchCart();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const calculateSubtotal = () => cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const calculateTax = () => calculateSubtotal() * 0.08;
  const calculateShipping = () => {
    if (shippoRates.length > 0) {
      const selectedRate = shippoRates.find(r => r.objectId === shippingMethod);
      if (selectedRate) {
        return parseFloat(selectedRate.amount);
      }
    }
    return shippingMethodCost;
  };
  const calculateInsurance = () => shippingInsurance ? 29.99 : 0;
  const calculateDonation = () => {
    switch (donationOption) {
      case 'roundup':
        const totalBeforeDonation = calculateSubtotal() + calculateTax() + calculateShipping() + calculateInsurance();
        return Math.ceil(totalBeforeDonation) - totalBeforeDonation;
      case 'fixed': return 5.00;
      case 'custom': return parseFloat(customDonation) || 0;
      default: return 0;
    }
  };
  const calculateTotal = () => Math.max(0, calculateSubtotal() + calculateTax() + calculateShipping() + calculateInsurance() + calculateDonation() - customDiscountAmount);

  const stripe = useStripe();
  const elements = useElements();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;
    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-status`,
      },
      redirect: 'if_required' // For mock purposes, don't actually redirect to Stripe
    });

    setIsProcessing(false);

    if (error) {
      setPaymentError(error.message || 'An error occurred during payment.');
      return;
    }

    // Success - clear cart and navigate to order status page
    const sessionId = localStorage.getItem('cartSessionId');
    let orderId = '';
    
    try {
      // Actually create the order in the database
      const finalBilling = useSameAddress ? shippingForm : billingForm;
      const orderPayload = {
        items: cartItems.map(i => ({ [i.type]: i.itemId, quantity: i.quantity })),
        shippingAddress: {
          firstName: shippingForm.firstName,
          lastName: shippingForm.lastName,
          email: shippingForm.email,
          phone: shippingForm.phone,
          address: shippingForm.address + (shippingForm.apartment ? ` ${shippingForm.apartment}` : ''),
          city: shippingForm.city,
          state: shippingForm.state,
          zip: shippingForm.zip,
          country: shippingForm.country
        },
        billingAddress: {
          firstName: finalBilling.firstName,
          lastName: finalBilling.lastName,
          email: finalBilling.email,
          phone: finalBilling.phone,
          address: finalBilling.address + (finalBilling.apartment ? ` ${finalBilling.apartment}` : ''),
          city: finalBilling.city,
          state: finalBilling.state,
          zip: finalBilling.zip,
          country: finalBilling.country
        },
        paymentMethod: 'stripe',
        discountCode: discountCode || undefined,
        shippingAmount: calculateShipping(),
      };

      const res = await fetch(`${process.env.REACT_APP_API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      
      const orderData = await res.json();
      if (orderData && orderData.order) {
        orderId = orderData.order._id;
      }
      
      if (sessionId) {
        await fetch(`${process.env.REACT_APP_API_URL}/carts/${sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [], clearDiscount: true })
        });
      }
    } catch (e) {
      console.error('Failed to create order', e);
    }
    
    window.location.href = `/order-status${orderId ? `?id=${orderId}` : ''}`;
  };

  const fetchShippoRates = async () => {
    setIsFetchingRates(true);
    try {
      const addressTo = {
        name: `${shippingForm.firstName} ${shippingForm.lastName}`,
        street1: shippingForm.address,
        street2: shippingForm.apartment,
        city: shippingForm.city,
        state: shippingForm.state,
        zip: shippingForm.zip,
        country: shippingForm.country,
        phone: shippingForm.phone,
        email: shippingForm.email,
      };

      const parcels = [
        {
          length: '10',
          width: '15',
          height: '10',
          distanceUnit: 'in',
          weight: '1',
          massUnit: 'lb',
        }
      ];

      const lineItems = cartItems.map(item => ({
        currency: 'USD',
        manufacture_country: 'US',
        quantity: item.quantity,
        sku: item.id.toString(),
        title: item.name,
        total_price: item.price.toString(),
        weight: '10', // Default weight since it's not stored in cart item currently
        weight_unit: 'lb'
      }));

      const res = await fetch(`${process.env.REACT_APP_API_URL}/shipping/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressTo, lineItems }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Format names to match requirements
        let formattedRates = (data.rates || []).map((r: any) => {
          let name = `${r.provider} ${r.servicelevel?.name || ''}`;
          if (name.includes('UPS Ground Saver') || name.includes('UPS Ground')) name = 'UPS Ground';
          else if (name.includes('UPS Next Day Air Saver') || name.includes('UPS Next Day')) name = 'UPS Next Day';
          else if (name.includes('UPS 2nd Day Air') || name.includes('UPS Two Day') || name.includes('UPS Second Day')) name = 'UPS Two Day';
          return { ...r, displayName: name };
        });

        // Filter to only include the 3 requested tiers
        const desiredRates = ['UPS Ground', 'UPS Two Day', 'UPS Next Day'];
        let filteredRates = formattedRates.filter((r: any) => desiredRates.includes(r.displayName));

        // Sort by price
        filteredRates.sort((a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount));

        setShippoRates(filteredRates);
        if (filteredRates.length > 0) {
          setShippingMethod(filteredRates[0].objectId);
        }
      }
    } catch (error) {
      console.error('Failed to fetch rates', error);
    } finally {
      setIsFetchingRates(false);
    }
  };

  const handleSectionComplete = async (section: string) => {
    if (section === 'shipping' || (section === 'billing' && useSameAddress) || (section === 'billing' && !useSameAddress)) {
      // Before moving to shippingMethod, fetch rates
      if (activeSection === 'shipping' || activeSection === 'billing') {
        const nextSection = section === 'shipping' ? (useSameAddress ? 'shippingMethod' : 'billing') : 'shippingMethod';
        if (nextSection === 'shippingMethod') {
          await fetchShippoRates();
        }
      }
    }

    setCompletedSections(prev => new Set(prev).add(section));
    const sections: ('shipping' | 'billing' | 'shippingMethod' | 'donation' | 'payment')[] = ['shipping', 'billing', 'shippingMethod', 'donation', 'payment'];
    const currentIndex = sections.indexOf(activeSection);
    
    // Custom logic to skip billing if useSameAddress is true and we're completing shipping
    if (section === 'shipping' && useSameAddress) {
      setActiveSection('shippingMethod');
    } else if (currentIndex < sections.length - 1) {
      setActiveSection(sections[currentIndex + 1]);
    }
  };

  const handleEditSection = (section: string) => {
    setActiveSection(section as any);
  };

  const isSectionCompleted = (section: string) => completedSections.has(section);
  const isSectionActive = (section: string) => activeSection === section;

  return (
    <div className="checkout-page">
      <div className="container">
        <motion.div className="checkout-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <h1>Checkout</h1>
          <p className="checkout-subtitle">Complete your purchase securely</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="checkout-form">
          <div className="checkout-layout">
            <div className="checkout-forms">
              <div className="checkout-progress">
                {['shipping', 'billing', 'shippingMethod', 'donation', 'payment'].map((section, index) => (
                  <div key={section} className="progress-step">
                    <div className={`step-indicator ${isSectionCompleted(section) ? 'completed' : ''} ${isSectionActive(section) ? 'active' : ''}`}>
                      {isSectionCompleted(section) ? '✓' : index + 1}
                    </div>
                    <div className="step-info">
                      <span className="step-title">
                        {section === 'shipping' && 'Shipping Address'}
                        {section === 'billing' && 'Billing Address'}
                        {section === 'shippingMethod' && 'Shipping Method'}
                        {section === 'donation' && 'Donation'}
                        {section === 'payment' && 'Payment'}
                      </span>
                      {isSectionCompleted(section) && !isSectionActive(section) && (
                        <button type="button" className="step-edit" onClick={() => handleEditSection(section)}>Edit</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {isSectionActive('shipping') && (
                <motion.div className="checkout-section" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                  <div className="section-header">
                    <h2>Shipping Address</h2>
                    <button type="button" className="btn btn-outline btn-small" onClick={() => handleSectionComplete('shipping')}>Continue</button>
                  </div>
                  <div className="form-grid">
                    <div className="form-group"><label>First Name *</label><input type="text" name="firstName" value={shippingForm.firstName} onChange={handleShippingChange} required /></div>
                    <div className="form-group"><label>Last Name *</label><input type="text" name="lastName" value={shippingForm.lastName} onChange={handleShippingChange} required /></div>
                    <div className="form-group"><label>Email *</label><input type="email" name="email" value={shippingForm.email} onChange={handleShippingChange} required /></div>
                    <div className="form-group"><label>Phone *</label><input type="tel" name="phone" value={shippingForm.phone} onChange={handleShippingChange} required /></div>
                    <div className="form-group col-span-2">
                      <label>Address *</label>
                      {isLoaded ? (
                        <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged}>
                          <input type="text" name="address" value={shippingForm.address} onChange={handleShippingChange} required placeholder="Start typing your address..." style={{ width: '100%' }} />
                        </Autocomplete>
                      ) : (
                        <input type="text" name="address" value={shippingForm.address} onChange={handleShippingChange} required style={{ width: '100%' }} />
                      )}
                    </div>
                    <div className="form-group"><label>Apartment, suite, etc.</label><input type="text" name="apartment" value={shippingForm.apartment} onChange={handleShippingChange} /></div>
                    <div className="form-group"><label>City *</label><input type="text" name="city" value={shippingForm.city} onChange={handleShippingChange} required /></div>
                    <div className="form-group"><label>State *</label><input type="text" name="state" value={shippingForm.state} onChange={handleShippingChange} required /></div>
                    <div className="form-group"><label>ZIP Code *</label><input type="text" name="zip" value={shippingForm.zip} onChange={handleShippingChange} required /></div>
                    <div className="form-group"><label>Country *</label><select name="country" value={shippingForm.country} onChange={handleShippingChange} required><option value="US">United States</option><option value="CA">Canada</option></select></div>
                  </div>
                </motion.div>
              )}

              {isSectionActive('billing') && (
                <motion.div className="checkout-section" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                  <div className="section-header">
                    <h2>Billing Address</h2>
                    <button type="button" className="btn btn-outline btn-small" onClick={() => handleSectionComplete('billing')}>Continue</button>
                  </div>
                  <div className="checkbox-label mb-4">
                    <input type="checkbox" checked={useSameAddress} onChange={(e) => setUseSameAddress(e.target.checked)} />
                    Same as shipping address
                  </div>
                  {!useSameAddress && (
                    <div className="form-grid">
                      <div className="form-group"><label>First Name *</label><input type="text" name="firstName" value={billingForm.firstName} onChange={handleBillingChange} required /></div>
                      <div className="form-group"><label>Last Name *</label><input type="text" name="lastName" value={billingForm.lastName} onChange={handleBillingChange} required /></div>
                      <div className="form-group"><label>Email *</label><input type="email" name="email" value={billingForm.email} onChange={handleBillingChange} required /></div>
                      <div className="form-group"><label>Phone *</label><input type="tel" name="phone" value={billingForm.phone} onChange={handleBillingChange} required /></div>
                      <div className="form-group col-span-2"><label>Address *</label><input type="text" name="address" value={billingForm.address} onChange={handleBillingChange} required style={{ width: '100%' }} /></div>
                      <div className="form-group"><label>Apartment, suite, etc.</label><input type="text" name="apartment" value={billingForm.apartment} onChange={handleBillingChange} /></div>
                      <div className="form-group"><label>City *</label><input type="text" name="city" value={billingForm.city} onChange={handleBillingChange} required /></div>
                      <div className="form-group"><label>State *</label><input type="text" name="state" value={billingForm.state} onChange={handleBillingChange} required /></div>
                      <div className="form-group"><label>ZIP Code *</label><input type="text" name="zip" value={billingForm.zip} onChange={handleBillingChange} required /></div>
                      <div className="form-group"><label>Country *</label><select name="country" value={billingForm.country} onChange={handleBillingChange} required><option value="US">United States</option><option value="CA">Canada</option></select></div>
                    </div>
                  )}
                </motion.div>
              )}

              {isSectionActive('shippingMethod') && (
                <motion.div className="checkout-section" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                  <div className="section-header">
                    <h2>Shipping Method</h2>
                    <button type="button" className="btn btn-outline btn-small" onClick={() => handleSectionComplete('shippingMethod')}>Continue</button>
                  </div>
                  {isFetchingRates ? (
                    <div className="py-8 flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-400">Calculating real-time shipping rates...</p>
                    </div>
                  ) : (
                    <div className="shipping-options">
                      {shippoRates.length > 0 ? (
                        shippoRates.map((rate) => (
                          <label key={rate.objectId} className={`shipping-option ${shippingMethod === rate.objectId ? 'selected' : ''}`}>
                            <input 
                              type="radio" 
                              name="shippingMethod" 
                              value={rate.objectId} 
                              checked={shippingMethod === rate.objectId} 
                              onChange={(e) => setShippingMethod(e.target.value)} 
                            />
                            <div className="option-content">
                              <div className="option-header">
                                <span className="option-title">{rate.displayName || `${rate.provider} ${rate.servicelevel?.name}`}</span>
                                <span className="option-price">${parseFloat(rate.amount).toFixed(2)}</span>
                              </div>
                              <p className="option-description">Estimated delivery: {rate.estimatedDays || '3-5'} days</p>
                            </div>
                          </label>
                        ))
                      ) : (
                        <>
                          <label className={`shipping-option ${shippingMethod === 'standard' ? 'selected' : ''}`}>
                            <input type="radio" name="shippingMethod" value="standard" checked={shippingMethod === 'standard'} onChange={(e) => { setShippingMethod(e.target.value); setShippingMethodCost(49.99); }} />
                            <div className="option-content">
                              <div className="option-header"><span className="option-title">Standard Shipping</span><span className="option-price">$49.99</span></div>
                              <p className="option-description">5-7 business days</p>
                            </div>
                          </label>
                          <label className={`shipping-option ${shippingMethod === 'express' ? 'selected' : ''}`}>
                            <input type="radio" name="shippingMethod" value="express" checked={shippingMethod === 'express'} onChange={(e) => { setShippingMethod(e.target.value); setShippingMethodCost(79.99); }} />
                            <div className="option-content">
                              <div className="option-header"><span className="option-title">Express Shipping</span><span className="option-price">$79.99</span></div>
                              <p className="option-description">2-3 business days</p>
                            </div>
                          </label>
                          <label className={`shipping-option ${shippingMethod === 'overnight' ? 'selected' : ''}`}>
                            <input type="radio" name="shippingMethod" value="overnight" checked={shippingMethod === 'overnight'} onChange={(e) => { setShippingMethod(e.target.value); setShippingMethodCost(129.99); }} />
                            <div className="option-content">
                              <div className="option-header"><span className="option-title">Overnight Shipping</span><span className="option-price">$129.99</span></div>
                              <p className="option-description">Next business day</p>
                            </div>
                          </label>
                        </>
                      )}
                    </div>
                  )}
                  <label className="checkbox-label insurance-checkbox">
                    <input type="checkbox" checked={shippingInsurance} onChange={(e) => setShippingInsurance(e.target.checked)} />
                    <div><span className="checkbox-title">Add Shipping Insurance</span><span className="checkbox-price">+ $29.99</span><p className="checkbox-description">Protect your order during shipping</p></div>
                  </label>
                </motion.div>
              )}

              {isSectionActive('donation') && (
                <motion.div className="checkout-section" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                  <div className="section-header">
                    <h2>Optional: Support Gaming Education</h2>
                    <button type="button" className="btn btn-outline btn-small" onClick={() => handleSectionComplete('donation')}>Skip</button>
                  </div>
                  <div className="donation-content">
                    <div className="donation-image">
                      <img src="https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" alt="Gaming Education Initiative" />
                      <div className="image-caption">Supporting the next generation of gamers</div>
                    </div>
                    <p className="donation-description">LANForge contributes to gaming education initiatives with every purchase. Your donation helps provide gaming equipment and educational resources to underserved communities.</p>
                    <div className="donation-options">
                      <label className={`donation-option ${donationOption === 'none' ? 'selected' : ''}`}>
                        <input type="radio" name="donationOption" value="none" checked={donationOption === 'none'} onChange={(e) => setDonationOption(e.target.value as any)} />
                        <span className="option-title">No additional donation</span>
                      </label>
                      <label className={`donation-option ${donationOption === 'roundup' ? 'selected' : ''}`}>
                        <input type="radio" name="donationOption" value="roundup" checked={donationOption === 'roundup'} onChange={(e) => setDonationOption(e.target.value as any)} />
                        <span className="option-title">Round up to nearest dollar</span>
                      </label>
                      <label className={`donation-option ${donationOption === 'fixed' ? 'selected' : ''}`}>
                        <input type="radio" name="donationOption" value="fixed" checked={donationOption === 'fixed'} onChange={(e) => setDonationOption(e.target.value as any)} />
                        <span className="option-title">Add $5 donation</span>
                      </label>
                      <label className={`donation-option ${donationOption === 'custom' ? 'selected' : ''}`}>
                        <input type="radio" name="donationOption" value="custom" checked={donationOption === 'custom'} onChange={(e) => setDonationOption(e.target.value as any)} />
                        <span className="option-title">Custom amount</span>
                        <div className="custom-donation-input"><span>$</span><input type="number" min="0" step="0.01" value={customDonation} onChange={(e) => setCustomDonation(e.target.value)} placeholder="10.00" disabled={donationOption !== 'custom'} /></div>
                      </label>
                    </div>
                    {donationOption !== 'none' && (
                      <div className="donation-action">
                        <button type="button" className="btn btn-outline btn-small" onClick={() => handleSectionComplete('donation')}>Continue with ${calculateDonation().toFixed(2)} donation</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {isSectionActive('payment') && (
                <motion.div className="checkout-section" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                  <div className="section-header">
                    <h2>Payment Information</h2>
                  </div>
                  <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <label className="block text-sm font-medium text-gray-300 mb-4">Payment Details</label>
                    <PaymentElement />
                    {paymentError && <div className="text-red-500 text-sm mt-4">{paymentError}</div>}
                  </div>
                  <div className="payment-security"><span className="security-icon">🔒</span><span>Your payment information is encrypted and secure by Stripe</span></div>
                </motion.div>
              )}
            </div>

            <motion.div className="checkout-summary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
              <h2>Order Summary</h2>
              <div className="order-items">
                <h3>Items ({cartItems.length})</h3>
                {cartItems.map((item) => (
                  <div key={item.id} className="order-item">
                    <div className="item-info"><span className="item-name">{item.name}</span><span className="item-quantity">Qty: {item.quantity}</span></div>
                    <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="discount-section">
                <h3>Discount Code</h3>
                <div className="discount-input"><input type="text" placeholder="Enter discount code" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} /><button type="button" className="btn btn-outline">Apply</button></div>
              </div>
              <div className="order-totals">
                <div className="total-row"><span>Subtotal</span><span>${calculateSubtotal().toFixed(2)}</span></div>
                <div className="total-row"><span>Shipping</span><span>${calculateShipping().toFixed(2)}</span></div>
                <div className="total-row"><span>Shipping Insurance</span><span>${calculateInsurance().toFixed(2)}</span></div>
              <div className="total-row"><span>Tax (8%)</span><span>${calculateTax().toFixed(2)}</span></div>
              <div className="total-row donation-row"><span>LANForge Donation</span><span>${calculateDonation().toFixed(2)}</span></div>
              {customDiscountAmount > 0 && (
                <div className="total-row text-emerald-400"><span>Custom Discount</span><span>-${customDiscountAmount.toFixed(2)}</span></div>
              )}
              <div className="total-row grand-total"><span>Total</span><span>${calculateTotal().toFixed(2)}</span></div>
              </div>
              <button type="submit" className="btn btn-primary btn-large" disabled={!stripe || isProcessing}>
                {isProcessing ? 'Processing...' : `Place Order • $${calculateTotal().toFixed(2)}`}
              </button>
              <div className="security-info">
                <div className="security-item"><span className="security-icon">🔒</span><span>256-bit SSL encryption</span></div>
                <div className="security-item"><span className="security-icon">🛡️</span><span>PCI DSS compliant</span></div>
                <div className="security-item"><span className="security-icon">↩️</span><span>30-day return policy</span></div>
              </div>
              <Link to="/cart" className="btn btn-text">← Back to Cart</Link>
            </motion.div>
          </div>
        </form>
      </div>
    </div>
  );
};

const CheckoutPageWrapper: React.FC = () => {
  const [clientSecret, setClientSecret] = useState('');

  // We need to initialize a dummy intent to get a client secret to render the PaymentElement.
  // In a full production app, this intent is updated whenever the cart total changes.
  React.useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/payments/stripe/create-checkout-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1000 }) // Dummy amount to initialize UI
    })
      .then(res => res.json())
      .then(data => {
        setClientSecret(data.clientSecret);
      })
      .catch(err => console.error(err));
  }, []);

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gradient-neon text-2xl font-bold mb-4">Loading Secure Checkout...</div>
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
      <CheckoutForm />
    </Elements>
  );
};

export default CheckoutPageWrapper;
