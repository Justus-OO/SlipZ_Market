import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../../utils/api';
import { useTranslation } from 'react-i18next';
import {
  Search, ShieldCheck, X, ShoppingCart,
  Mail, Phone, Database, SlidersHorizontal,
  Lock, Check, MoreVertical, Activity,
  Loader2, LogIn
} from 'lucide-react';
import { 
  addToLocalCart, 
  isLoggedIn, markPendingSync 
} from '../../utils/sessionCart';

const BrowseLeads = () => {
  const { t } = useTranslation();
  // --- CORE DATA STATE ---
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- UI STATE ---
  const [activeCategory, setActiveCategory] = useState('All Leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);

  const categories = [
    { value: 'All Leads', label: 'All Leads', icon: Database },
    { value: 'Email Leads', label: 'Precision Email', icon: Mail },
    { value: 'Phone Leads', label: 'Direct Dial', icon: Phone },
  ];
  
  // --- MODAL & DRAWER STATES ---
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState('overview');
  const [isAdding, setIsAdding] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [showGuestAddedModal, setShowGuestAddedModal] = useState(false);
  const toastTimerRef = useRef(null);
  



  
  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToastVisible(false);
      toastTimerRef.current = null;
    }, 3000);
  };

  // --- FETCH DATA FROM BACKEND ---
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await axios.get(`${API_URL}/packages`);
        setPackages(res.data.packages);
      } catch (error) {
        console.error("Failed to fetch packages", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const handleAddToCart = async () => {
  if (!selectedPackage) return;
  
  setIsAdding(true);
  try {
    const token = localStorage.getItem('slipz_token');
    const loggedIn = isLoggedIn();

    // Always save to local cart (persistent) - store minimal JSON-safe snapshot
    const pkg = selectedPackage;
    const snapshot = {
      id: pkg.id,
      brand: pkg.brand || pkg.name || '',
      price: Number(pkg.price || 0),
      category: pkg.category || 'Lead Package',
      leadsCount: Number(pkg.leadsCount || 0),
    };
    addToLocalCart({ id: selectedPackage.id, package: snapshot, quantity: 1 });
    
    // Notify sidebar and other components of cart update
    window.dispatchEvent(new Event('cartUpdated'));

    if (loggedIn) {
      // If logged in, also sync to backend
      try {
        await axios.post(`${API_URL}/cart/add`, 
          { packageId: selectedPackage.id }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast('✓ Added to cart!');
      } catch (err) {
        if (err.response?.status === 401) {
          showToast('Session expired. Saved to local cart');
        } else {
          // Still saved locally even if sync fails
          showToast('✓ Saved locally (check connection)');
        }
      }
    } else {
      // Not logged in - just local storage
      showToast('✓ Added to cart!');
      markPendingSync(); // Mark for sync when user logs in later
      // Show guest CTA modal after a brief delay
      setTimeout(() => setShowGuestAddedModal(true), 500);
    }
    
    setSelectedPackage(null);
  } catch (err) {
    console.error("Cart error:", err);
    showToast('Error adding to cart. Please try again');
  } finally {
    setIsAdding(false);
  }
};

  const toggleRowSelection = (e, id) => {
    e.stopPropagation();
    setSelectedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
  };

  const toggleAllRows = (e, currentFiltered) => {
    if (selectedRows.length === currentFiltered.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentFiltered.map(pkg => pkg.id));
    }
  };

  const getFilteredPackages = () => {
    let filtered = packages;
    if (activeCategory !== 'All Leads') {
      filtered = filtered.filter(pkg => pkg.category === activeCategory);
    }
    if (searchQuery) {
      filtered = filtered.filter(pkg => pkg.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered;
  };

  const filteredPackages = getFilteredPackages();
  const bulkTotal = filteredPackages.filter(p => selectedRows.includes(p.id)).reduce((acc, curr) => acc + curr.price, 0);
  const packageCount = packages.length;
  const selectedCount = selectedRows.length;

  return (
    <div className="flex flex-col h-full min-h-screen bg-app font-sans selection:bg-accent selection:text-surface pb-16">
      
      {/* --- ENTERPRISE HEADER --- */}
      <div className="bg-surface border-b border-theme px-0 lg:px-0 py-6 sticky top-0 z-30 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-surface border border-theme rounded-xl flex items-center justify-center shadow-sm">
              <Database size={20} className="text-muted" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary tracking-tight leading-tight">{t('leadDatabase')}</h1>
              <div className="flex items-center gap-2 mt-0.5 text-[13px] text-muted font-medium">
                <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-muted"/> {t('verifiedNetwork')}</span>
                <span className="opacity-50">•</span>
                <span>270M+ Contacts Available</span>
                <span className="opacity-50">•</span>
                <span className="font-semibold text-[#8b6f5a]">Built for growth teams craving high-conversion data.</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center w-full md:w-72 bg-surface border border-theme rounded-lg px-3 py-2 shadow-sm focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all">
              <Search size={16} className="text-muted opacity-70" />
              <input 
                type="text" 
                placeholder="Search packages or volumes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-[11px] text-primary w-full px-2 placeholder:text-muted placeholder:opacity-60"
              />
            </div>
            <button 
              onClick={() => setIsFilterModalOpen(true)}
              className="flex items-center gap-2 bg-surface border border-theme text-primary hover:bg-surface px-3 py-2 rounded-lg shadow-sm transition-all text-[11px] font-bold"
            >
              <SlidersHorizontal size={16} className="text-[#8b6f5a]" /> {t('filters')}
            </button>
          </div>
        </div>
      </div>

      {toastVisible && (
        <div className="fixed right-6 top-24 z-50 max-w-xs">
          <div className="rounded-2xl bg-emerald-600 px-4 py-3 shadow-2xl shadow-black/10 text-white">
            <p className="text-sm font-bold">Success</p>
            <p className="mt-1 text-[13px] leading-snug">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Guest Added Modal CTA */}
      {showGuestAddedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart size={32} />
            </div>
            <h3 className="text-center text-lg font-black text-[#2a1b1b] tracking-tight">Item Added to Cart!</h3>
            <p className="text-center text-[12px] text-[#7a6b6b] mt-3 leading-relaxed">
              Your package is saved locally. Sign in to your SlipZMarket account to review your cart and complete checkout with instant data access.
            </p>
            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={() => {
                  setShowGuestAddedModal(false);
                  window.location.href = '/cart';
                }}
                className="w-full bg-white border-2 border-[#800000] hover:bg-[#800000]/5 text-[#800000] py-2.5 rounded-lg text-[12px] font-bold transition-all"
              >
                View Cart
              </button>
              <button
                onClick={() => {
                  setShowGuestAddedModal(false);
                  window.location.href = '/auth?redirect=/cart';
                }}
                className="w-full bg-[#800000] hover:bg-[#660000] text-white py-2.5 rounded-lg text-[12px] font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                <LogIn size={16} /> Sign In Now
              </button>
            </div>
            <button
              onClick={() => setShowGuestAddedModal(false)}
              className="mt-4 w-full text-[11px] font-bold text-[#7a6b6b] hover:text-[#2a1b1b] py-2 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {/* --- MAIN WORKSPACE --- */}
      <div className="flex flex-col gap-8 px-0 mt-6 w-full">
        
        {/* CATEGORY BUTTONS - PLAYFUL */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Mail size={20} className="text-blue-600" />
              <span className="text-[11px] font-bold text-gray-700">Gmail</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={20} className="text-amber-600" />
              <span className="text-[11px] font-bold text-gray-700">Phone</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const colors = {
                'All Leads': 'from-slate-400 to-slate-600',
                'Email Leads': 'from-blue-400 to-blue-600',
                'Phone Leads': 'from-amber-400 to-amber-600',
              };
              const bgGradient = colors[cat.value] || 'from-gray-400 to-gray-600';
              
              return (
                <button
                  key={cat.value}
                  onClick={() => { setActiveCategory(cat.value); setSelectedRows([]); }}
                  className={`group relative px-3 py-2 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                    activeCategory === cat.value
                      ? `bg-linear-to-r ${bgGradient} text-white shadow-lg shadow-${bgGradient.split('-')[1]}-300/50 scale-105`
                      : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <Icon size={14} className={activeCategory === cat.value ? 'text-white' : 'text-gray-600'} />
                  {cat.label}
                  {activeCategory === cat.value && (
                    <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/30 text-[9px] font-bold text-white">
                      {filteredPackages.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTROL BAR */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-linear-to-r from-slate-50 to-blue-50 rounded-3xl p-5 border border-slate-200">
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold">
              📊 {packageCount} total
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold">
              🔍 {filteredPackages.length} shown
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold">
              ✅ {selectedCount} picked
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 border-slate-300 bg-white text-slate-700 text-[12px] font-bold hover:border-slate-400 hover:bg-slate-50 transition-all"
            >
              <SlidersHorizontal size={16} /> Filters
            </button>
            <button
              onClick={handleAddToCart}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-linear-to-r from-emerald-400 to-emerald-600 text-white text-[12px] font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <ShoppingCart size={16} /> Add to Cart
            </button>
          </div>
        </div>

        <div className="flex-1 w-full flex flex-col gap-5">
          
          {/* Bulk Action Bar */}
          <div className={`bg-white border border-[#8b6f5a] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between shadow-lg shadow-[#3b2a23]/5 transition-all duration-300 ${selectedRows.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 hidden'}`}>
            <div className="flex items-center gap-4 mb-3 sm:mb-0">
              <span className="bg-[#faf6f0] border border-[#d6c9b8] text-[#8b6f5a] text-[12px] font-bold px-3 py-1 rounded-full">
                {selectedRows.length} Selected
              </span>
              <span className="text-[14px] text-[#3b2a23] font-medium">Total Value: <span className="font-bold font-mono ml-1">£{bulkTotal.toFixed(2)}</span></span>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none text-[11px] font-bold text-[#3b2a23] hover:bg-[#faf6f0] px-3 py-2 border border-[#d6c9b8] rounded-lg bg-white shadow-sm transition-colors">
                Export Preview
              </button>
              <button 
                onClick={handleAddToCart}
                className="flex-1 sm:flex-none text-[11px] font-bold text-white bg-[#8b6f5a] hover:bg-[#6c5544] px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart size={16} /> Add to Cart
              </button>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white border border-[#d6c9b8] rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-225">
                <thead>
                  <tr className="bg-[#faf6f0] border-b border-[#d6c9b8]">
                    <th className="w-14 px-3 py-3 text-center">
                      <input 
                        type="checkbox" 
                        onChange={(e) => toggleAllRows(e, filteredPackages)}
                        checked={selectedRows.length === filteredPackages.length && filteredPackages.length > 0}
                        className="w-4 h-4 rounded border-[#d6c9b8] text-[#8b6f5a] focus:ring-[#8b6f5a] cursor-pointer" 
                      />
                    </th>
                    <th className="px-3 py-3 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Dataset Specification</th>
                    <th className="px-3 py-3 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Volume</th>
                    <th className="px-3 py-3 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Deliverability</th>
                    <th className="px-3 py-3 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest text-right">Cost / Lead</th>
                    <th className="px-3 py-3 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest text-right">Total</th>
                    <th className="w-16 px-3 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d6c9b8]/50">
                  {isLoading ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-12 text-center text-[#8b6f5a]">
                        <Loader2 size={24} className="animate-spin mx-auto mb-3" />
                        <span className="text-[14px] font-bold">Loading Datasets...</span>
                      </td>
                    </tr>
                  ) : filteredPackages.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-12 text-center text-[#8b6f5a] font-bold text-[14px]">
                        No packages found.
                      </td>
                    </tr>
                  ) : (
                    filteredPackages.map((pkg) => {
                      const isSelected = selectedRows.includes(pkg.id);
                      return (
                        <tr 
                          key={pkg.id} 
                          className={`transition-colors cursor-pointer ${isSelected ? 'bg-[#faf6f0]' : 'hover:bg-[#f5efe6]/50'}`}
                          onClick={() => { setSelectedPackage(pkg); setDetailsTab('overview'); }}
                        >
                          <td className="px-3 py-3 text-center" onClick={(e) => toggleRowSelection(e, pkg.id)}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={(e) => toggleRowSelection(e, pkg.id)} 
                              className="w-4 h-4 rounded border-[#d6c9b8] text-[#8b6f5a] focus:ring-[#8b6f5a] cursor-pointer" 
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col">
                                      <span className="text-[12px] font-bold text-[#3b2a23] group-hover:text-[#8b6f5a] transition-colors flex items-center gap-2">
                              {pkg.category === 'Email Leads' ? <Mail size={14} className="text-[#8b6f5a]" /> : pkg.category === 'Phone Leads' ? <Phone size={14} className="text-[#8b6f5a]" /> : <Activity size={14} className="text-[#8b6f5a]" />}
                              {pkg.brand}
                            </span>
                            <div className="mt-1 flex flex-wrap gap-2 items-center">
                              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8b6f5a] bg-[#faf6f0] px-2 py-1 rounded-full border border-[#d6c9b8]">{pkg.category}</span>
                              <span className="text-[10px] text-[#8b6f5a]">{pkg.type}</span>
                            </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-[10px] font-bold text-[#3b2a23] bg-[#faf6f0] px-2 py-1 rounded-md border border-[#d6c9b8]">
                              {pkg.leadsCount.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <Activity size={12} className="text-emerald-600" />
                              <span className="text-[11px] font-medium text-[#3b2a23]">{pkg.deliverability}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-[11px] font-mono text-[#8b6f5a]">£{pkg.unitPrice.toFixed(2)}</span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-[12px] font-mono font-bold text-[#3b2a23]">£{pkg.price.toFixed(2)}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button 
                              className="p-2 text-[#8b6f5a] hover:text-[#3b2a23] hover:bg-[#d6c9b8]/30 rounded-lg transition-colors"
                              onClick={(e) => { e.stopPropagation(); }}
                            >
                              <MoreVertical size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="px-4 py-3 border-t border-[#d6c9b8] bg-[#faf6f0] flex items-center justify-between">
              <span className="text-[12px] text-[#8b6f5a] font-bold uppercase tracking-wider">{filteredPackages.length} datasets available</span>
              <div className="flex items-center gap-3">
                <button className="text-[13px] font-bold text-[#8b6f5a] opacity-50 cursor-not-allowed transition-colors" disabled>Previous</button>
                <span className="text-[13px] text-[#3b2a23] font-bold px-2">1 / 1</span>
                <button className="text-[13px] font-bold text-[#8b6f5a] opacity-50 cursor-not-allowed transition-colors" disabled>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* DRAWER: ADVANCED FILTERS                    */}
      {/* ========================================= */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-[#3b2a23]/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={() => setIsFilterModalOpen(false)} />
          
          <div className="relative w-full max-w-sm bg-[#f5efe6] h-full shadow-2xl shadow-[#3b2a23]/20 flex flex-col animate-fade-in-right border-l border-[#d6c9b8]">
            <div className="px-6 py-5 border-b border-[#d6c9b8] bg-white flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[#3b2a23] flex items-center gap-2"><SlidersHorizontal size={18} className="text-[#8b6f5a]"/> Advanced Filters</h3>
              <button onClick={() => setIsFilterModalOpen(false)} className="p-2 text-[#8b6f5a] hover:text-[#3b2a23] hover:bg-[#f5efe6] rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-[#8b6f5a] uppercase tracking-widest">Target Industry</label>
                <select className="w-full bg-white border border-[#d6c9b8] rounded-lg px-4 py-3 text-[14px] text-[#3b2a23] font-medium outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]">
                  <option>All Industries</option>
                  <option>Software & IT Services</option>
                  <option>Healthcare & Pharma</option>
                  <option>Financial Services</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-[#8b6f5a] uppercase tracking-widest">Job Function</label>
                <select className="w-full bg-white border border-[#d6c9b8] rounded-lg px-4 py-3 text-[14px] text-[#3b2a23] font-medium outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]">
                  <option>Any Function</option>
                  <option>C-Suite & Founders</option>
                  <option>Marketing / Growth</option>
                  <option>Sales / RevOps</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-[#d6c9b8] bg-white flex gap-3">
              <button onClick={() => setIsFilterModalOpen(false)} className="flex-1 py-2.5 text-[14px] font-bold text-[#3b2a23] bg-white border border-[#d6c9b8] hover:bg-[#faf6f0] transition-colors rounded-lg shadow-sm">
                Clear All
              </button>
              <button onClick={() => setIsFilterModalOpen(false)} className="flex-1 bg-[#8b6f5a] hover:bg-[#6c5544] text-white py-2.5 rounded-lg text-[14px] font-bold shadow-sm transition-colors">
                Apply Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* DRAWER: PACKAGE DETAILS                     */}
      {/* ========================================= */}
      {selectedPackage && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-[#3b2a23]/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={() => setSelectedPackage(null)} />
          
          <div className="relative w-full max-w-150 bg-[#f5efe6] h-full shadow-2xl shadow-[#3b2a23]/20 flex flex-col animate-fade-in-right border-l border-[#d6c9b8]">
            
            {/* Drawer Header */}
            <div className="px-6 py-6 border-b border-[#d6c9b8] flex items-start justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#faf6f0] border border-[#d6c9b8] rounded-xl flex items-center justify-center shadow-sm">
                  {selectedPackage.category === 'Email Leads' ? <Mail size={20} className="text-[#8b6f5a]" /> : <Phone size={20} className="text-[#8b6f5a]" />}
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-[#3b2a23] leading-none mb-1.5">{selectedPackage.brand}</h2>
                  <span className="text-[13px] font-bold text-[#8b6f5a] flex items-center gap-2 uppercase tracking-wider">
                    {selectedPackage.category} <span className="w-1 h-1 bg-[#d6c9b8] rounded-full" /> Updated {selectedPackage.lastUpdated}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedPackage(null)} className="p-2 text-[#8b6f5a] hover:text-[#3b2a23] hover:bg-[#f5efe6] rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Internal Tabs */}
            <div className="flex border-b border-[#d6c9b8] px-8 bg-white gap-8">
              <button 
                onClick={() => setDetailsTab('overview')}
                className={`py-4 text-[14px] font-bold border-b-2 transition-colors ${detailsTab === 'overview' ? 'border-[#8b6f5a] text-[#8b6f5a]' : 'border-transparent text-[#8b6f5a] opacity-70 hover:opacity-100 hover:text-[#3b2a23]'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setDetailsTab('preview')}
                className={`py-4 text-[14px] font-bold border-b-2 transition-colors ${detailsTab === 'preview' ? 'border-[#8b6f5a] text-[#8b6f5a]' : 'border-transparent text-[#8b6f5a] opacity-70 hover:opacity-100 hover:text-[#3b2a23]'}`}
              >
                Data Sample
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-8 overflow-y-auto bg-white">
              
              {detailsTab === 'overview' && (
                <div className="animate-fade-in flex flex-col gap-8">
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-5">
                    <div className="border border-[#d6c9b8] p-5 rounded-xl bg-[#faf6f0]">
                      <span className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest block mb-1">Total Contacts</span>
                      <span className="text-[20px] font-bold text-[#3b2a23]">{selectedPackage.leadsCount.toLocaleString()}</span>
                    </div>
                    <div className="border border-[#d6c9b8] p-5 rounded-xl bg-[#faf6f0]">
                      <span className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest block mb-1">Deliverability</span>
                      <span className="text-[20px] font-bold text-emerald-600">{selectedPackage.deliverability}</span>
                    </div>
                    <div className="border border-[#d6c9b8] p-5 rounded-xl bg-[#faf6f0]">
                      <span className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest block mb-1">Format</span>
                      <span className="text-[16px] font-bold text-[#3b2a23]">{selectedPackage.type}</span>
                    </div>
                    <div className="border border-[#d6c9b8] p-5 rounded-xl bg-[#faf6f0]">
                      <span className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest block mb-1">Cost per Record</span>
                      <span className="text-[16px] font-mono font-bold text-[#3b2a23]">£{selectedPackage.unitPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="h-px bg-[#d6c9b8] w-full" />

                  {/* Trust Signals */}
                  <div className="flex flex-col gap-5">
                    <div className="flex gap-4 items-start p-4 rounded-xl border border-[#d6c9b8] bg-[#faf6f0]">
                      <ShieldCheck size={24} className="text-[#8b6f5a] shrink-0" />
                      <div>
                        <h4 className="text-[14px] font-bold text-[#3b2a23]">GDPR & CCPA Compliant</h4>
                        <p className="text-[13px] text-[#8b6f5a] mt-1 font-medium">Data is sourced exclusively from opt-in corporate networks and public business filings.</p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start p-4 rounded-xl border border-[#d6c9b8] bg-[#faf6f0]">
                      <Activity size={24} className="text-emerald-600 shrink-0" />
                      <div>
                        <h4 className="text-[14px] font-bold text-[#3b2a23]">SMTP Verified Datasets</h4>
                        <p className="text-[13px] text-[#8b6f5a] mt-1 font-medium">All communication records are pinged to ensure active server reception prior to final export.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailsTab === 'preview' && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[14px] font-bold text-[#3b2a23]">Data Preview (Masked)</h3>
                    <span className="text-[12px] font-bold text-[#8b6f5a] bg-[#faf6f0] px-3 py-1 rounded-full border border-[#d6c9b8] flex items-center gap-1.5"><Lock size={12}/> Locked Preview</span>
                  </div>
                  
                  <div className="border border-[#d6c9b8] rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left whitespace-nowrap">
                      <thead className="bg-[#faf6f0] border-b border-[#d6c9b8]">
                        <tr>
                          <th className="px-5 py-3 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Name</th>
                          <th className="px-5 py-3 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Title</th>
                          <th className="px-5 py-3 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Company</th>
                          <th className="px-5 py-3 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Contact</th>
                        </tr>
                      </thead>
                      <tbody className="text-[13px] font-medium text-[#3b2a23] divide-y divide-[#d6c9b8]/50">
                        <tr className="hover:bg-[#f5efe6]/50">
                          <td className="px-5 py-3.5">Sarah M***</td>
                          <td className="px-5 py-3.5">VP Marketing</td>
                          <td className="px-5 py-3.5">Acme Corp</td>
                          <td className="px-5 py-3.5 font-mono text-[#8b6f5a]">s***@acme.com</td>
                        </tr>
                        <tr className="hover:bg-[#f5efe6]/50">
                          <td className="px-5 py-3.5">James R***</td>
                          <td className="px-5 py-3.5">Director of Sales</td>
                          <td className="px-5 py-3.5">TechFlow</td>
                          <td className="px-5 py-3.5 font-mono text-[#8b6f5a]">j***@techflow.io</td>
                        </tr>
                        <tr className="hover:bg-[#f5efe6]/50">
                          <td className="px-5 py-3.5">Elena T***</td>
                          <td className="px-5 py-3.5">CEO</td>
                          <td className="px-5 py-3.5">GlobalLink</td>
                          <td className="px-5 py-3.5 font-mono text-[#8b6f5a]">e***@globallink.net</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="p-6 bg-white border-t border-[#d6c9b8] flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
              <div>
                <p className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest mb-1">Total Value</p>
                <p className="text-[24px] font-mono font-bold text-[#3b2a23] tracking-tight">£{selectedPackage.price.toFixed(2)}</p>
              </div>

              <button 
                onClick={handleAddToCart}
                disabled={isAdding}
                className={`px-8 py-3.5 rounded-lg text-[14px] font-bold transition-all shadow-md flex items-center gap-2 ${
                  isAdding 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-[#8b6f5a] hover:bg-[#6c5544] text-white'
                }`}
              >
                {isAdding ? (
                  <span className="flex items-center gap-2"><Check size={18} /> Added to Cart</span>
                ) : (
                  <span className="flex items-center gap-2"><ShoppingCart size={18} /> Add to Cart</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default BrowseLeads;