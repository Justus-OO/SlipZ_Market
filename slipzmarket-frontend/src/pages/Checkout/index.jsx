import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheck, Lock, CreditCard, ArrowLeft, 
  CheckCircle2, Download, Mail, Phone,
  Building2, User, MailOpen, MapPin, Activity
} from 'lucide-react';

// --- MOCK CHECKOUT DATA ---
const SUMMARY_ITEMS = [
  { id: 'EML-1000', brand: '1,000 Enterprise SaaS Founders', category: 'Email Leads', price: 225.00, qty: 1 },
  { id: 'PHN-400', brand: '400 NA Fintech Executives', category: 'Direct Dial Phone', price: 200.00, qty: 1 }
];

const Checkout = () => {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- CALCULATIONS ---
  const subtotal = SUMMARY_ITEMS.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const processingFee = 4.50; // Secure delivery & compliance fee
  const total = subtotal + processingFee;

  // --- HANDLERS ---
  const handleCheckout = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate secure API call and payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
    }, 2500);
  };

  // --- SUCCESS STATE (POST-PURCHASE VIEW) ---
  if (isSuccess) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center h-full min-h-[80vh] font-sans pb-16 bg-[#f5efe6]">
        <div className="bg-white border border-[#d6c9b8] rounded-2xl p-8 md:p-12 shadow-xl shadow-[#3b2a23]/10 max-w-2xl w-full text-center flex flex-col items-center relative overflow-hidden">
          
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600" />
          
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6 border border-emerald-100 shadow-sm">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          
          <h1 className="text-[28px] font-bold tracking-tight text-[#3b2a23] mb-2">Payment Successful</h1>
          <p className="text-[#8b6f5a] font-medium mb-8 text-[14px]">Invoice <span className="font-mono font-bold text-[#3b2a23]">#INV-2026-090</span> has been processed. A receipt has been sent to your billing email.</p>
          
          <div className="w-full bg-[#faf6f0] border border-[#d6c9b8] rounded-xl p-6 mb-8 text-left shadow-inner">
            <h3 className="text-[12px] font-bold text-[#8b6f5a] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={16} className="text-[#8b6f5a]" /> Datasets Ready for Export
            </h3>
            <div className="space-y-3">
              {SUMMARY_ITEMS.map(item => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-[#d6c9b8] p-4 rounded-lg shadow-sm gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#faf6f0] border border-[#d6c9b8] rounded-lg flex items-center justify-center shrink-0">
                      {item.category === 'Email Leads' ? <Mail size={16} className="text-[#8b6f5a]" /> : <Phone size={16} className="text-[#8b6f5a]" />}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-[#3b2a23]">{item.brand}</p>
                      <p className="text-[11px] text-[#8b6f5a] font-mono uppercase mt-0.5">CSV / Excel Format</p>
                    </div>
                  </div>
                  <button className="text-[13px] font-bold text-white bg-[#8b6f5a] hover:bg-[#6c5544] px-4 py-2 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
                    <Download size={14} /> Download
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <button onClick={() => window.location.reload()} className="text-[13px] font-bold text-[#8b6f5a] hover:text-[#3b2a23] transition-colors flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // --- CHECKOUT FORM VIEW ---
  return (
    <div className="animate-fade-in flex flex-col h-full min-h-screen bg-[#f5efe6] font-sans pb-16 selection:bg-[#8b6f5a] selection:text-white">
      
      {/* --- HEADER --- */}
      <div className="px-0 py-8 w-full">
        <button className="flex items-center gap-2 text-[13px] font-bold text-[#8b6f5a] hover:text-[#3b2a23] transition-colors w-fit mb-6">
          <ArrowLeft size={16} /> Back to Cart
        </button>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#3b2a23]">
              {t('checkoutTitle')}
            </h1>
            <p className="text-[14px] font-medium text-[#8b6f5a] mt-1">{t('checkoutSubtitle')}</p>
          </div>
        </div>
      </div>

      {/* --- CHECKOUT LAYOUT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-0 w-full items-start">
        
        {/* LEFT COLUMN: Checkout Forms */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <form id="checkout-form" onSubmit={handleCheckout} className="flex flex-col gap-6">
            
            {/* 1. Billing Info Panel */}
            <div className="bg-white border border-[#d6c9b8] rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 bg-[#faf6f0] border-b border-[#d6c9b8]">
                <div className="w-6 h-6 bg-[#3b2a23] text-white rounded-full flex items-center justify-center text-[12px] font-bold">1</div>
                <h2 className="text-[15px] font-bold text-[#3b2a23]">Billing Information</h2>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-wider flex items-center gap-1.5"><User size={12}/> First Name</label>
                  <input type="text" required placeholder="Alex" className="w-full bg-white border border-[#d6c9b8] rounded-lg px-4 py-2.5 text-[14px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] transition-all" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-wider flex items-center gap-1.5"><User size={12}/> Last Name</label>
                  <input type="text" required placeholder="Doe" className="w-full bg-white border border-[#d6c9b8] rounded-lg px-4 py-2.5 text-[14px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] transition-all" />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-wider flex items-center gap-1.5"><Building2 size={12}/> Company Name</label>
                  <input type="text" required placeholder="Acme Corp Ltd." className="w-full bg-white border border-[#d6c9b8] rounded-lg px-4 py-2.5 text-[14px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] transition-all" />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-wider flex items-center gap-1.5"><MailOpen size={12}/> Billing Email</label>
                  <input type="email" required placeholder="billing@acmecorp.com" className="w-full bg-white border border-[#d6c9b8] rounded-lg px-4 py-2.5 text-[14px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] transition-all" />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-wider flex items-center gap-1.5"><MapPin size={12}/> Billing Region</label>
                  <select className="w-full bg-white border border-[#d6c9b8] rounded-lg px-4 py-2.5 text-[14px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] transition-all">
                    <option>United Kingdom</option>
                    <option>United States</option>
                    <option>European Union</option>
                    <option>Canada</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Payment Info Panel */}
            <div className="bg-white border border-[#d6c9b8] rounded-2xl shadow-sm overflow-hidden mb-8">
              <div className="flex items-center justify-between px-6 py-4 bg-[#faf6f0] border-b border-[#d6c9b8]">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#3b2a23] text-white rounded-full flex items-center justify-center text-[12px] font-bold">2</div>
                  <h2 className="text-[15px] font-bold text-[#3b2a23]">Payment Details</h2>
                </div>
                <Lock size={16} className="text-[#8b6f5a]" />
              </div>
              
              <div className="p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-wider flex items-center gap-1.5"><CreditCard size={12}/> Card Number</label>
                  <div className="relative">
                    <input type="text" required placeholder="0000 0000 0000 0000" maxLength="19" className="w-full bg-white border border-[#d6c9b8] rounded-lg pl-4 pr-12 py-2.5 text-[14px] font-mono font-bold text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] transition-all" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Card" className="absolute right-3 top-1/2 -translate-y-1/2 h-4 opacity-70" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-wider">Expiry (MM/YY)</label>
                    <input type="text" required placeholder="12/28" maxLength="5" className="w-full bg-white border border-[#d6c9b8] rounded-lg px-4 py-2.5 text-[14px] font-mono font-bold text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] transition-all" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-wider">CVC</label>
                    <input type="text" required placeholder="123" maxLength="4" className="w-full bg-white border border-[#d6c9b8] rounded-lg px-4 py-2.5 text-[14px] font-mono font-bold text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] transition-all" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-wider">Name on Card</label>
                  <input type="text" required placeholder="ALEX DOE" className="w-full bg-white border border-[#d6c9b8] rounded-lg px-4 py-2.5 text-[14px] font-bold uppercase text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] transition-all" />
                </div>
              </div>
            </div>
            
          </form>
        </div>

        {/* RIGHT COLUMN: Order Summary (Sticky) */}
        <div className="lg:col-span-5 sticky top-8">
          <div className="bg-white border border-[#d6c9b8] rounded-2xl p-6 shadow-xl shadow-[#3b2a23]/5 flex flex-col relative overflow-hidden">
            
            <h3 className="text-[16px] font-bold text-[#3b2a23] mb-5 border-b border-[#d6c9b8] pb-4">{t('orderSummary')}</h3>

            {/* Read-only Cart Items */}
            <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-[#d6c9b8]/50 border-dashed">
              {SUMMARY_ITEMS.map((item) => (
                <div key={item.id} className="flex justify-between items-start gap-4">
                  <div className="flex flex-col">
                    <p className="text-[13px] font-bold text-[#3b2a23] leading-tight">{item.brand}</p>
                    <p className="text-[11px] font-medium text-[#8b6f5a] mt-0.5">Quantity: {item.qty}</p>
                  </div>
                  <p className="text-[14px] font-bold font-mono text-[#3b2a23]">£{(item.price * item.qty).toFixed(2)}</p>
                </div>
              ))}
            </div>

            {/* Ledger Breakdown */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[#8b6f5a] font-bold">Subtotal</span>
                <span className="text-[#3b2a23] font-bold font-mono">£{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[#8b6f5a] font-bold">Data Processing Fee</span>
                <span className="text-[#3b2a23] font-bold font-mono">£{processingFee.toFixed(2)}</span>
              </div>
            </div>

            {/* Total Calculation */}
            <div className="bg-[#faf6f0] border border-[#d6c9b8] rounded-xl p-5 mb-6 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold text-[#8b6f5a] uppercase tracking-widest">Total Due</span>
                <p className="text-[28px] font-black font-mono text-[#3b2a23] tracking-tighter">£{total.toFixed(2)}</p>
              </div>
            </div>

            {/* Submit Action Button */}
            <button 
              type="submit"
              form="checkout-form"
              disabled={isProcessing}
              className="w-full bg-[#8b6f5a] hover:bg-[#6c5544] text-white py-3.5 rounded-xl text-[14px] font-bold uppercase tracking-widest transition-all shadow-md flex justify-center items-center gap-2 group disabled:opacity-70"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Authorizing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock size={16} /> Pay Securely £{total.toFixed(2)}
                </span>
              )}
            </button>

            {/* Trust Indicators */}
            <div className="flex justify-center items-center gap-5 text-[10px] font-bold uppercase tracking-widest text-[#8b6f5a] mt-6">
              <span className="flex items-center gap-1.5"><Lock size={14} /> 256-Bit SSL Encryption</span>
              <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-600" /> PCI Compliant</span>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;