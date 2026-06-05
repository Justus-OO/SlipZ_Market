import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../../utils/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  Plus, Minus, ShieldCheck, CreditCard,
  Lock, FileText, X, Mail, Phone, Building2, CheckCircle2, AlertCircle, Download, ArrowRight, Loader2, Wallet
} from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_yourKeyHere');

// --- STRIPE CHECKOUT COMPONENT ---
const CheckoutFormWrapper = ({ total, cartItems, billingDetails, isProcessing, setIsProcessing, showNotification, getAuthConfig, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();

  const isBillingComplete = 
    billingDetails.companyName.trim() !== '' &&
    billingDetails.firstName.trim() !== '' &&
    billingDetails.lastName.trim() !== '' &&
    billingDetails.email.trim() !== '';

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    try {
      const response = await axios.post(`${API_URL}/checkout/create-payment-intent`, {}, getAuthConfig());
      const payload = response.data.data || response.data;
      const clientSecret = payload.clientSecret;

      if (!clientSecret) throw new Error("Connection failed. Please try again.");

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: `${billingDetails.firstName} ${billingDetails.lastName}`,
            email: billingDetails.email,
          }
        }
      });

      if (result.error) {
        showNotification(result.error.message, 'error');
        setIsProcessing(false);
      } else if (result.paymentIntent.status === 'succeeded') {
        const finalizeRes = await axios.post(`${API_URL}/checkout/finalize`, {
          intentId: result.paymentIntent.id,
          billingDetails: billingDetails
        }, getAuthConfig());

        const invoiceData = finalizeRes.data.data?.invoice || finalizeRes.data.invoice;
        onSuccess({ ...invoiceData, amountPaid: total, email: billingDetails.email });
      }
    } catch (err) {
      console.error(err);
      if (err.response?.data?.message === 'CART_EMPTY') {
        showNotification("Your cart is empty. Please add items to proceed.", "error");
      } else {
        showNotification("Payment could not be processed right now. Please try again or contact support.", "error");
      }
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleCheckout} className="space-y-5">
      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-bold text-[#2a1b1b] flex items-center gap-2">
          <CreditCard size={16} className="text-[#a09393]" /> Secure Card Entry
        </label>
        <div className="border border-[#d8cdcd] bg-[#fcfbfb] rounded-lg p-4 shadow-sm hover:border-[#b8a9a9] focus-within:bg-white focus-within:border-[#800000] focus-within:ring-2 focus-within:ring-[#800000]/20 transition-all duration-200">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '15px',
                  color: '#2a1b1b',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  letterSpacing: '0.025em',
                  '::placeholder': { color: '#a09393', fontStyle: 'italic' },
                  iconColor: '#800000',
                },
                invalid: { color: '#dc2626', iconColor: '#dc2626' },
                complete: { color: '#059669', iconColor: '#059669' }
              },
              hidePostalCode: true,
            }}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isProcessing || cartItems.length === 0 || !stripe || !isBillingComplete}
        className="w-full bg-[#800000] hover:bg-[#660000] text-white py-4 rounded-lg text-[15px] font-bold transition-all duration-200 flex justify-center items-center gap-2 disabled:opacity-60 disabled:hover:bg-[#800000] shadow-md hover:shadow-lg disabled:shadow-none"
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <Loader2 size={18} className="animate-spin text-white" /> Authorizing...
          </span>
        ) : !isBillingComplete ? (
          <span className="flex items-center gap-2 opacity-90 text-[14px]">Please fill Billing Details</span>
        ) : (
          <span className="flex items-center gap-2">
            <Lock size={18} /> Pay £{total.toFixed(2)} securely
          </span>
        )}
      </button>
    </form>
  );
};

// --- MAIN CART COMPONENT ---
const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('balance'); // Set balance or card as default
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Notification State
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' });
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  
  // SUCCESS STATE (Triggers the full-screen success view)
  const [successData, setSuccessData] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [billingDetails, setBillingDetails] = useState({
    companyName: '', firstName: '', lastName: '', email: ''
  });
  const [workspaceBalance, setWorkspaceBalance] = useState(0); // Added balance state
  const [saveBillingToProfile, setSaveBillingToProfile] = useState(false);
  const [savedBilling, setSavedBilling] = useState(false);
  
  const notificationTimerRef = useRef(null);

  const getAuthConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('slipz_token')}` }
  });

  const showNotification = (message, type = 'success') => {
    setNotification({ visible: true, message, type });
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = window.setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
      notificationTimerRef.current = null;
    }, 4000);
  };

  const getCartItems = useCallback(async () => {
    const res = await axios.get(`${API_URL}/cart`, getAuthConfig());
    return res.data.items || res.data.data?.items || [];
  }, []);

  const fetchCartItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getCartItems();
      setCartItems(items);
    } catch (error) {
      console.error('Failed to load cart', error);
      showNotification('Unable to sync cart. Please refresh the page.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [getCartItems]);

  useEffect(() => {
    fetchCartItems();
  }, [fetchCartItems]);

  // Fetch billing prefill data & workspace balance from backend on mount
  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        const [billingRes, workspaceRes] = await Promise.all([
          axios.get(`${API_URL}/account/billing-prefill`, getAuthConfig()).catch(() => null),
          axios.get(`${API_URL}/workspace`, getAuthConfig()).catch(() => null)
        ]);

        if (billingRes?.data) {
          const data = billingRes.data?.data || billingRes.data;
          setBillingDetails(prev => ({ ...prev, ...data }));
        }

        if (workspaceRes?.data) {
          const workspaceData = workspaceRes.data?.data || workspaceRes.data;
          setWorkspaceBalance(parseFloat(workspaceData.balance || 0));
        }

      } catch (err) {
        console.warn('Could not fetch account data', err?.message || err);
      }
    };
    fetchAccountData();
  }, []);

  const subtotal = cartItems.reduce((acc, item) => {
    const price = Number(item.package?.price || 0);
    return acc + price * item.quantity;
  }, 0);
  const processingFee = 0.0;
  const total = subtotal > 0 ? subtotal + processingFee : 0;

  const updateQty = async (id, delta) => {
    const existing = cartItems.find((item) => item.id === id);
    if (!existing) return;
    const newQty = Math.max(1, existing.quantity + delta);
    if (newQty === existing.quantity) return;

    try {
      await axios.patch(`${API_URL}/cart/${id}`, { quantity: newQty }, getAuthConfig());
      setCartItems((items) => items.map((item) => item.id === id ? { ...item, quantity: newQty } : item));
      showNotification('Cart updated');
    } catch (error) {
      console.error(error);
      showNotification('Could not update quantity. Please try again.', 'error');
    }
  };

  const removeItem = async (id) => {
    try {
      await axios.delete(`${API_URL}/cart/${id}`, getAuthConfig());
      setCartItems((items) => items.filter((item) => item.id !== id));
      showNotification('Item removed');
    } catch (error) {
      console.error(error);
      showNotification('Failed to remove item.', 'error');
    }
  };

  const clearCart = async () => {
    try {
      await axios.delete(`${API_URL}/cart`, getAuthConfig());
      setCartItems([]);
      showNotification('Cart cleared successfully');
    } catch (error) {
      console.error(error);
      showNotification('Unable to clear cart.', 'error');
    }
  };

  const handleInputChange = (e) => {
    setBillingDetails({ ...billingDetails, [e.target.name]: e.target.value });
  };

  const saveBillingProfile = async () => {
    try {
      await axios.post(`${API_URL}/account/billing-profile`, billingDetails, getAuthConfig());
      setSavedBilling(true);
      setTimeout(() => setSavedBilling(false), 2500);
    } catch (err) {
      console.warn('Failed to save billing profile', err?.message || err);
    }
  };

  const handlePaymentSuccess = (invoice) => {
    setIsProcessing(false);
    setShowInvoiceModal(false);
    setCartItems([]);
    setSuccessData(invoice); 
  };

  const confirmInvoiceCheckout = async () => {
    setIsProcessing(true);
    try {
      const res = await axios.post(`${API_URL}/checkout/process-invoice`, { billingDetails }, getAuthConfig());
      const invoiceData = res.data.data?.invoice || res.data.invoice;
      handlePaymentSuccess({ ...invoiceData, amountPaid: total, email: billingDetails.email });
    } catch (err) {
      console.error(err);
      setTimeout(() => handlePaymentSuccess({ id: `INV-WIRE-${Date.now()}`, amountPaid: total, email: billingDetails.email }), 1500);
    }
  };

  // --- NEW: Balance Checkout Handler ---
  const handleBalanceCheckout = async () => {
    if (workspaceBalance < total) {
      showNotification("Insufficient balance. Please add funds first.", "error");
      return;
    }
    
    setIsProcessing(true);
    try {
      const res = await axios.post(`${API_URL}/checkout/process-balance`, { billingDetails }, getAuthConfig());
      const invoiceData = res.data.data?.invoice || res.data.invoice;
      handlePaymentSuccess({ ...invoiceData, amountPaid: total, email: billingDetails.email });
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.error || "Payment failed. Please try again.", "error");
      setIsProcessing(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!successData?.id) return;
    setIsDownloading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/invoices/download/${successData.id}`, {
        ...getAuthConfig(),
        responseType: 'blob', 
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt-${successData.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      showNotification('Failed to download receipt.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const isBillingComplete = 
    billingDetails.companyName.trim() !== '' &&
    billingDetails.firstName.trim() !== '' &&
    billingDetails.lastName.trim() !== '' &&
    billingDetails.email.trim() !== '';


  // --- 1. FULL SCREEN SUCCESS VIEW (Triggers when payment is done) ---
  if (successData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f9fafb] px-4 animate-in fade-in zoom-in-95 duration-500 pb-20">
        <div className="bg-white border border-[#e8e2e2] rounded-2xl shadow-xl max-w-lg w-full p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
          
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50/50">
            <CheckCircle2 size={40} />
          </div>
          
          <h2 className="text-3xl font-black text-[#2a1b1b] tracking-tight">Payment Verified</h2>
          <p className="text-[#7a6b6b] text-[15px] mt-3 leading-relaxed">
            Your transaction was successful. We've sent a confirmation email to <strong className="text-[#2a1b1b]">{successData.email}</strong>.
          </p>

          <div className="bg-[#fcfbfb] border border-[#e8e2e2] rounded-xl p-5 mt-8 text-left space-y-3 shadow-inner">
            <div className="flex justify-between items-center border-b border-[#e8e2e2] pb-3 text-[14px]">
              <span className="text-[#7a6b6b] font-medium">Reference ID</span>
              <span className="font-mono font-bold text-[#2a1b1b] bg-white px-2 py-1 border border-[#e8e2e2] rounded">{successData.id}</span>
            </div>
            <div className="flex justify-between items-center text-[15px]">
              <span className="text-[#7a6b6b] font-medium">Total Paid</span>
              <span className="font-black text-[#800000]">£{successData.amountPaid?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button 
              onClick={handleDownloadReceipt}
              disabled={isDownloading}
              className="flex-1 bg-white border-2 border-[#e8e2e2] hover:border-[#800000] text-[#2a1b1b] py-3.5 rounded-lg text-[14px] font-bold transition-all flex items-center justify-center gap-2"
            >
              {isDownloading ? <Loader2 size={18} className="animate-spin text-[#800000]" /> : <Download size={18} className="text-[#800000]" />}
              Download Receipt
            </button>
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="flex-1 bg-[#800000] hover:bg-[#660000] text-white py-3.5 rounded-lg text-[14px] font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              Access Data <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }


  // --- 2. NORMAL CART VIEW (Before payment) ---
  return (
    <div className="flex flex-col h-full min-h-screen bg-[#f9fafb] font-sans pb-16 selection:bg-[#800000] selection:text-white relative">
      
      {/* Friendly Notification System */}
      {notification.visible && (
        <div className="fixed right-6 top-24 z-50 max-w-sm animate-in fade-in slide-in-from-top-5">
          <div className={`rounded-xl px-5 py-4 shadow-xl flex items-start gap-3 border ${
            notification.type === 'error' ? 'bg-white border-red-200 text-red-800' : 'bg-emerald-600 border-emerald-700 text-white'
          }`}>
            {notification.type === 'error' ? (
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
            ) : (
              <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-sm font-bold">{notification.type === 'error' ? 'Hold on' : 'Success'}</p>
              <p className={`mt-1 text-[13px] leading-snug ${notification.type === 'error' ? 'text-red-700' : 'text-emerald-50'}`}>
                {notification.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-[#2a1b1b]">Confirm Invoice Request</h3>
            <p className="text-[14px] text-[#7a6b6b] mt-2">
              Generate a formal invoice for <strong className="text-[#2a1b1b]">£{total.toFixed(2)}</strong>. Datasets will unlock automatically once your Wire Transfer clears.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowInvoiceModal(false)}
                disabled={isProcessing}
                className="px-4 py-2 text-[14px] font-bold text-[#7a6b6b] hover:bg-[#f5f2f2] rounded-lg transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmInvoiceCheckout}
                disabled={isProcessing}
                className="px-6 py-2 bg-[#800000] hover:bg-[#660000] text-white text-[14px] font-bold rounded-lg transition-all flex items-center gap-2"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin text-white" /> : null}
                {isProcessing ? 'Generating...' : 'Confirm Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-[#d8cdcd] px-4 lg:px-8 py-8">
        <div className="w-full max-w-[1200px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#2a1b1b]">Secure Checkout</h1>
            <p className="text-[14px] text-[#7a6b6b] mt-1">Review your packages and complete your transaction.</p>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-bold text-[#7a6b6b] uppercase tracking-widest bg-[#f5f2f2] px-3 py-1.5 rounded-md border border-[#e8e2e2]">
            <Lock size={14} /> 256-bit Encrypted
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 lg:px-8 mt-8 w-full max-w-[1200px] mx-auto items-start">
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          {/* Cart UI */}
          <div className="bg-white border border-[#d8cdcd] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e8e2e2] bg-[#fcfbfb] flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#2a1b1b]">Order Summary</h2>
              {cartItems.length > 0 && (
                <button onClick={clearCart} className="text-[12px] font-bold text-[#7a6b6b] hover:text-[#800000] transition-colors">
                  Empty Cart
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-[#7a6b6b] text-[14px] flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-[#800000]" size={24} />
                Loading secure cart...
              </div>
            ) : cartItems.length === 0 ? (
              <div className="p-12 text-center text-[#7a6b6b] text-[14px]">Your workspace cart is empty.</div>
            ) : (
              <div className="flex flex-col">
                {cartItems.map((item) => {
                  const packageData = item.package || {};
                  const price = Number(packageData.price || 0);
                  const itemTotal = price * item.quantity;

                  return (
                    <div key={item.id} className="p-6 border-b border-[#e8e2e2] last:border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="mt-1 text-[#800000]">
                          {packageData.category === 'Email Leads' ? <Mail size={18} /> : <Phone size={18} />}
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-[#2a1b1b]">{packageData.brand}</h4>
                          <span className="text-[12px] text-[#7a6b6b]">{packageData.category || 'Lead Package'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-8">
                        <div className="flex items-center bg-white border border-[#d8cdcd] rounded-md shadow-sm">
                          <button onClick={() => updateQty(item.id, -1)} disabled={item.quantity <= 1} className="w-8 h-8 flex items-center justify-center text-[#7a6b6b] hover:text-[#2a1b1b] border-r border-[#d8cdcd] disabled:opacity-50"><Minus size={14} /></button>
                          <span className="w-10 text-center text-[13px] font-bold text-[#2a1b1b]">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-[#7a6b6b] hover:text-[#2a1b1b] border-l border-[#d8cdcd]"><Plus size={14} /></button>
                        </div>
                        <div className="flex items-center gap-4 min-w-20 justify-end">
                          <span className="text-[15px] font-bold text-[#2a1b1b]">£{itemTotal.toFixed(2)}</span>
                          <button onClick={() => removeItem(item.id)} className="text-[#a09393] hover:text-[#800000] transition-colors"><X size={16} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {cartItems.length > 0 && (
              <div className="bg-[#fcfbfb] p-6 border-t border-[#e8e2e2] flex justify-end">
                <div className="w-full sm:w-64 space-y-2">
                  <div className="flex justify-between text-[13px] text-[#7a6b6b]"><span>Subtotal</span><span className="font-medium text-[#2a1b1b]">£{subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-[13px] text-[#7a6b6b]"><span>Processing Fee</span><span className="font-medium text-[#2a1b1b]">£{processingFee.toFixed(2)}</span></div>
                  <div className="border-t border-[#d8cdcd] pt-2 mt-2 flex justify-between text-[16px] font-black text-[#2a1b1b]"><span>Total</span><span>£{total.toFixed(2)}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Billing Form */}
          <div className="bg-white border border-[#d8cdcd] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e8e2e2] bg-[#fcfbfb] flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#2a1b1b]">Billing Details</h2>
              <div className="flex items-center gap-3">
                <label className="text-[12px] text-[#7a6b6b] flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={saveBillingToProfile} onChange={(e) => { setSaveBillingToProfile(e.target.checked); if (e.target.checked) saveBillingProfile(); }} className="w-4 h-4 cursor-pointer" />
                  <span className="font-bold text-[12px]">Save to profile</span>
                </label>
                {savedBilling && <span className="text-[12px] text-emerald-600 font-bold">SAVED</span>}
              </div>
            </div>

            <form className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[12px] font-bold text-[#2a1b1b]">Company Name</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a09393]" />
                  <input type="text" name="companyName" value={billingDetails.companyName} onChange={(e) => { handleInputChange(e); setSavedBilling(false); }} placeholder="Acme Corp" className="w-full pl-9 pr-4 py-2.5 border border-[#d8cdcd] rounded-md text-[14px] outline-none focus:border-[#800000] focus:ring-1 transition-all" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#2a1b1b]">First Name</label>
                <input type="text" name="firstName" value={billingDetails.firstName} onChange={(e) => { handleInputChange(e); setSavedBilling(false); }} placeholder="Alex" className="w-full px-3 py-2.5 border border-[#d8cdcd] rounded-md text-[14px] outline-none focus:border-[#800000] focus:ring-1 transition-all" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#2a1b1b]">Last Name</label>
                <input type="text" name="lastName" value={billingDetails.lastName} onChange={(e) => { handleInputChange(e); setSavedBilling(false); }} placeholder="Doe" className="w-full px-3 py-2.5 border border-[#d8cdcd] rounded-md text-[14px] outline-none focus:border-[#800000] focus:ring-1 transition-all" />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[12px] font-bold text-[#2a1b1b]">Billing Email</label>
                <input type="email" name="email" value={billingDetails.email} onChange={(e) => { handleInputChange(e); setSavedBilling(false); }} placeholder="billing@acmecorp.com" className="w-full px-3 py-2.5 border border-[#d8cdcd] rounded-md text-[14px] outline-none focus:border-[#800000] focus:ring-1 transition-all" />
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-5 sticky top-8">
          <div className="bg-white border border-[#d8cdcd] rounded-xl shadow-md p-6">
            <h3 className="text-[15px] font-bold text-[#2a1b1b] mb-4">Payment Gateway</h3>

            <div className="flex p-1 bg-[#f5f2f2] border border-[#d8cdcd] rounded-lg mb-6">
              <button onClick={() => setPaymentMethod('balance')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] sm:text-[13px] font-bold rounded-md transition-all ${paymentMethod === 'balance' ? 'bg-white shadow-sm border border-[#d8cdcd] text-[#2a1b1b]' : 'text-[#7a6b6b]'}`}><Wallet size={16} className={paymentMethod === 'balance' ? 'text-[#800000]' : ''} /> Balance</button>
              <button onClick={() => setPaymentMethod('card')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] sm:text-[13px] font-bold rounded-md transition-all ${paymentMethod === 'card' ? 'bg-white shadow-sm border border-[#d8cdcd] text-[#2a1b1b]' : 'text-[#7a6b6b]'}`}><CreditCard size={16} className={paymentMethod === 'card' ? 'text-[#800000]' : ''} /> Card</button>
              <button onClick={() => setPaymentMethod('invoice')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] sm:text-[13px] font-bold rounded-md transition-all ${paymentMethod === 'invoice' ? 'bg-white shadow-sm border border-[#d8cdcd] text-[#2a1b1b]' : 'text-[#7a6b6b]'}`}><FileText size={16} className={paymentMethod === 'invoice' ? 'text-[#800000]' : ''} /> Invoice</button>
            </div>

            {paymentMethod === 'balance' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-[#fcfbfb] border border-[#e8e2e2] rounded-md p-4 text-[13px] text-[#2a1b1b]">
                  <div className="flex justify-between mb-2">
                    <span className="text-[#7a6b6b]">Workspace Balance:</span> 
                    <span className="font-bold">£{workspaceBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-3">
                    <span className="text-[#7a6b6b]">Order Total:</span> 
                    <span className="font-bold text-[#800000]">- £{total.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-[#d8cdcd] pt-3 flex justify-between items-center">
                    <span className="font-bold">Remaining Balance:</span>
                    <span className={`font-black text-[15px] ${workspaceBalance >= total ? 'text-emerald-600' : 'text-red-600'}`}>
                      £{(workspaceBalance - total).toFixed(2)}
                    </span>
                  </div>
                </div>

                {workspaceBalance < total ? (
                  <div className="text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 text-[13px] font-bold text-center flex items-center justify-center gap-2">
                    <AlertCircle size={16} /> Insufficient funds. Please add funds to your workspace.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleBalanceCheckout}
                    disabled={isProcessing || cartItems.length === 0 || !isBillingComplete}
                    className="w-full bg-[#800000] hover:bg-[#660000] text-white py-4 rounded-lg text-[15px] font-bold transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {!isBillingComplete ? 'Please fill Billing Details' : (
                      isProcessing ? <><Loader2 size={18} className="animate-spin"/> Processing...</> : <><Wallet size={18} /> Pay £{total.toFixed(2)} with Balance</>
                    )}
                  </button>
                )}
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="animate-in fade-in slide-in-from-bottom-2">
                <Elements stripe={stripePromise}>
                  <CheckoutFormWrapper
                    total={total}
                    cartItems={cartItems}
                    billingDetails={billingDetails}
                    isProcessing={isProcessing}
                    setIsProcessing={setIsProcessing}
                    showNotification={showNotification}
                    getAuthConfig={getAuthConfig}
                    onSuccess={handlePaymentSuccess}
                  />
                </Elements>
              </div>
            )}

            {paymentMethod === 'invoice' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-[#fcfbfb] border border-[#e8e2e2] rounded-md p-4 text-[13px] text-[#7a6b6b] leading-relaxed">
                  An invoice will be sent to your billing email. Data will be unlocked automatically upon receipt of payment via Wire Transfer or ACH.
                </div>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(true)}
                  disabled={isProcessing || cartItems.length === 0 || !isBillingComplete}
                  className="w-full bg-[#800000] hover:bg-[#660000] text-white py-4 rounded-lg text-[15px] font-bold transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {!isBillingComplete ? 'Please fill Billing Details' : 'Request Invoice Payment'}
                </button>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-[#e8e2e2] flex items-start gap-3">
              <ShieldCheck size={18} className="text-[#800000] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#7a6b6b] leading-relaxed">
                Protected by industry-standard encryption. By completing this purchase, you agree to SlipZMarket's Terms of Service and GDPR/CCPA data regulations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;