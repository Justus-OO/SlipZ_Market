import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { 
  User, ShieldCheck, Smartphone, 
  Key, Laptop, Bell, LogOut, 
  AlertOctagon, CheckCircle2, ToggleRight, ToggleLeft,
  Building2, CreditCard, ChevronRight, Loader2
} from 'lucide-react';

const Account = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [profile, setProfile] = useState({
    firstName: '', lastName: '', email: '', timezone: '', currency: ''
  });

  const [toggles, setToggles] = useState({
    twoFactor: false, loginAlerts: true, exportAlerts: true, marketingEmails: false
  });

  // Password State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '' });

  const handleLogout = useCallback(() => {
    localStorage.removeItem('slipz_token');
    localStorage.removeItem('slipz_user');
    navigate('/auth');
  }, [navigate]);

  // --- FETCH DATA ---
  useEffect(() => {
    const token = localStorage.getItem('slipz_token');
    if (!token) return navigate('/auth');

    axios.get(`${API_URL}/account/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const data = res.data.data;
        setProfile({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          timezone: data.timezone || 'GMT (London)',
          currency: data.currency || 'GBP (£)'
        });
        setToggles({
          twoFactor: data.twoFactorEnabled,
          loginAlerts: data.loginAlerts,
          exportAlerts: data.exportAlerts,
          marketingEmails: data.marketingEmails
        });
      })
      .catch(err => {
        console.error(err);
        if (err.response?.status === 401) handleLogout();
      })
      .finally(() => setIsLoading(false));
  }, [navigate, handleLogout]);

  const showToast = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  // --- HANDLERS ---
  const handleProfileChange = (e) => {
    setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await axios.put(`${API_URL}/account/profile`, profile, {
        headers: { Authorization: `Bearer ${localStorage.getItem('slipz_token')}` }
      });
      showToast('success', 'Profile updated successfully.');
    } catch {
      showToast('error', 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (key, dbKey) => {
    const newValue = !toggles[key];
    setToggles(prev => ({ ...prev, [key]: newValue }));
    try {
      await axios.put(`${API_URL}/account/settings`, 
        { [dbKey]: newValue }, 
        { headers: { Authorization: `Bearer ${localStorage.getItem('slipz_token')}` } }
      );
    } catch {
      setToggles(prev => ({ ...prev, [key]: !newValue })); // Revert on fail
      showToast('error', 'Failed to save setting.');
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await axios.put(`${API_URL}/account/security/password`, 
        { currentPassword: passwords.current, newPassword: passwords.new },
        { headers: { Authorization: `Bearer ${localStorage.getItem('slipz_token')}` } }
      );
      showToast('success', 'Password updated successfully.');
      setShowPasswordForm(false);
      setPasswords({ current: '', new: '' });
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to update password.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure? This will delete all your data and cannot be undone.")) return;
    try {
      await axios.delete(`${API_URL}/account`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('slipz_token')}` }
      });
      handleLogout();
    } catch {
      showToast('error', 'Failed to delete account.');
    }
  };

  const SETTINGS_TABS = [
    { id: 'profile', label: t('myProfile'), icon: <User size={16} /> },
    { id: 'security', label: t('securityLogin'), icon: <ShieldCheck size={16} /> },
    { id: 'workspace', label: t('workspaceInfo'), icon: <Building2 size={16} /> },
    { id: 'billing', label: t('billingUsage'), icon: <CreditCard size={16} /> },
    { id: 'notifications', label: t('notificationsTab'), icon: <Bell size={16} /> },
  ];

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={32} className="animate-spin text-[#800000]" /></div>;

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#f9fafb] font-sans pb-16 selection:bg-[#800000] selection:text-white">
      
      {/* Toast Notification */}
      {message.text && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 animate-fade-in-up ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertOctagon size={18} />}
          <span className="text-[13px] font-bold">{message.text}</span>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="bg-white border-b border-[#d8cdcd] px-6 lg:px-10 py-8">
        <div className="max-w-300 mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#2a1b1b]">{t('settingsTitle')}</h1>
            <p className="text-[14px] text-[#7a6b6b] mt-1">{t('settingsSubtitle')}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-white border border-[#d8cdcd] text-[#2a1b1b] hover:text-[#800000] hover:bg-[#fff0f0] hover:border-[#800000]/30 px-4 py-2 rounded-lg shadow-sm text-[13px] font-bold transition-all w-fit">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* --- MAIN LAYOUT --- */}
      <div className="flex flex-col md:flex-row gap-8 px-6 lg:px-10 mt-8 max-w-300 mx-auto w-full items-start">
        
        {/* SIDEBAR */}
        <div className="w-full md:w-64 shrink-0 bg-white border border-[#d8cdcd] rounded-xl shadow-sm overflow-hidden flex flex-col">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-between w-full px-4 py-3.5 border-b border-[#e8e2e2] last:border-0 text-[14px] font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-[#f5f2f2] text-[#800000] border-l-2 border-l-[#800000]' 
                  : 'bg-white text-[#2a1b1b] hover:bg-[#f9fafb] border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={activeTab === tab.id ? 'text-[#800000]' : 'text-[#7a6b6b]'}>{tab.icon}</span>
                {tab.label}
              </div>
              <ChevronRight size={14} className={activeTab === tab.id ? 'text-[#800000]' : 'text-transparent'} />
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="flex-1 w-full flex flex-col gap-6">

          {/* === PROFILE TAB === */}
          {activeTab === 'profile' && (
            <div className="animate-fade-in flex flex-col gap-6">
              
              <div className="bg-white border border-[#d8cdcd] rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e8e2e2] bg-[#fcfbfb]">
                  <h2 className="text-[15px] font-bold text-[#2a1b1b]">Personal Information</h2>
                </div>
                
                <div className="p-6 flex flex-col sm:flex-row items-start gap-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-24 h-24 rounded-full border border-[#d8cdcd] overflow-hidden bg-[#f5f2f2]">
                      <img src={`https://ui-avatars.com/api/?name=${profile.firstName}+${profile.lastName}&background=2a1b1b&color=fff&size=128`} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                    <button className="text-[12px] font-bold text-[#7a6b6b] hover:text-[#800000] transition-colors border border-[#d8cdcd] px-3 py-1 rounded bg-white shadow-sm">Change Photo</button>
                  </div>

                  <form onSubmit={saveProfile} className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-bold text-[#2a1b1b]">First Name</label>
                      <input type="text" name="firstName" value={profile.firstName} onChange={handleProfileChange} required className="w-full px-3 py-2.5 border border-[#d8cdcd] rounded-md text-[14px] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-bold text-[#2a1b1b]">Last Name</label>
                      <input type="text" name="lastName" value={profile.lastName} onChange={handleProfileChange} required className="w-full px-3 py-2.5 border border-[#d8cdcd] rounded-md text-[14px] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]" />
                    </div>
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label className="text-[12px] font-bold text-[#2a1b1b]">Email Address</label>
                      <input type="email" value={profile.email} disabled className="w-full px-3 py-2.5 border border-[#d8cdcd] bg-[#f5f2f2] text-[#7a6b6b] rounded-md text-[14px] outline-none" />
                      <p className="text-[11px] text-[#7a6b6b]">To change your login email, please contact Support.</p>
                    </div>
                    
                    {/* Localization Moved into main form for single save button */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-bold text-[#2a1b1b]">Timezone</label>
                      <select name="timezone" value={profile.timezone} onChange={handleProfileChange} className="w-full bg-white border border-[#d8cdcd] rounded-md px-3 py-2.5 text-[14px] text-[#2a1b1b] outline-none focus:border-[#800000]">
                        <option value="GMT (London)">GMT (London)</option>
                        <option value="EST (New York)">EST (New York)</option>
                        <option value="PST (Los Angeles)">PST (Los Angeles)</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-bold text-[#2a1b1b]">Display Currency</label>
                      <select name="currency" value={profile.currency} onChange={handleProfileChange} className="w-full bg-white border border-[#d8cdcd] rounded-md px-3 py-2.5 text-[14px] text-[#2a1b1b] outline-none focus:border-[#800000]">
                        <option value="GBP (£)">GBP (£)</option>
                        <option value="USD ($)">USD ($)</option>
                        <option value="EUR (€)">EUR (€)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 flex justify-end mt-4 pt-4 border-t border-[#e8e2e2]">
                      <button type="submit" disabled={isSaving} className="bg-[#2a1b1b] hover:bg-[#800000] text-white px-5 py-2 rounded-lg text-[13px] font-bold transition-colors shadow-sm flex items-center gap-2">
                        {isSaving ? <><Loader2 size={14} className="animate-spin"/> Saving...</> : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* DANGER ZONE */}
              <div className="border border-red-200 bg-red-50/50 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertOctagon size={20} className="text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-[14px] font-bold text-red-900">Delete Account</h3>
                    <p className="text-[12px] text-red-700 mt-1 max-w-lg">Permanently delete your profile from the workspace. This action cannot be undone.</p>
                  </div>
                </div>
                <button onClick={handleDeleteAccount} className="bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white px-4 py-2 rounded-md text-[12px] font-bold transition-colors shadow-sm shrink-0 whitespace-nowrap">
                  Delete Profile
                </button>
              </div>

            </div>
          )}

          {/* === SECURITY TAB === */}
          {activeTab === 'security' && (
            <div className="animate-fade-in flex flex-col gap-6">
              <div className="bg-white border border-[#d8cdcd] rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e8e2e2] bg-[#fcfbfb]">
                  <h2 className="text-[15px] font-bold text-[#2a1b1b]">Security Settings</h2>
                </div>
                
                <div className="p-6 flex flex-col gap-4">
                  {/* Password */}
                  <div className="flex flex-col border border-[#d8cdcd] rounded-lg bg-white overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4">
                      <div className="flex items-start gap-3 mb-3 sm:mb-0">
                        <div className="w-10 h-10 bg-[#f5f2f2] rounded-lg flex items-center justify-center shrink-0 border border-[#e8e2e2]">
                          <Key size={18} className="text-[#2a1b1b]" />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-[#2a1b1b]">Password</h4>
                          <p className="text-[12px] text-[#7a6b6b] mt-0.5">Ensure your account is using a long, random password.</p>
                        </div>
                      </div>
                      <button onClick={() => setShowPasswordForm(!showPasswordForm)} className="bg-white border border-[#d8cdcd] hover:border-[#2a1b1b] text-[#2a1b1b] px-4 py-2 rounded-md text-[12px] font-bold transition-colors shadow-sm">
                        {showPasswordForm ? 'Cancel' : 'Update Password'}
                      </button>
                    </div>

                    {showPasswordForm && (
                      <form onSubmit={updatePassword} className="p-4 bg-[#f9fafb] border-t border-[#e8e2e2] flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input type="password" placeholder="Current Password" required value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} className="flex-1 px-3 py-2 border border-[#d8cdcd] rounded-md text-[13px] outline-none focus:border-[#800000]" />
                          <input type="password" placeholder="New Password" required value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} className="flex-1 px-3 py-2 border border-[#d8cdcd] rounded-md text-[13px] outline-none focus:border-[#800000]" />
                          <button type="submit" disabled={isSaving} className="bg-[#800000] text-white px-4 py-2 rounded-md text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-70">
                            {isSaving && <Loader2 size={14} className="animate-spin"/>} Save
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* 2FA */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-[#d8cdcd] rounded-lg bg-white">
                    <div className="flex items-start gap-3 mb-3 sm:mb-0">
                      <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0 border border-emerald-100">
                        <Smartphone size={18} className="text-emerald-700" />
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-[#2a1b1b]">Two-Factor Authentication (2FA)</h4>
                        <p className="text-[12px] text-[#7a6b6b] mt-0.5">Protect your account using an authenticator app.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleToggle('twoFactor', 'twoFactorEnabled')}
                      className={`text-[36px] transition-colors ${toggles.twoFactor ? 'text-emerald-600' : 'text-[#d8cdcd]'}`}
                    >
                      {toggles.twoFactor ? <ToggleRight fontSize="inherit" /> : <ToggleLeft fontSize="inherit" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sessions */}
              <div className="bg-white border border-[#d8cdcd] rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e8e2e2] bg-[#fcfbfb]">
                  <h2 className="text-[15px] font-bold text-[#2a1b1b]">Active Sessions</h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between border-b border-[#e8e2e2] pb-4">
                    <div className="flex items-center gap-3">
                      <Laptop size={18} className="text-[#800000]" />
                      <div>
                        <p className="text-[14px] font-bold text-[#2a1b1b]">Current Session</p>
                        <p className="text-[12px] text-[#7a6b6b]">Web Browser • IP Authenticated</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded border border-emerald-200 uppercase tracking-widest">Active Now</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* === NOTIFICATIONS TAB === */}
          {activeTab === 'notifications' && (
            <div className="animate-fade-in bg-white border border-[#d8cdcd] rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#e8e2e2] bg-[#fcfbfb]">
                <h2 className="text-[15px] font-bold text-[#2a1b1b]">Email Notifications</h2>
              </div>
              <div className="p-6 flex flex-col gap-4">
                
                <div className="flex items-center justify-between p-4 border border-[#e8e2e2] rounded-lg hover:bg-[#fcfbfb] transition-colors">
                  <div>
                    <h4 className="text-[14px] font-bold text-[#2a1b1b]">Login Alerts</h4>
                    <p className="text-[12px] text-[#7a6b6b] mt-0.5">Receive an email when a new device signs in.</p>
                  </div>
                  <button onClick={() => handleToggle('loginAlerts', 'loginAlerts')} className={`text-[32px] transition-colors ${toggles.loginAlerts ? 'text-[#800000]' : 'text-[#d8cdcd]'}`}>
                    {toggles.loginAlerts ? <ToggleRight fontSize="inherit" /> : <ToggleLeft fontSize="inherit" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-[#e8e2e2] rounded-lg hover:bg-[#fcfbfb] transition-colors">
                  <div>
                    <h4 className="text-[14px] font-bold text-[#2a1b1b]">Export Completions</h4>
                    <p className="text-[12px] text-[#7a6b6b] mt-0.5">Receive an email with a download link when your CSV is ready.</p>
                  </div>
                  <button onClick={() => handleToggle('exportAlerts', 'exportAlerts')} className={`text-[32px] transition-colors ${toggles.exportAlerts ? 'text-[#800000]' : 'text-[#d8cdcd]'}`}>
                    {toggles.exportAlerts ? <ToggleRight fontSize="inherit" /> : <ToggleLeft fontSize="inherit" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-[#e8e2e2] rounded-lg hover:bg-[#fcfbfb] transition-colors">
                  <div>
                    <h4 className="text-[14px] font-bold text-[#2a1b1b]">Marketing & Promotions</h4>
                    <p className="text-[12px] text-[#7a6b6b] mt-0.5">Updates on new dataset releases and feature announcements.</p>
                  </div>
                  <button onClick={() => handleToggle('marketingEmails', 'marketingEmails')} className={`text-[32px] transition-colors ${toggles.marketingEmails ? 'text-[#800000]' : 'text-[#d8cdcd]'}`}>
                    {toggles.marketingEmails ? <ToggleRight fontSize="inherit" /> : <ToggleLeft fontSize="inherit" />}
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* === WORKSPACE / BILLING === */}
          {(activeTab === 'workspace' || activeTab === 'billing') && (
            <div className="animate-fade-in flex flex-col gap-6">
              <div className="bg-white border border-[#d8cdcd] rounded-xl shadow-sm overflow-hidden p-12 text-center flex flex-col items-center justify-center">
                 <Building2 size={40} className="text-[#d8cdcd] mb-4" />
                 <h2 className="text-[18px] font-bold text-[#2a1b1b]">Workspace Administration</h2>
                 <p className="text-[14px] text-[#7a6b6b] mt-2 max-w-sm">Contact your primary workspace administrator to manage billing methods, update company details, or purchase additional export credits.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Account;