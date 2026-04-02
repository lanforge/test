import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { useLocation } from 'react-router-dom';
import '../App.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

const InvoiceCheckoutForm: React.FC<{ clientSecret: string, amount: number }> = ({ clientSecret, amount }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error: paymentError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Return URL where the user should be redirected after the payment
        return_url: `${window.location.origin}/invoice?success=true`,
      },
    });

    if (paymentError) {
      setError(paymentError.message || 'An unexpected error occurred.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
        <label className="block text-sm font-medium text-gray-300 mb-4">Payment Details</label>
        <PaymentElement />
        {error && <div className="text-red-500 text-sm mt-4">{error}</div>}
      </div>
      
      <button 
        type="submit" 
        className="btn btn-primary btn-large w-full" 
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>
      
      <div className="security-info mt-6 text-sm text-gray-400 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faLock} className="text-emerald-500" />
          <span>Payments are processed securely via Stripe</span>
        </div>
      </div>
    </form>
  );
};

const InvoicePage: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const isSuccess = queryParams.get('success') === 'true';
  const invoiceId = queryParams.get('id');

  const [invoice, setInvoice] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const initializePayment = async (invoiceData: any) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/payments/stripe/create-checkout-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: invoiceData.amount,
          metadata: {
            type: 'manual_invoice',
            invoiceId: invoiceData._id,
            customerName: invoiceData.customerName,
            customerEmail: invoiceData.customerEmail,
            reason: invoiceData.description
          }
        })
      });

      const data = await res.json();
      
      if (res.ok && data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        setErrorMsg(data.message || 'Failed to initialize payment.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred. Please try again.');
    }
  };

  useEffect(() => {
    if (invoiceId) {
      const fetchInvoice = async () => {
        try {
          const res = await fetch(`${process.env.REACT_APP_API_URL}/invoices/${invoiceId}`);
          const data = await res.json();
          if (res.ok && data) {
            setInvoice(data);
            if (data.status === 'paid') {
              setErrorMsg('This invoice has already been paid.');
            } else {
              await initializePayment(data);
            }
            
            try {
              const paymentsRes = await fetch(`${process.env.REACT_APP_API_URL}/payments?invoice=${invoiceId}`);
              const paymentsData = await paymentsRes.json();
              if (paymentsRes.ok && Array.isArray(paymentsData)) {
                setPayments(paymentsData);
              }
            } catch (paymentErr) {
              console.error('Failed to load payments:', paymentErr);
            }
          } else {
            setErrorMsg(data.message || 'Invoice not found');
          }
        } catch (err) {
          setErrorMsg('Failed to load invoice details.');
        } finally {
          setLoading(false);
        }
      };
      fetchInvoice();
    } else {
      setErrorMsg('Invalid invoice link. Please contact support.');
      setLoading(false);
    }
  }, [invoiceId]);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-950 pt-32 pb-20 px-4">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FontAwesomeIcon icon={faShieldHalved} className="text-4xl text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Payment Successful</h1>
          <p className="text-gray-400 mb-8">Thank you for your payment. A receipt has been sent to your email address.</p>
          <a href="/" className="btn btn-primary">Return to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-32 pb-20 px-4">
      <motion.div 
        className="max-w-2xl mx-auto bg-gray-900 border border-gray-800 p-8 rounded-xl shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-start mb-8 pb-8 border-b border-gray-800">
          <div>
            <img src="/logo-2.png" alt="LANForge" className="h-8 mb-4" />
            <h1 className="text-3xl font-bold text-white tracking-wider">INVOICE</h1>
            {invoice && (
              <p className="text-gray-400 mt-1">#{invoice.invoiceNumber}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-gray-400 font-medium">LANForge</p>
            <p className="text-gray-500 text-sm mt-1">support@lanforge.co</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 mb-8 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-center font-medium">
            {errorMsg}
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading invoice securely...</p>
          </div>
        ) : invoice ? (
          <div className="space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1 uppercase tracking-wider">Bill To</p>
                <p className="text-white font-medium text-lg">{invoice.customerName}</p>
                <p className="text-gray-400">{invoice.customerEmail}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 font-medium mb-1 uppercase tracking-wider">Date Issued</p>
                <p className="text-white">{new Date(invoice.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  <tr className="text-white">
                    <td className="px-6 py-5">{invoice.description}</td>
                    <td className="px-6 py-5 text-right font-medium">${invoice.amount.toFixed(2)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-gray-800/80 text-white font-bold text-lg">
                  <tr>
                    <td className="px-6 py-4 text-right">Total Due</td>
                    <td className="px-6 py-4 text-right text-emerald-400">${invoice.amount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {invoice.status === 'paid' ? (
              <div className="mt-8 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FontAwesomeIcon icon={faShieldHalved} className="text-2xl text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-emerald-400 mb-2">Invoice Paid</h3>
                <p className="text-emerald-500/80">Thank you for your business. This invoice has been successfully settled.</p>
              </div>
            ) : clientSecret ? (
              <div className="mt-8 pt-8 border-t border-gray-800">
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                  <InvoiceCheckoutForm clientSecret={clientSecret} amount={invoice.amount} />
                </Elements>
              </div>
            ) : null}
            
            {payments.length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-800">
                <h3 className="text-lg font-bold text-white mb-4">Payment History</h3>
                <div className="space-y-3">
                  {payments.map(payment => (
                    <div key={payment._id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white font-medium">${payment.amount.toFixed(2)} {payment.currency.toUpperCase()}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          payment.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                          payment.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-400">
                        <span className="capitalize">{payment.paymentMethod}</span>
                        <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
};

export default InvoicePage;
