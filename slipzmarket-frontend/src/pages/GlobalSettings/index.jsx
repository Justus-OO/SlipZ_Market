import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { 
  Settings, CreditCard, Database, ShieldCheck, 
  Save, CheckCircle2, AlertTriangle, RefreshCw, 
  Globe, Key, ToggleLeft, ToggleRight, Trash2,
  Loader2, Percent, Mail, Palette, Image as ImageIcon, Code, Plus
} from 'lucide-react';

const GlobalSettings = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isProcessingData, setIsProcessingData] = useState(null);

  // Master Configuration State
  const [config, setConfig] = useState({
    platformName: 'SlipZMarket B2B',
    supportEmail: '',
    primaryColor: '#800000',
    logoUrl: '',
    maintenanceMode: false,
    defaultRegion: 'UK & Europe',
    gateway: 'Stripe',
    currency: 'GBP (£)',
    processingFee: 4.50,
    publicKey: '',
    secretKey: '',
    require2FA: true,
    sessionTimeout: '60',
  });

  // Dynamic Key-Value Pairs State
  const [customVariables, setCustomVariables] = useState([]);
  const toastTimerRef = useRef(null);

  const getAuthConfig = () => ({
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('slipz_token')}` 
    }
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  // 1. STRICT INITIAL FETCH
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get(`${API_URL}/settings`, getAuthConfig());
        const dbData = response.data.data || response.data;
        
        if (dbData) {
          setConfig(prev => ({ ...prev, ...dbData }));
          
          if (dbData.customVariables) {
            // Handle both stringified JSON and actual JSON objects
            const parsedVars = typeof dbData.customVariables === 'string' 
              ? JSON.parse(dbData.customVariables) 
              : dbData.customVariables;
              
            const formattedVars = Object.entries(parsedVars).map(([key, value]) => ({ key, value }));
            setCustomVariables(formattedVars);
          }
        }
      } catch (err) {
        console.error("Fetch Settings Error:", err);
        showToast(err.response?.data?.message || 'Failed to load settings from database.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // 2. STRICT SAVE HANDLER
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Clean up empty variables before sending
    const dynamicVarsObject = customVariables.reduce((acc, curr) => {
      if (curr.key && curr.key.trim() !== '') {
        acc[curr.key.trim()] = curr.value;
      }
      return acc;
    }, {});

    // Ensure processing fee is a float so Prisma doesn't crash
    const payload = { 
      ...config, 
      processingFee: parseFloat(config.processingFee) || 0,
      customVariables: dynamicVarsObject 
    };

    try {
      const response = await axios.put(`${API_URL}/settings`, payload, getAuthConfig());
      
      // Explicitly check for successful HTTP status
      if (response.status === 200 || response.status === 201) {
        showToast('Configuration securely saved to database!', 'success');
        
        // Force UI to sync with exactly what the database returned
        const confirmedData = response.data.data || response.data;
        if (confirmedData) {
           setConfig(prev => ({ ...prev, ...confirmedData }));
        }
      } else {
        throw new Error("Unexpected server response");
      }
    } catch (err) {
      console.error("Save Settings Error:", err);
      // Extract deep API error messages if they exist
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save settings.';
      showToast(errorMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 3. STRICT DATA ENGINE HANDLER
  const handleDataReset = async (action) => {
    if (!window.confirm(`DANGER: Are you absolutely sure you want to execute: ${action}? This action will permanently delete data.`)) return;
    
    setIsProcessingData(action);
    try {
      const response = await axios.post(`${API_URL}/settings/data-engine`, { action }, getAuthConfig());
      
      if (response.status === 200 || response.status === 201) {
        showToast(`${action} successfully executed on database.`, 'success');
      } else {
        throw new Error("Server failed to confirm execution.");
      }
    } catch (err) {
      console.error("Data Engine Error:", err);
      const errorMsg = err.response?.data?.message || err.message || `${action} failed.`;
      showToast(errorMsg, 'error');
    } finally {
      setIsProcessingData(null);
    }
  };

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const addVariable = () => setCustomVariables([...customVariables, { key: '', value: '' }]);
  const updateVariable = (index, field, value) => {
    const newVars = [...customVariables];
    newVars[index][field] = value;
    setCustomVariables(newVars);
  };
  const removeVariable = (index) => setCustomVariables(customVariables.filter((_, i) => i !== index));

  // --- RENDERERS ---
  const renderGeneralSettings = () => (
    <div className="animate-in fade-in flex flex-col gap-8">
        <div className="flex flex-col gap-2 border-b border-theme pb-4">
          <h3 className="text-[18px] font-bold text-primary flex items-center gap-2">
            <Globe size={20} className="text-accent" /> General Branding
          </h3>
          <p className="text-[13px] text-muted font-medium">Update the core identity, visual aesthetics, and global states.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-bold text-muted uppercase tracking-widest">Platform Name</label>
          <input 
            type="text" value={config.platformName} onChange={(e) => handleChange('platformName', e.target.value)}
            className="w-full bg-surface border border-theme rounded-xl px-4 py-3 text-[14px] font-bold text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-bold text-muted uppercase tracking-widest flex items-center gap-1.5"><Mail size={14}/> Support Email</label>
          <input 
            type="email" value={config.supportEmail} onChange={(e) => handleChange('supportEmail', e.target.value)}
            className="w-full bg-surface border border-theme rounded-xl px-4 py-3 text-[14px] font-medium text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-bold text-muted uppercase tracking-widest flex items-center gap-1.5"><Palette size={14}/> Primary Brand Color</label>
          <div className="flex items-center gap-3">
            <input 
              type="color" value={config.primaryColor} onChange={(e) => handleChange('primaryColor', e.target.value)}
              className="w-12 h-12 rounded cursor-pointer border-0 p-0"
            />
            <input 
              type="text" value={config.primaryColor} onChange={(e) => handleChange('primaryColor', e.target.value)}
              className="flex-1 bg-surface border border-theme rounded-xl px-4 py-3 text-[14px] font-mono font-bold text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-bold text-[#8b6f5a] uppercase tracking-widest flex items-center gap-1.5"><ImageIcon size={14}/> Logo URL (Remote)</label>
          <input 
            type="url" value={config.logoUrl} onChange={(e) => handleChange('logoUrl', e.target.value)} placeholder="https://..."
            className="w-full bg-white border border-[#d6c9b8] rounded-xl px-4 py-3 text-[14px] font-medium text-[#3b2a23] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000] transition-all"
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="text-[12px] font-bold text-muted uppercase tracking-widest">Default Compliance Region</label>
          <select 
            value={config.defaultRegion} onChange={(e) => handleChange('defaultRegion', e.target.value)}
            className="w-full bg-surface border border-theme rounded-xl px-4 py-3 text-[14px] font-medium text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          >
            <option>UK & Europe (GDPR)</option>
            <option>United States (CCPA)</option>
            <option>Global (Strict)</option>
          </select>
        </div>
      </div>

      <div className="mt-4 p-5 bg-surface border border-theme rounded-xl flex items-center justify-between shadow-sm">
        <div>
          <h4 className="text-[14px] font-bold text-primary">Maintenance Mode</h4>
          <p className="text-[12px] text-muted mt-0.5">Disable access to the storefront for non-admin users instantly.</p>
        </div>
        <button 
          type="button" onClick={() => handleChange('maintenanceMode', !config.maintenanceMode)}
          className={`transition-colors ${config.maintenanceMode ? 'text-amber-600' : 'text-muted hover:text-accent'}`}
        >
          {config.maintenanceMode ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
        </button>
      </div>
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="animate-in fade-in flex flex-col gap-8">
      <div className="flex flex-col gap-2 border-b border-[#d6c9b8] pb-4">
        <h3 className="text-[18px] font-bold text-[#3b2a23] flex items-center gap-2">
          <Code size={20} className="text-[#800000]" /> Dynamic Variables
        </h3>
        <p className="text-[13px] text-[#8b6f5a] font-medium">Create unlimited custom settings (e.g., API limits, holiday messages, tax rates) without changing code.</p>
      </div>

      <div className="flex flex-col gap-3">
        {customVariables.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed border-[#d6c9b8] rounded-xl bg-[#faf6f0]">
            <p className="text-[14px] text-[#8b6f5a] font-medium">No custom variables defined yet.</p>
          </div>
        ) : (
          customVariables.map((variable, index) => (
            <div key={index} className="flex flex-col sm:flex-row items-center gap-3 bg-[#faf6f0] p-3 rounded-xl border border-[#d6c9b8]">
              <input 
                type="text" placeholder="Variable Key (e.g., maxCartItems)" value={variable.key}
                onChange={(e) => updateVariable(index, 'key', e.target.value)}
                className="w-full sm:w-1/3 bg-white border border-[#d6c9b8] rounded-lg px-4 py-2.5 text-[13px] font-mono font-bold text-[#3b2a23] outline-none focus:border-[#800000] focus:ring-1"
              />
              <input 
                type="text" placeholder="Value" value={variable.value}
                onChange={(e) => updateVariable(index, 'value', e.target.value)}
                className="w-full sm:flex-1 bg-white border border-[#d6c9b8] rounded-lg px-4 py-2.5 text-[13px] font-medium text-[#3b2a23] outline-none focus:border-[#800000] focus:ring-1"
              />
              <button 
                type="button" onClick={() => removeVariable(index)}
                className="p-2.5 text-[#8b6f5a] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove Variable"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}

        <button 
          type="button" onClick={addVariable}
          className="mt-2 flex items-center justify-center gap-2 w-full border-2 border-dashed border-[#800000]/30 hover:border-[#800000] bg-white text-[#800000] py-3 rounded-xl text-[14px] font-bold transition-all"
        >
          <Plus size={16} /> Add New Variable
        </button>
      </div>
    </div>
  );

  const renderPaymentSettings = () => (
    <div className="animate-in fade-in flex flex-col gap-8">
      <div className="flex flex-col gap-2 border-b border-[#d6c9b8] pb-4">
        <h3 className="text-[18px] font-bold text-[#3b2a23] flex items-center gap-2">
          <CreditCard size={20} className="text-[#800000]" /> Billing & Gateway
        </h3>
        <p className="text-[13px] text-[#8b6f5a] font-medium">Configure transaction fees, currencies, and API keys for the checkout module.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-bold text-[#8b6f5a] uppercase tracking-widest">Active Gateway</label>
          <select 
            value={config.gateway} onChange={(e) => handleChange('gateway', e.target.value)}
            className="w-full bg-white border border-[#d6c9b8] rounded-xl px-4 py-3 text-[14px] font-medium text-[#3b2a23] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]"
          >
            <option>Stripe</option>
            <option>PayPal Braintree</option>
            <option>Adyen</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-bold text-[#8b6f5a] uppercase tracking-widest">Store Currency</label>
          <select 
            value={config.currency} onChange={(e) => handleChange('currency', e.target.value)}
            className="w-full bg-white border border-[#d6c9b8] rounded-xl px-4 py-3 text-[14px] font-medium text-[#3b2a23] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]"
          >
            <option>GBP (£)</option>
            <option>USD ($)</option>
            <option>EUR (€)</option>
          </select>
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="text-[12px] font-bold text-[#8b6f5a] uppercase tracking-widest flex items-center gap-1.5"><Percent size={14}/> Processing Fee</label>
          <input 
            type="number" step="0.01" value={config.processingFee} onChange={(e) => handleChange('processingFee', e.target.value)}
            className="w-full bg-white border border-[#d6c9b8] rounded-xl px-4 py-3 text-[14px] font-mono font-bold text-[#3b2a23] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]"
          />
        </div>
      </div>

      <div className="p-6 bg-[#faf6f0] border border-[#d6c9b8] rounded-xl flex flex-col gap-5 shadow-sm">
        <h4 className="text-[13px] font-bold text-[#3b2a23] uppercase tracking-widest flex items-center gap-2"><Key size={16} className="text-[#800000]" /> API Credentials</h4>
        
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Publishable Key</label>
          <input 
            type="text" value={config.publicKey} onChange={(e) => handleChange('publicKey', e.target.value)}
            className="w-full bg-white border border-[#d6c9b8] rounded-lg px-4 py-2.5 text-[13px] font-mono text-[#3b2a23] outline-none focus:border-[#800000] focus:ring-1"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Secret Key</label>
          <input 
            type="password" value={config.secretKey} onChange={(e) => handleChange('secretKey', e.target.value)}
            className="w-full bg-white border border-[#d6c9b8] rounded-lg px-4 py-2.5 text-[13px] font-mono text-[#3b2a23] outline-none focus:border-[#800000] focus:ring-1"
          />
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="animate-in fade-in flex flex-col gap-8">
      <div className="flex flex-col gap-2 border-b border-[#d6c9b8] pb-4">
        <h3 className="text-[18px] font-bold text-[#3b2a23] flex items-center gap-2">
          <ShieldCheck size={20} className="text-[#800000]" /> Security & Access
        </h3>
        <p className="text-[13px] text-[#8b6f5a] font-medium">Manage authentication requirements and session limits.</p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="p-5 bg-white border border-[#d6c9b8] rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <h4 className="text-[14px] font-bold text-[#3b2a23]">Enforce 2FA Globally</h4>
            <p className="text-[12px] text-[#8b6f5a] mt-0.5">Require all workspace admins to use two-factor authentication.</p>
          </div>
          <button 
            type="button" onClick={() => handleChange('require2FA', !config.require2FA)}
            className={`transition-colors ${config.require2FA ? 'text-emerald-600' : 'text-[#d6c9b8] hover:text-[#800000]'}`}
          >
            {config.require2FA ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-bold text-[#8b6f5a] uppercase tracking-widest">Session Timeout (Minutes)</label>
          <input 
            type="number" value={config.sessionTimeout} onChange={(e) => handleChange('sessionTimeout', e.target.value)}
            className="w-full max-w-xs bg-white border border-[#d6c9b8] rounded-xl px-4 py-3 text-[14px] font-mono font-bold text-[#3b2a23] outline-none focus:border-[#800000] focus:ring-1"
          />
        </div>
      </div>
    </div>
  );

  const renderMockDataEngine = () => (
    <div className="animate-in fade-in flex flex-col gap-8">
      <div className="flex flex-col gap-2 border-b border-[#d6c9b8] pb-4">
        <h3 className="text-[18px] font-bold text-[#3b2a23] flex items-center gap-2">
          <Database size={20} className="text-[#800000]" /> Mock Data Engine
        </h3>
        <p className="text-[13px] text-[#8b6f5a] font-medium">Danger Zone. Hard reset the simulated databases across the application.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="p-5 bg-white border border-[#d6c9b8] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-[#800000] transition-colors group">
          <div>
            <h4 className="text-[14px] font-bold text-[#3b2a23]">Reset Lead Packages</h4>
            <p className="text-[12px] text-[#8b6f5a] mt-0.5">Restores the Browse Leads directory back to initial mock datasets.</p>
          </div>
          <button 
            type="button" onClick={() => handleDataReset('Reset Lead Packages')} disabled={isProcessingData !== null}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#faf6f0] border border-[#d6c9b8] group-hover:bg-[#800000] group-hover:text-white group-hover:border-[#800000] text-[#3b2a23] text-[13px] font-bold rounded-lg transition-colors w-full sm:w-auto"
          >
            {isProcessingData === 'Reset Lead Packages' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Reset Leads
          </button>
        </div>

        <div className="p-5 bg-white border border-[#d6c9b8] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-red-300 transition-colors group">
          <div>
            <h4 className="text-[14px] font-bold text-[#3b2a23]">Purge Order History</h4>
            <p className="text-[12px] text-[#8b6f5a] mt-0.5">Deletes all generated invoices and transaction records.</p>
          </div>
          <button 
            type="button" onClick={() => handleDataReset('Purge Order History')} disabled={isProcessingData !== null}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 group-hover:bg-red-600 group-hover:text-white group-hover:border-red-600 text-red-700 text-[13px] font-bold rounded-lg transition-colors w-full sm:w-auto"
          >
            {isProcessingData === 'Purge Order History' ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Purge History
          </button>
        </div>

        <div className="p-5 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <h4 className="text-[14px] font-bold text-red-900 flex items-center gap-2"><AlertTriangle size={16} /> Factory Reset</h4>
            <p className="text-[12px] text-red-700 mt-0.5">Wipes all custom settings and mock data, returning the app to initial state.</p>
          </div>
          <button 
            type="button" onClick={() => handleDataReset('Factory Reset')} disabled={isProcessingData !== null}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[13px] font-bold rounded-lg transition-colors w-full sm:w-auto shadow-sm"
          >
            {isProcessingData === 'Factory Reset' ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />} Nuke System
          </button>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f5efe6]"><Loader2 className="w-8 h-8 animate-spin text-[#800000]" /></div>;
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#f5efe6] font-sans pb-16 selection:bg-[#800000] selection:text-white relative">
      <div className="bg-white border-b border-[#d6c9b8] px-0 md:px-0 py-6 sticky top-0 z-30 shadow-sm shadow-[#3b2a23]/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
          <div>
            <h1 className="text-2xl font-bold text-[#3b2a23] tracking-tight">{t('globalSettingsTitle')}</h1>
            <p className="text-[14px] text-[#8b6f5a] font-medium mt-1">{t('globalSettingsSubtitle')}</p>
          </div>
          <button 
            onClick={handleSave} disabled={isSaving}
            className="flex items-center justify-center gap-2 bg-[#800000] hover:bg-[#660000] text-white px-6 py-2.5 rounded-lg shadow-md text-[14px] font-bold transition-all disabled:opacity-70 w-full md:w-auto"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Saving...' : t('saveConfiguration')}
          </button>
        </div>
      </div>

      <div className="px-0 mt-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-3 flex flex-col gap-2 sticky top-32">
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-colors w-full text-left ${activeTab === 'general' ? 'bg-white border border-[#d6c9b8] text-[#3b2a23] shadow-sm' : 'text-[#8b6f5a] hover:bg-white/50 hover:text-[#3b2a23] border border-transparent'}`}
          >
            <Settings size={18} className={activeTab === 'general' ? 'text-[#800000]' : 'opacity-70'} /> {t('generalBranding')}
          </button>
          <button 
            onClick={() => setActiveTab('advanced')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-colors w-full text-left ${activeTab === 'advanced' ? 'bg-white border border-[#d6c9b8] text-[#3b2a23] shadow-sm' : 'text-[#8b6f5a] hover:bg-white/50 hover:text-[#3b2a23] border border-transparent'}`}
          >
            <Code size={18} className={activeTab === 'advanced' ? 'text-[#800000]' : 'opacity-70'} /> {t('advancedVariables')}
          </button>
          <button 
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-colors w-full text-left ${activeTab === 'payments' ? 'bg-white border border-[#d6c9b8] text-[#3b2a23] shadow-sm' : 'text-[#8b6f5a] hover:bg-white/50 hover:text-[#3b2a23] border border-transparent'}`}
          >
            <CreditCard size={18} className={activeTab === 'payments' ? 'text-[#800000]' : 'opacity-70'} /> {t('paymentsApi')}
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-colors w-full text-left ${activeTab === 'security' ? 'bg-white border border-[#d6c9b8] text-[#3b2a23] shadow-sm' : 'text-[#8b6f5a] hover:bg-white/50 hover:text-[#3b2a23] border border-transparent'}`}
          >
            <ShieldCheck size={18} className={activeTab === 'security' ? 'text-[#800000]' : 'opacity-70'} /> {t('securityTab')}
          </button>
          
          <div className="h-px w-full bg-[#d6c9b8] my-2 opacity-50" />
          
          <button 
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-colors w-full text-left ${activeTab === 'data' ? 'bg-[#faf6f0] border border-[#d6c9b8] text-[#3b2a23] shadow-sm' : 'text-[#8b6f5a] hover:bg-[#faf6f0] hover:text-[#3b2a23] border border-transparent'}`}
          >
            <Database size={18} className={activeTab === 'data' ? 'text-[#800000]' : 'opacity-70'} /> {t('mockDataEngine')}
          </button>
        </div>

        <div className="lg:col-span-9 bg-white border border-[#d6c9b8] rounded-2xl shadow-sm p-8 min-h-125">
          {activeTab === 'general' && renderGeneralSettings()}
          {activeTab === 'advanced' && renderAdvancedSettings()}
          {activeTab === 'payments' && renderPaymentSettings()}
          {activeTab === 'security' && renderSecuritySettings()}
          {activeTab === 'data' && renderMockDataEngine()}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-10 right-10 z-80 bg-[#2a1b1b] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 border border-[#4a3b3b]">
          {toast.type === 'error' ? <AlertTriangle size={20} className="text-red-400" /> : <CheckCircle2 size={20} className="text-emerald-400" />}
          <p className="text-[14px] font-bold">{toast.msg}</p>
        </div>
      )}
    </div>
  );
};

export default GlobalSettings;