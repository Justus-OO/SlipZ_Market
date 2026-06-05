import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { 
  Languages, Palette, Code, Mail, Save, 
  CheckCircle2, Globe, Image as ImageIcon, 
  Type, LayoutTemplate, Loader2, X
} from 'lucide-react';

const getAuthConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('slipz_token')}` } });

const SiteCustomization = () => {
  const { t } = useTranslation();
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('localization');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [editingTemplateId, setEditingTemplateId] = useState(null);

  // Master Customization State
  const [config, setConfig] = useState({
    // Localization
    defaultLanguage: 'en-US',
    enabledLanguages: ['en-US', 'en-GB', 'es-ES', 'fr-FR'],
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    
    // Theme & Branding
    primaryColor: '#3b2a23',
    accentColor: '#8b6f5a',
    backgroundColor: '#f5efe6',
    fontFamily: 'Inter, system-ui, sans-serif',
    
    // Custom Scripts
    googleAnalyticsId: 'G-XXXXXXXXXX',
    customHeadCode: '',
    
    // Email Templates
    emailSubject: 'Your Receipt from SlipZMarket',
    emailTemplate: 'Hi {{user_name}},\n\nThank you for your purchase. Your receipt for invoice {{invoice_id}} is attached.\n\nBest,\nThe SlipZMarket Team',

    // System Variables
    customVariables: {}
  });

  // Available Languages Pool
  const availableLanguages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish (ES)' },
    { code: 'fr-FR', name: 'French (FR)' },
    { code: 'de-DE', name: 'German (DE)' },
    { code: 'it-IT', name: 'Italian (IT)' },
  ];

  // --- HANDLERS ---
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_URL}/settings`, getAuthConfig());
        const settings = res.data?.data || res.data || null;
        if (settings) setConfig(prev => ({ ...prev, ...settings }));

        // Fetch available email templates
        const tplRes = await axios.get(`${API_URL}/settings/email-templates`, getAuthConfig());
        const templates = tplRes.data?.data?.templates || tplRes.data?.templates || [];
        setEmailTemplates(templates);
      } catch (err) {
        console.error('Failed to load settings', err);
        showToast('Failed to load settings', 'error');
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await axios.put(`${API_URL}/settings`, config, getAuthConfig());
      showToast('Site customizations published successfully.');
    } catch (err) {
      console.error('Failed saving settings', err);
      showToast('Failed to save changes.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleLanguage = (langCode) => {
    const enabled = config.enabledLanguages || [];
    if (enabled.includes(langCode)) {
      if (langCode === config.defaultLanguage) {
        showToast('Cannot disable the default language.', 'error');
        return;
      }
      setConfig(prev => ({
        ...prev,
        enabledLanguages: (prev.enabledLanguages || []).filter(code => code !== langCode)
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        enabledLanguages: [...(prev.enabledLanguages || []), langCode]
      }));
    }
  };

  // --- TAB RENDERERS ---
  const renderLocalization = () => (
    <div className="animate-fade-in flex flex-col gap-5">
      <div className="flex flex-col gap-1 border-b border-[#d6c9b8] pb-3">
        <h3 className="text-[16px] font-bold text-[#3b2a23] flex items-center gap-2">
          <Languages size={18} className="text-[#8b6f5a]" /> Language & Region
        </h3>
        <p className="text-[13px] text-[#8b6f5a] font-medium">Manage available site languages and regional data formats.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Default Site Language</label>
          <select 
            value={config.defaultLanguage}
            onChange={(e) => handleChange('defaultLanguage', e.target.value)}
            className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2 text-[13px] font-bold text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
          >
            {(config.enabledLanguages || []).map(code => {
              const lang = availableLanguages.find(l => l.code === code);
              return <option key={code} value={code}>{lang?.name || code}</option>;
            })}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">System Timezone</label>
          <select 
            value={config.timezone}
            onChange={(e) => handleChange('timezone', e.target.value)}
            className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2 text-[13px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
          >
            <option value="UTC">UTC (Universal Coordinated Time)</option>
            <option value="GMT">GMT (Greenwich Mean Time)</option>
            <option value="EST">EST (Eastern Standard Time)</option>
            <option value="PST">PST (Pacific Standard Time)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Date Format</label>
          <select 
            value={config.dateFormat}
            onChange={(e) => handleChange('dateFormat', e.target.value)}
            className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2 text-[13px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY (UK/EU Format)</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button onClick={handleSave} className="text-[13px] px-3 py-1 rounded bg-[#8b6f5a] text-white">Publish Changes</button>

          <button onClick={async () => {
            try {
              if (!editingTemplateId) {
                const res = await axios.post(`${API_URL}/settings/email-templates`, { name: (config.emailSubject || 'TEMPLATE').replace(/[^A-Za-z0-9_]/g,'_').slice(0,40), subject: config.emailSubject, htmlContent: config.emailTemplate }, getAuthConfig());
                const tmpl = res.data?.data?.template || res.data?.template || res.data?.template;
                if (tmpl) setEmailTemplates(prev => [tmpl, ...prev]);
                setEditingTemplateId(tmpl?.id || null);
                showToast('Template created');
              } else {
                const res = await axios.put(`${API_URL}/settings/email-templates/${editingTemplateId}`, { name: (config.emailSubject || 'TEMPLATE').replace(/[^A-Za-z0-9_]/g,'_').slice(0,40), subject: config.emailSubject, htmlContent: config.emailTemplate }, getAuthConfig());
                const tmpl = res.data?.data?.template || res.data?.template || res.data?.template;
                if (tmpl) setEmailTemplates(prev => prev.map(t => t.id === tmpl.id ? tmpl : t));
                showToast('Template updated');
              }
            } catch (err) {
              console.error('Template save failed', err);
              showToast('Failed to save template', 'error');
            }
          }} className="text-[13px] px-3 py-1 rounded bg-white border">Save Template</button>

          {editingTemplateId && (
            <button onClick={async () => {
              try {
                await axios.delete(`${API_URL}/settings/email-templates/${editingTemplateId}`, getAuthConfig());
                setEmailTemplates(prev => prev.filter(t => t.id !== editingTemplateId));
                setEditingTemplateId(null);
                handleChange('emailSubject', '');
                handleChange('emailTemplate', '');
                showToast('Template deleted');
              } catch (err) {
                console.error('Delete template failed', err);
                showToast('Failed to delete template', 'error');
              }
            }} className="text-[13px] px-3 py-1 rounded border bg-red-50 text-red-600">Delete Template</button>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-3">
        <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Enabled Languages</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {availableLanguages.map(lang => {
            const enabledList = config.enabledLanguages || [];
            const isEnabled = enabledList.includes(lang.code);
            const isDefault = config.defaultLanguage === lang.code;
            return (
              <div 
                key={lang.code}
                onClick={() => toggleLanguage(lang.code)}
                className={`p-3 border rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                  isEnabled ? 'bg-[#faf6f0] border-[#8b6f5a]' : 'bg-white border-[#d6c9b8] opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex flex-col">
                  <span className={`text-[13px] font-bold ${isEnabled ? 'text-[#3b2a23]' : 'text-[#8b6f5a]'}`}>{lang.name}</span>
                  <span className="text-[11px] font-mono mt-0.5">{lang.code}</span>
                </div>
                {isDefault && <span className="text-[10px] font-bold bg-[#8b6f5a] text-white px-2 py-0.5 rounded uppercase">Default</span>}
                {isEnabled && !isDefault && <CheckCircle2 size={16} className="text-[#8b6f5a]" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderTheme = () => (
    <div className="animate-fade-in flex flex-col gap-5">
      <div className="flex flex-col gap-1 border-b border-[#d6c9b8] pb-3">
        <h3 className="text-[16px] font-bold text-[#3b2a23] flex items-center gap-2">
          <Palette size={18} className="text-[#8b6f5a]" /> Theme & Branding
        </h3>
        <p className="text-[13px] text-[#8b6f5a] font-medium">Customize the visual appearance, colors, and typography.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 items-center p-4 bg-[#faf6f0] border border-[#d6c9b8] rounded-xl">
        <div className="w-16 h-16 bg-white border border-[#d6c9b8] rounded-lg flex items-center justify-center shadow-sm shrink-0">
          <ImageIcon size={24} className="text-[#8b6f5a]" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h4 className="text-[14px] font-bold text-[#3b2a23]">Platform Logo</h4>
          <p className="text-[12px] text-[#8b6f5a] mt-0.5 mb-2">Recommended size: 256x256px (PNG or SVG)</p>
          <button type="button" className="text-[12px] font-bold text-[#3b2a23] bg-white border border-[#d6c9b8] px-3 py-1.5 rounded-md hover:bg-[#f5efe6] transition-colors">
            Upload New Image
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Primary Color</label>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border border-[#d6c9b8]" style={{ backgroundColor: config.primaryColor }} />
            <input 
              type="text" 
              value={config.primaryColor}
              onChange={(e) => handleChange('primaryColor', e.target.value)}
              className="flex-1 bg-white border border-[#d6c9b8] rounded-lg px-3 py-2 text-[13px] font-mono text-[#3b2a23] outline-none focus:border-[#8b6f5a]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Accent Color</label>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border border-[#d6c9b8]" style={{ backgroundColor: config.accentColor }} />
            <input 
              type="text" 
              value={config.accentColor}
              onChange={(e) => handleChange('accentColor', e.target.value)}
              className="flex-1 bg-white border border-[#d6c9b8] rounded-lg px-3 py-2 text-[13px] font-mono text-[#3b2a23] outline-none focus:border-[#8b6f5a]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Background</label>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border border-[#d6c9b8]" style={{ backgroundColor: config.backgroundColor }} />
            <input 
              type="text" 
              value={config.backgroundColor}
              onChange={(e) => handleChange('backgroundColor', e.target.value)}
              className="flex-1 bg-white border border-[#d6c9b8] rounded-lg px-3 py-2 text-[13px] font-mono text-[#3b2a23] outline-none focus:border-[#8b6f5a]"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-2">
        <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest flex items-center gap-1.5"><Type size={14}/> Base Font Family</label>
        <select 
          value={config.fontFamily}
          onChange={(e) => handleChange('fontFamily', e.target.value)}
          className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2 text-[13px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
        >
          <option value="Inter, system-ui, sans-serif">Inter (Modern Sans)</option>
          <option value="Roboto, sans-serif">Roboto (Material)</option>
          <option value="ui-sans-serif, system-ui">System Default</option>
          <option value="ui-monospace, SFMono-Regular">Monospace / Developer</option>
        </select>
      </div>
    </div>
  );

  const renderScripts = () => (
    <div className="animate-fade-in flex flex-col gap-5">
      <div className="flex flex-col gap-1 border-b border-[#d6c9b8] pb-3">
        <h3 className="text-[16px] font-bold text-[#3b2a23] flex items-center gap-2">
          <Code size={18} className="text-[#8b6f5a]" /> Custom Scripts
        </h3>
        <p className="text-[13px] text-[#8b6f5a] font-medium">Inject tracking codes or custom CSS globally into the application.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest flex items-center gap-1.5"><Globe size={12}/> Google Analytics ID</label>
          <input 
            type="text" 
            value={config.googleAnalyticsId}
            onChange={(e) => handleChange('googleAnalyticsId', e.target.value)}
            placeholder="G-XXXXXXXXXX"
            className="w-full max-w-sm bg-white border border-[#d6c9b8] rounded-lg px-3 py-2 text-[13px] font-mono text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest flex items-center gap-1.5"><Code size={12}/> Global &lt;head&gt; Code</label>
          <textarea 
            rows="6"
            value={config.customHeadCode}
            onChange={(e) => handleChange('customHeadCode', e.target.value)}
            placeholder=""
            className="w-full bg-[#3b2a23] text-[#d6c9b8] border border-[#d6c9b8] rounded-xl p-4 text-[13px] font-mono outline-none focus:ring-2 focus:ring-[#8b6f5a] resize-none"
          />
          <p className="text-[11px] text-[#8b6f5a]">This code will be injected before the closing `&lt;/head&gt;` tag on all pages.</p>
        </div>
      </div>
    </div>
  );

  const renderEmails = () => (
    <div className="animate-fade-in flex flex-col gap-5">
      <div className="flex flex-col gap-1 border-b border-[#d6c9b8] pb-3">
        <h3 className="text-[16px] font-bold text-[#3b2a23] flex items-center gap-2">
          <LayoutTemplate size={18} className="text-[#8b6f5a]" /> Email Templates
        </h3>
        <p className="text-[13px] text-[#8b6f5a] font-medium">Customize the automated emails sent to users.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Template</label>
          <div className="flex items-center gap-2">
            <select
              className="w-full max-w-sm bg-white border border-[#d6c9b8] rounded-lg px-3 py-2 text-[13px] font-bold text-[#3b2a23] outline-none focus:border-[#8b6f5a]"
              onChange={(e) => {
                const selected = emailTemplates.find(t => t.id === e.target.value || t.name === e.target.value);
                if (selected) {
                  setEditingTemplateId(selected.id);
                  handleChange('emailSubject', selected.subject || '');
                  handleChange('emailTemplate', selected.htmlContent || '');
                } else {
                  setEditingTemplateId(null);
                  handleChange('emailSubject', '');
                  handleChange('emailTemplate', '');
                }
              }}
              value={editingTemplateId || ''}
            >
              <option value="">(New template)</option>
              {emailTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.subject || t.name}</option>
              ))}
            </select>

            <button onClick={() => {
              setEditingTemplateId(null);
              handleChange('emailSubject', '');
              handleChange('emailTemplate', '');
            }} className="px-2 py-1 bg-white border rounded">New</button>
          </div>
        </div>

        <div className="bg-[#faf6f0] border border-[#d6c9b8] rounded-xl p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Subject Line</label>
            <input 
              type="text" 
              value={config.emailSubject}
              onChange={(e) => handleChange('emailSubject', e.target.value)}
              className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2 text-[13px] font-bold text-[#3b2a23] outline-none focus:border-[#8b6f5a]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Email Body</label>
            <textarea 
              rows="8"
              value={config.emailTemplate}
              onChange={(e) => handleChange('emailTemplate', e.target.value)}
              className="w-full bg-white border border-[#d6c9b8] rounded-lg p-3 text-[13px] font-mono text-[#3b2a23] outline-none focus:border-[#8b6f5a] resize-none"
            />
            <p className="text-[11px] text-[#8b6f5a] mt-1">Available variables: <code className="bg-white px-1 py-0.5 rounded border border-[#d6c9b8]">{`{{user_name}}`}</code> <code className="bg-white px-1 py-0.5 rounded border border-[#d6c9b8]">{`{{invoice_id}}`}</code> <code className="bg-white px-1 py-0.5 rounded border border-[#d6c9b8]">{`{{total_amount}}`}</code></p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemVariables = () => {
    const entries = Object.entries(config.customVariables || {});

    const handleVarChange = (index, field, value) => {
      const arr = entries.map(e => [...e]);
      if (!arr[index]) return;
      if (field === 'key') arr[index][0] = value;
      else arr[index][1] = value;
      const obj = Object.fromEntries(arr.filter(([k]) => k && k.trim() !== ''));
      setConfig(prev => ({ ...prev, customVariables: obj }));
    };

    const addVar = () => {
      const stamp = `NEW_KEY_${Date.now()}`;
      setConfig(prev => ({ ...prev, customVariables: { ...(prev.customVariables || {}), [stamp]: '' } }));
    };

    const removeVar = (index) => {
      const arr = entries.slice();
      if (!arr[index]) return;
      arr.splice(index, 1);
      const obj = Object.fromEntries(arr);
      setConfig(prev => ({ ...prev, customVariables: obj }));
    };

    // 👉 UPDATED: Now loads your specific .env variables, including Gemini
    const loadDefaults = () => {
      const defaults = {

      };
      setConfig(prev => ({ ...prev, customVariables: defaults }));
      showToast('Default variables loaded. Click Publish to save.', 'success');
    };

    return (
      <div className="animate-fade-in flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-bold text-[#3b2a23] flex items-center gap-2"><Globe size={18} className="text-[#8b6f5a]" /> System Variables</h3>
            <p className="text-[13px] text-[#8b6f5a] font-medium">Add, view, or update environment / secret variables stored in site settings.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadDefaults} className="text-[13px] px-3 py-1 rounded bg-white border border-[#d6c9b8] hover:bg-[#faf6f0] transition-colors">Load Defaults</button>
            <button onClick={addVar} className="text-[13px] px-3 py-1 rounded bg-[#8b6f5a] hover:bg-[#6c5544] text-white transition-colors">Add Variable</button>
          </div>
        </div>

        <div className="grid gap-2 mt-4">
          {entries.length === 0 && <p className="text-[13px] text-[#8b6f5a]">No system variables configured.</p>}
          {entries.map(([k, v], i) => (
            <div key={`${k}-${i}`} className="flex gap-2 items-center group">
              <input 
                value={k} 
                onChange={(e) => handleVarChange(i, 'key', e.target.value)} 
                className="w-1/3 bg-white border border-[#d6c9b8] rounded-lg px-3 py-2 text-[13px] font-mono text-[#8b6f5a] outline-none focus:border-[#8b6f5a]" 
                placeholder="KEY_NAME"
              />
              <input 
                value={v} 
                onChange={(e) => handleVarChange(i, 'value', e.target.value)} 
                className="flex-1 bg-white border border-[#d6c9b8] rounded-lg px-3 py-2 text-[13px] font-mono text-[#3b2a23] outline-none focus:border-[#8b6f5a]" 
                placeholder="Value..."
              />
              <button 
                onClick={() => removeVar(i)} 
                className="text-[#a09393] hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                title="Remove Variable"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f5efe6] font-sans pb-8 selection:bg-[#8b6f5a] selection:text-white">
      
      {/* --- HEADER --- */}
      <div className="bg-white border-b border-[#d6c9b8] px-0 lg:px-0 py-4 sticky top-0 z-30 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
          <div>
            <h1 className="text-xl font-bold text-[#3b2a23] tracking-tight">{t('siteCustomizationTitle', 'Site Customization')}</h1>
            <p className="text-[13px] text-[#8b6f5a] font-medium mt-0.5">{t('siteCustomizationSubtitle', 'Manage globals and settings')}</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 bg-[#8b6f5a] hover:bg-[#6c5544] text-white px-5 py-2 rounded-lg shadow-sm text-[13px] font-bold transition-all disabled:opacity-70 w-full md:w-auto"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Publishing...' : t('publishChanges', 'Publish Changes')}
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="px-0 mt-5 w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Sidebar Navigation */}
        <div className="lg:col-span-3 flex flex-col gap-1.5 sticky top-24">
          <button 
            onClick={() => setActiveTab('localization')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-bold transition-colors w-full text-left ${activeTab === 'localization' ? 'bg-white border border-[#d6c9b8] text-[#3b2a23] shadow-sm' : 'text-[#8b6f5a] hover:bg-white/50 hover:text-[#3b2a23] border border-transparent'}`}
          >
            <Languages size={16} className={activeTab === 'localization' ? 'text-[#8b6f5a]' : 'opacity-70'} /> {t('localization', 'Localization')}
          </button>
          <button 
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-bold transition-colors w-full text-left ${activeTab === 'theme' ? 'bg-white border border-[#d6c9b8] text-[#3b2a23] shadow-sm' : 'text-[#8b6f5a] hover:bg-white/50 hover:text-[#3b2a23] border border-transparent'}`}
          >
            <Palette size={16} className={activeTab === 'theme' ? 'text-[#8b6f5a]' : 'opacity-70'} /> {t('themeBrand', 'Theme & Brand')}
          </button>
          <button 
            onClick={() => setActiveTab('scripts')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-bold transition-colors w-full text-left ${activeTab === 'scripts' ? 'bg-white border border-[#d6c9b8] text-[#3b2a23] shadow-sm' : 'text-[#8b6f5a] hover:bg-white/50 hover:text-[#3b2a23] border border-transparent'}`}
          >
            <Code size={16} className={activeTab === 'scripts' ? 'text-[#8b6f5a]' : 'opacity-70'} /> {t('customScripts', 'Custom Scripts')}
          </button>
          <button 
            onClick={() => setActiveTab('emails')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-bold transition-colors w-full text-left ${activeTab === 'emails' ? 'bg-white border border-[#d6c9b8] text-[#3b2a23] shadow-sm' : 'text-[#8b6f5a] hover:bg-white/50 hover:text-[#3b2a23] border border-transparent'}`}
          >
            <Mail size={16} className={activeTab === 'emails' ? 'text-[#8b6f5a]' : 'opacity-70'} /> {t('emailTemplates', 'Email Templates')}
          </button>
          <button 
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-bold transition-colors w-full text-left ${activeTab === 'system' ? 'bg-white border border-[#d6c9b8] text-[#3b2a23] shadow-sm' : 'text-[#8b6f5a] hover:bg-white/50 hover:text-[#3b2a23] border border-transparent'}`}
          >
            <Globe size={16} className={activeTab === 'system' ? 'text-[#8b6f5a]' : 'opacity-70'} /> {t('systemVariables', 'System Variables')}
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9 bg-white border border-[#d6c9b8] rounded-xl shadow-sm p-6 min-h-100">
          {activeTab === 'localization' && renderLocalization()}
          {activeTab === 'theme' && renderTheme()}
          {activeTab === 'scripts' && renderScripts()}
          {activeTab === 'emails' && renderEmails()}
          {activeTab === 'system' && renderSystemVariables()}
        </div>

      </div>

      {/* --- TOAST NOTIFICATION --- */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-80 bg-[#3b2a23] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 animate-fade-in-up border border-[#8b6f5a]">
          {toast.type === 'error' ? <X size={18} className="text-red-400" /> : <CheckCircle2 size={18} className="text-emerald-400" />}
          <p className="text-[13px] font-bold">{toast.msg}</p>
        </div>
      )}

    </div>
  );
};

export default SiteCustomization;