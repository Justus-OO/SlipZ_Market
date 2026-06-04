import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { 
  Search, Filter, Download, Users, 
  Database as DatabaseIcon, MoreHorizontal, 
  ArrowRight, Mail, Phone, Zap, X, FolderPlus,
  CheckCircle2, Folder, Check, Loader2,
  LogOut, CreditCard, ChevronDown, User as UserIcon
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // --- AUTH & USER STATE ---
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('slipz_user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [stats, setStats] = useState(null); 
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // --- DASHBOARD STATE ---
  const [activeTab, setActiveTab] = useState('My Lists');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLists, setSelectedLists] = useState([]);
  const [lists, setLists] = useState([]);
  const [exportHistory, setExportHistory] = useState([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);

  // --- MODAL STATES ---
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderLoading, setFolderLoading] = useState(false);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('slipz_token');
    localStorage.removeItem('slipz_user');
    navigate('/auth');
  }, [navigate]);
  
  // --- INITIALIZATION & API FETCHING ---
  useEffect(() => {
    const token = localStorage.getItem('slipz_token');
    
    if (!token) {
      navigate('/auth'); 
      return;
    } 

    const fetchDashboardData = async () => {
      try {
        // 1. Fetch User Stats (Credits & Info)
        const statsRes = await axios.get(`${API_URL}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(statsRes.data.data);
        setUser(prev => (prev ? { ...prev, ...statsRes.data.data } : statsRes.data.data));

        // 2. Fetch User's Lists
        const listsRes = await axios.get(`${API_URL}/dashboard/lists`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLists(listsRes.data.data);

        // 3. Fetch Export History
        const historyRes = await axios.get(`${API_URL}/dashboard/export-history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setExportHistory(historyRes.data.data);

      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        if (error.response?.status === 401) handleLogout(); 
      } finally {
        setIsLoadingLists(false);
      }
    };

    fetchDashboardData();
  }, [navigate, handleLogout]);

  // Handle clicking outside profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredLists = useMemo(() => {
    return lists.filter(list => 
      list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      list.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [lists, searchQuery]);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedLists(filteredLists.map(list => list.id));
    else setSelectedLists([]);
  };

  const handleSelectRow = (id) => {
    setSelectedLists(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  // --- GENERATE MOCK DATA ---
  const handleGenerateMockList = async () => {
    setIsLoadingLists(true);
    const token = localStorage.getItem('slipz_token');
    try {
      await axios.post(`${API_URL}/dashboard/lists/mock`, {}, { headers: { Authorization: `Bearer ${token}` } });
      const listsRes = await axios.get(`${API_URL}/dashboard/lists`, { headers: { Authorization: `Bearer ${token}` } });
      setLists(listsRes.data.data);
    } catch (error) {
      console.error("Error generating mock list:", error);
      alert("Failed to generate test data. Check your backend console!");
    } finally {
      setIsLoadingLists(false);
    }
  };

  // --- FOLDER CREATION ---
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    setFolderLoading(true);
    const token = localStorage.getItem('slipz_token');

    try {
      await axios.post(`${API_URL}/dashboard/folders`, 
        { name: newFolderName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setIsFolderModalOpen(false);
      setNewFolderName('');
      alert(`Folder "${newFolderName}" created successfully!`);
    } catch (error) {
      console.error("Error creating folder:", error);
      alert(error.response?.data?.error || "Failed to create folder");
    } finally {
      setFolderLoading(false);
    }
  };

  // --- EXPORT LIST ENGINE ---
  const handleExportLists = async (idsToExport) => {
    const token = localStorage.getItem('slipz_token');
    try {
      const res = await axios.post(`${API_URL}/dashboard/lists/export`, 
        { listIds: idsToExport },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const blob = new Blob([res.data.csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", res.data.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const updatedLists = await axios.get(`${API_URL}/dashboard/lists`, { headers: { Authorization: `Bearer ${token}` } });
      const updatedHistory = await axios.get(`${API_URL}/dashboard/export-history`, { headers: { Authorization: `Bearer ${token}` } });
      
      setLists(updatedLists.data.data);
      setExportHistory(updatedHistory.data.data);
      setSelectedLists([]); 
      
    } catch (error) {
      console.error("Export error:", error);
      alert("Export processing failed.");
    }
  };

  if (!user) return null; 

  // --- CALCULATIONS ---
  const creditPercentage = stats 
    ? Math.min((stats.exportCreditsUsed / stats.exportCreditsTotal) * 100, 100) 
    : 0;

  const totalLists = lists.length;
  const totalContactsSaved = lists.reduce((sum, list) => sum + list.count, 0);
  const creditsRemaining = stats ? stats.exportCreditsTotal - stats.exportCreditsUsed : 0;
  const recentExports = exportHistory.slice(0, 4);

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#f9fafb] font-sans selection:bg-[#800000] selection:text-white pb-12">
      
      {/* --- WORKSPACE HEADER --- */}
      <div className="bg-white border-b border-[#d8cdcd] px-0 lg:px-0 pt-8 pb-0 relative z-40">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-6 w-full">
          
          <div className="flex justify-between items-start w-full lg:w-auto">
            <div>
              <h1 className="text-2xl font-bold text-[#2a1b1b] tracking-tight">
                {t('dashboardTitle')}, {user.firstName}
              </h1>
              <p className="text-[14px] text-[#7a6b6b] mt-1">
                Manage your saved lists, enrich contacts, and export leads.
              </p>
            </div>

            <div className="lg:hidden" ref={profileRef}>
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-10 h-10 bg-[#800000] text-white rounded-full flex items-center justify-center font-bold shadow-sm uppercase">
                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-4">
            <div className="bg-[#f5f2f2] border border-[#d8cdcd] rounded-xl p-4 w-full md:w-72 shadow-sm">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider">Export Credits</span>
                <span className="text-[14px] font-bold text-[#2a1b1b]">
                  {stats?.exportCreditsUsed.toLocaleString() || 0} <span className="text-[#7a6b6b] font-medium">/ {stats?.exportCreditsTotal.toLocaleString() || 5000}</span>
                </span>
              </div>
              <div className="w-full h-2 bg-[#e8e2e2] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#800000] rounded-full transition-all duration-1000" 
                  style={{ width: `${creditPercentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-[11px] text-[#7a6b6b] font-medium uppercase tracking-wider">{stats?.planTier || 'Free Trial'}</p>
                <button className="text-[11px] font-bold text-[#800000] hover:text-[#660000] transition-colors">Upgrade Plan</button>
              </div>
            </div>

            <div className="hidden lg:block relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 bg-white border border-[#d8cdcd] hover:bg-[#f5f2f2] p-2 pr-3 rounded-xl transition-colors shadow-sm"
              >
                <div className="w-10 h-10 bg-[#800000] text-white rounded-lg flex items-center justify-center font-bold text-[14px] uppercase">
                  {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                </div>
                <div className="text-left hidden xl:block">
                  <p className="text-[13px] font-bold text-[#2a1b1b] leading-tight">{user.firstName} {user.lastName}</p>
                  <p className="text-[11px] font-medium text-[#7a6b6b] leading-tight">{user.email}</p>
                </div>
                <ChevronDown size={16} className={`text-[#7a6b6b] transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#d8cdcd] rounded-xl shadow-xl py-2 animate-fade-in-up origin-top-right">
                  <div className="px-4 py-2 border-b border-[#e8e2e2] xl:hidden">
                     <p className="text-[13px] font-bold text-[#2a1b1b] truncate">{user.firstName} {user.lastName}</p>
                     <p className="text-[11px] font-medium text-[#7a6b6b] truncate">{user.email}</p>
                  </div>
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#2a1b1b] hover:bg-[#f5f2f2] transition-colors">
                    <UserIcon size={16} className="text-[#7a6b6b]" /> Profile Settings
                  </button>
                  <button onClick={() => { setActiveTab('Billing'); setIsProfileOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#2a1b1b] hover:bg-[#f5f2f2] transition-colors">
                    <CreditCard size={16} className="text-[#7a6b6b]" /> Billing & Plans
                  </button>
                  <div className="h-px bg-[#e8e2e2] my-1" />
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut size={16} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 sm:gap-8 mt-4 overflow-x-auto custom-scrollbar w-full">
          {['Overview', 'My Lists', 'Export History', 'Enrichment Jobs', 'Billing'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedLists([]); }}
              className={`pb-3 text-[14px] font-medium transition-colors relative whitespace-nowrap ${
                activeTab === tab ? 'text-[#800000]' : 'text-[#7a6b6b] hover:text-[#2a1b1b]'
              }`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#800000] rounded-t-full" />}
            </button>
          ))}
        </div>
      </div>

      <div className="px-0 mt-8 w-full flex flex-col gap-6 relative z-10">

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'Overview' && (
          <div className="animate-fade-in flex flex-col gap-6">
            
            {/* --- Metric Cards --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#d8cdcd] rounded-xl p-5 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-[#800000]/10 text-[#800000] rounded-lg flex items-center justify-center"><DatabaseIcon size={16} /></div>
                  <h4 className="text-[13px] font-bold text-[#7a6b6b] uppercase tracking-wider">Total Lists</h4>
                </div>
                <p className="text-3xl font-black text-[#2a1b1b]">{totalLists}</p>
              </div>

              <div className="bg-white border border-[#d8cdcd] rounded-xl p-5 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><Users size={16} /></div>
                  <h4 className="text-[13px] font-bold text-[#7a6b6b] uppercase tracking-wider">Saved Contacts</h4>
                </div>
                <p className="text-3xl font-black text-[#2a1b1b]">{totalContactsSaved.toLocaleString()}</p>
              </div>

              <div className="bg-white border border-[#d8cdcd] rounded-xl p-5 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><Download size={16} /></div>
                  <h4 className="text-[13px] font-bold text-[#7a6b6b] uppercase tracking-wider">Total Exported</h4>
                </div>
                <p className="text-3xl font-black text-[#2a1b1b]">{stats?.exportCreditsUsed.toLocaleString() || 0}</p>
              </div>

              <div className="bg-white border border-[#800000] rounded-xl p-5 shadow-md flex flex-col relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-5"><CreditCard size={100} /></div>
                <div className="flex items-center gap-3 mb-3 relative z-10">
                  <div className="w-8 h-8 bg-[#800000] text-white rounded-lg flex items-center justify-center"><Zap size={16} /></div>
                  <h4 className="text-[13px] font-bold text-[#800000] uppercase tracking-wider">Credits Left</h4>
                </div>
                <p className="text-3xl font-black text-[#2a1b1b] relative z-10">{creditsRemaining.toLocaleString()}</p>
              </div>
            </div>

            {/* --- Bottom Split Section --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Recent Exports */}
              <div className="lg:col-span-2 bg-white border border-[#d8cdcd] rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-[#d8cdcd] flex items-center justify-between">
                  <h3 className="text-[16px] font-bold text-[#2a1b1b]">Recent Exports</h3>
                  <button onClick={() => setActiveTab('Export History')} className="text-[13px] font-bold text-[#800000] hover:text-[#660000]">View All</button>
                </div>
                
                {recentExports.length === 0 ? (
                  <div className="p-10 text-center flex flex-col items-center justify-center">
                    <Download size={32} className="text-[#d8cdcd] mb-3" />
                    <p className="text-[#7a6b6b] text-[13px]">No recent exports found.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#e8e2e2]">
                    {recentExports.map(log => (
                      <div key={log.id} className="p-4 flex items-center justify-between hover:bg-[#f9fafb] transition-colors">
                        <div>
                          <p className="text-[14px] font-bold text-[#2a1b1b] mb-0.5">{log.listName}</p>
                          <p className="text-[12px] text-[#7a6b6b]">{new Date(log.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className="bg-emerald-50 text-emerald-700 text-[12px] font-bold px-3 py-1 rounded-full border border-emerald-200">
                          +{log.recordCount.toLocaleString()} leads
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-[#d8cdcd] rounded-xl shadow-sm p-5">
                <h3 className="text-[16px] font-bold text-[#2a1b1b] mb-4">Quick Actions</h3>
                <div className="flex flex-col gap-3">
                  <button onClick={() => setIsGlobalSearchOpen(true)} className="w-full flex items-center justify-between p-3 rounded-lg border border-[#e8e2e2] hover:border-[#800000] hover:bg-[#800000]/5 transition-all group">
                    <div className="flex items-center gap-3 text-[#2a1b1b]">
                      <Search size={16} className="text-[#7a6b6b] group-hover:text-[#800000]" />
                      <span className="text-[14px] font-bold">Search Database</span>
                    </div>
                    <ArrowRight size={16} className="text-[#d8cdcd] group-hover:text-[#800000] group-hover:translate-x-1 transition-all" />
                  </button>
                  <button onClick={() => setActiveTab('My Lists')} className="w-full flex items-center justify-between p-3 rounded-lg border border-[#e8e2e2] hover:border-[#800000] hover:bg-[#800000]/5 transition-all group">
                    <div className="flex items-center gap-3 text-[#2a1b1b]">
                      <Users size={16} className="text-[#7a6b6b] group-hover:text-[#800000]" />
                      <span className="text-[14px] font-bold">View My Lists</span>
                    </div>
                    <ArrowRight size={16} className="text-[#d8cdcd] group-hover:text-[#800000] group-hover:translate-x-1 transition-all" />
                  </button>
                  <button onClick={() => setIsFolderModalOpen(true)} className="w-full flex items-center justify-between p-3 rounded-lg border border-[#e8e2e2] hover:border-[#800000] hover:bg-[#800000]/5 transition-all group">
                    <div className="flex items-center gap-3 text-[#2a1b1b]">
                      <FolderPlus size={16} className="text-[#7a6b6b] group-hover:text-[#800000]" />
                      <span className="text-[14px] font-bold">Create Folder</span>
                    </div>
                    <ArrowRight size={16} className="text-[#d8cdcd] group-hover:text-[#800000] group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: MY LISTS */}
        {activeTab === 'My Lists' && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div className="bg-white border border-[#d8cdcd] rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#800000]/10 rounded-full flex items-center justify-center shrink-0">
                  <DatabaseIcon size={24} className="text-[#800000]" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-[#2a1b1b]">Build a new lead list</h2>
                  <p className="text-[13px] text-[#7a6b6b]">Search from over 270M+ verified B2B contacts across 190 countries.</p>
                </div>
              </div>
              <button onClick={() => setIsGlobalSearchOpen(true)} className="w-full sm:w-auto whitespace-nowrap bg-[#800000] hover:bg-[#660000] text-white px-5 py-2.5 rounded-lg text-[14px] font-medium transition-colors flex justify-center items-center gap-2 shadow-sm">
                <Search size={16} /> Prospect Search
              </button>
            </div>

            {/* Dynamic Bulk Action Bar */}
            <div className={`bg-white border border-[#800000] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md transition-all duration-300 ${selectedLists.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 hidden'}`}>
              <div className="flex items-center gap-3">
                <span className="bg-[#800000]/10 text-[#800000] text-[12px] font-bold px-3 py-1 rounded-full">
                  {selectedLists.length} Selected
                </span>
                <span className="text-[13px] text-[#2a1b1b] font-medium">Ready for action</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button className="flex-1 sm:flex-none text-[13px] font-bold text-[#2a1b1b] hover:bg-[#f5f2f2] px-4 py-2 border border-[#d8cdcd] rounded-lg bg-white shadow-sm transition-colors">
                  Merge Lists
                </button>
                <button 
                  onClick={() => handleExportLists(selectedLists)}
                  className="flex-1 sm:flex-none text-[13px] font-bold text-white bg-[#800000] hover:bg-[#660000] px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download size={14} /> Export Selected
                </button>
              </div>
            </div>

            {/* Data Table Section */}
            <div className="bg-white border border-[#d8cdcd] rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[#d8cdcd] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a6b6b]" />
                    <input type="text" placeholder="Search lists..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 border border-[#d8cdcd] rounded-lg text-[13px] w-full outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000] transition-all" />
                  </div>
                  <button onClick={() => setIsFilterModalOpen(true)} className="flex items-center gap-2 px-3 py-2 border border-[#d8cdcd] rounded-lg text-[13px] font-medium text-[#2a1b1b] hover:bg-[#f5f2f2] transition-colors">
                    <Filter size={14} /> <span className="hidden sm:inline">Filters</span>
                  </button>
                </div>
                <button onClick={() => setIsFolderModalOpen(true)} className="flex items-center justify-center gap-2 text-[13px] font-medium text-[#800000] hover:text-[#660000] transition-colors">
                  <FolderPlus size={16} /> Create Folder
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-200">
                  <thead>
                    <tr className="bg-[#f9fafb] border-b border-[#d8cdcd]">
                      <th className="w-12 px-4 py-3 text-center">
                        <input type="checkbox" checked={selectedLists.length === filteredLists.length && filteredLists.length > 0} onChange={handleSelectAll} className="rounded border-[#d8cdcd] text-[#800000] focus:ring-[#800000] cursor-pointer" />
                      </th>
                      <th className="px-4 py-3 text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider">List Name</th>
                      <th className="px-4 py-3 text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider">Contacts</th>
                      <th className="px-4 py-3 text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider">Data Types</th>
                      <th className="px-4 py-3 text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider">Date Created</th>
                      <th className="px-4 py-3 text-center text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e2e2]">
                    {isLoadingLists ? (
                      <tr><td colSpan="7" className="px-4 py-12 text-center"><Loader2 size={24} className="animate-spin text-[#800000] mx-auto mb-2" /><p className="text-[#7a6b6b] text-[13px]">Loading your lists...</p></td></tr>
                    ) : filteredLists.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <DatabaseIcon size={40} className="text-[#d8cdcd] mb-3" />
                            <h3 className="text-[16px] font-bold text-[#2a1b1b] mb-1">No lists found</h3>
                            <p className="text-[13px] text-[#7a6b6b] mb-4">{searchQuery ? `No results matching "${searchQuery}"` : "You haven't built any lead lists yet."}</p>
                            {!searchQuery && (
                              <button onClick={handleGenerateMockList} className="bg-white border border-[#d8cdcd] text-[#2a1b1b] hover:bg-[#f5f2f2] px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm transition-colors">
                                + Generate Test List
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredLists.map((list) => {
                        const isSelected = selectedLists.includes(list.id);
                        return (
                          <tr key={list.id} className={`transition-colors group ${isSelected ? 'bg-[#f5f2f2]' : 'hover:bg-[#f5f2f2]'}`}>
                            <td className="px-4 py-4 text-center"><input type="checkbox" checked={isSelected} onChange={() => handleSelectRow(list.id)} className="rounded border-[#d8cdcd] text-[#800000] focus:ring-[#800000] cursor-pointer" /></td>
                            <td className="px-4 py-4"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-white border border-[#d8cdcd]' : 'bg-[#e8e2e2]'} text-[#2a1b1b]`}><Users size={16} /></div><span className="text-[14px] font-bold text-[#2a1b1b] cursor-pointer hover:text-[#800000]">{list.name}</span></div></td>
                            <td className="px-4 py-4"><span className="text-[14px] font-medium text-[#2a1b1b]">{list.count.toLocaleString()}</span></td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1.5 text-[#7a6b6b]">
                                {list.type.includes('Email') && <Mail size={14} title="Emails Included" />}
                                {list.type.includes('Phone') && <Phone size={14} title="Phones Included" />}
                                {list.type === 'Full Profile' && <DatabaseIcon size={14} title="Full Profiles" />}
                                <span className="text-[13px] ml-1">{list.type}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                list.status === 'Ready to Export' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                list.status === 'Enriching...' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                list.status === 'Exported' ? 'bg-[#800000]/10 text-[#800000] border border-[#800000]/20' : 'bg-white text-[#7a6b6b] border border-[#d8cdcd]'
                              }`}>
                                {list.status === 'Enriching...' && <Zap size={10} className="animate-pulse" />}
                                {list.status === 'Ready to Export' && <CheckCircle2 size={10} />}
                                {list.status}
                              </span>
                            </td>
                            <td className="px-4 py-4"><span className="text-[13px] text-[#7a6b6b]">{list.date}</span></td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleExportLists([list.id])} className="p-1.5 text-[#7a6b6b] hover:text-[#800000] hover:bg-[#800000]/10 rounded transition-colors" title="Export CSV"><Download size={16} /></button>
                                <button className="p-1.5 text-[#7a6b6b] hover:text-[#2a1b1b] hover:bg-[#e8e2e2] rounded transition-colors" title="More Options"><MoreHorizontal size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-[#d8cdcd] bg-[#f9fafb] flex items-center justify-between">
                <span className="text-[13px] text-[#7a6b6b]">Showing {filteredLists.length} of {lists.length} lists</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EXPORT HISTORY */}
        {activeTab === 'Export History' && (
          <div className="animate-fade-in bg-white border border-[#d8cdcd] rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#d8cdcd] bg-white">
              <h3 className="text-[16px] font-bold text-[#2a1b1b]">Your Export Downloads</h3>
            </div>
            {exportHistory.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <Download size={48} className="text-[#d8cdcd] mb-4" />
                <p className="text-[#7a6b6b] text-sm">You haven't initiated any file downloads yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f9fafb] border-b border-[#d8cdcd]">
                      <th className="px-6 py-3 text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider">Target Campaign List</th>
                      <th className="px-6 py-3 text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider">Leads Exported</th>
                      <th className="px-6 py-3 text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e2e2]">
                    {exportHistory.map((log) => (
                      <tr key={log.id} className="hover:bg-[#f9fafb]">
                        <td className="px-6 py-4 text-[14px] font-bold text-[#2a1b1b]">{log.listName}</td>
                        <td className="px-6 py-4 text-[14px] text-emerald-700 font-semibold">+{log.recordCount.toLocaleString()} leads</td>
                        <td className="px-6 py-4 text-[13px] text-[#7a6b6b]">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ENRICHMENT JOBS */}
        {activeTab === 'Enrichment Jobs' && (
          <div className="animate-fade-in bg-white border border-[#d8cdcd] rounded-xl p-12 shadow-sm flex flex-col items-center justify-center text-center">
             <Zap size={48} className="text-[#d8cdcd] mb-4" />
             <h3 className="text-lg font-bold text-[#2a1b1b]">No records found</h3>
             <p className="text-[#7a6b6b] text-sm max-w-md mt-2">You haven't initiated any enrichment jobs yet.</p>
          </div>
        )}

        {/* TAB 5: BILLING */}
        {activeTab === 'Billing' && (
          <div className="animate-fade-in bg-white border border-[#d8cdcd] rounded-xl p-12 shadow-sm flex flex-col items-center justify-center text-center">
             <CreditCard size={48} className="text-[#d8cdcd] mb-4" />
             <h3 className="text-lg font-bold text-[#2a1b1b]">Subscription & Billing</h3>
             <p className="text-[#7a6b6b] text-sm max-w-md mt-2">Manage your current plan, view invoice history, and purchase additional export credits via Stripe.</p>
             <button className="mt-6 bg-[#2a1b1b] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-black transition-colors">
               Manage Billing
             </button>
          </div>
        )}

      </div>

      {/* MODALS */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#2a1b1b]/40 backdrop-blur-sm animate-fade-in" onClick={() => setIsFilterModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col animate-fade-in-up">
            <div className="flex items-center justify-between p-5 border-b border-[#e8e2e2]">
              <h3 className="text-[16px] font-bold text-[#2a1b1b] flex items-center gap-2"><Filter size={16} className="text-[#800000]"/> Filter Lists</h3>
              <button onClick={() => setIsFilterModalOpen(false)} className="text-[#7a6b6b] hover:text-[#2a1b1b] transition-colors bg-[#f5f2f2] p-1.5 rounded-md"><X size={16} /></button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider">Status</label>
                <select className="w-full bg-white border border-[#d8cdcd] rounded-lg px-3 py-2.5 text-[14px] font-medium text-[#2a1b1b] outline-none focus:border-[#800000]">
                  <option>All Statuses</option>
                  <option>Ready to Export</option>
                  <option>Enriching...</option>
                  <option>Exported</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider">Data Type</label>
                <select className="w-full bg-white border border-[#d8cdcd] rounded-lg px-3 py-2.5 text-[14px] font-medium text-[#2a1b1b] outline-none focus:border-[#800000]">
                  <option>All Types</option>
                  <option>Email & Phone</option>
                  <option>Email Only</option>
                  <option>Full Profile</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-[#e8e2e2] bg-[#f9fafb] flex gap-3">
              <button onClick={() => setIsFilterModalOpen(false)} className="flex-1 py-2 text-[13px] font-bold text-[#7a6b6b] bg-white border border-[#d8cdcd] hover:bg-[#f5f2f2] transition-colors rounded-lg shadow-sm">Clear</button>
              <button onClick={() => setIsFilterModalOpen(false)} className="flex-2 bg-[#800000] hover:bg-[#660000] text-white py-2 rounded-lg text-[13px] font-bold shadow-sm transition-colors">Apply</button>
            </div>
          </div>
        </div>
      )}

      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#2a1b1b]/40 backdrop-blur-sm animate-fade-in" onClick={() => setIsFolderModalOpen(false)} />
          <form onSubmit={handleCreateFolder} className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-6">
              <div className="w-12 h-12 bg-[#800000]/10 rounded-full flex items-center justify-center mb-4"><Folder size={24} className="text-[#800000]" /></div>
              <h3 className="text-xl font-bold text-[#2a1b1b] mb-1">Create new folder</h3>
              <p className="text-[13px] text-[#7a6b6b] mb-5">Organize your saved lists into specific campaigns or territories.</p>
              <input type="text" autoFocus placeholder="e.g., Q4 Enterprise Outreach" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="w-full px-4 py-3 border border-[#d8cdcd] rounded-lg text-[14px] font-medium outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000] transition-all" required />
            </div>
            <div className="p-5 border-t border-[#e8e2e2] bg-[#f9fafb] flex gap-3 justify-end">
              <button type="button" onClick={() => setIsFolderModalOpen(false)} className="px-5 py-2 text-[13px] font-bold text-[#7a6b6b] hover:text-[#2a1b1b] transition-colors">Cancel</button>
              <button type="submit" disabled={folderLoading} className="bg-[#2a1b1b] hover:bg-[#1a1010] text-white px-5 py-2 rounded-lg text-[13px] font-bold shadow-sm transition-colors flex items-center gap-2">
                {folderLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save Folder
              </button>
            </div>
          </form>
        </div>
      )}

      {isGlobalSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 sm:p-10">
          <div className="absolute inset-0 bg-[#2a1b1b]/80 backdrop-blur-sm animate-fade-in" onClick={() => setIsGlobalSearchOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-6xl h-[85vh] shadow-2xl overflow-hidden flex flex-col animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e2e2] bg-[#f9fafb]">
              <div className="flex items-center gap-3">
                <Search size={20} className="text-[#800000]" />
                <h3 className="text-[16px] font-bold text-[#2a1b1b]">Advanced Prospecting</h3>
              </div>
              <button onClick={() => setIsGlobalSearchOpen(false)} className="text-[#7a6b6b] hover:text-[#2a1b1b] bg-[#e8e2e2] hover:bg-[#d8cdcd] p-1.5 rounded-md transition-colors"><X size={18} /></button>
            </div>
            <div className="flex flex-1 overflow-hidden">
              <div className="w-72 border-r border-[#e8e2e2] bg-white overflow-y-auto p-5 flex flex-col gap-6">
                <div>
                  <label className="text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider mb-2 block">Job Titles</label>
                  <input type="text" placeholder="e.g. Chief Marketing Officer" className="w-full px-3 py-2 border border-[#d8cdcd] rounded-lg text-[13px] outline-none focus:border-[#800000]" />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider mb-2 block">Industry</label>
                  <select className="w-full px-3 py-2 border border-[#d8cdcd] rounded-lg text-[13px] outline-none focus:border-[#800000]">
                    <option>Software Development</option>
                    <option>Financial Services</option>
                    <option>Healthcare</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider mb-2 block">Location</label>
                  <input type="text" placeholder="e.g. United States, London" className="w-full px-3 py-2 border border-[#d8cdcd] rounded-lg text-[13px] outline-none focus:border-[#800000]" />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider mb-2 block">Company Size</label>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" className="w-full px-3 py-2 border border-[#d8cdcd] rounded-lg text-[13px] outline-none focus:border-[#800000]" />
                    <input type="number" placeholder="Max" className="w-full px-3 py-2 border border-[#d8cdcd] rounded-lg text-[13px] outline-none focus:border-[#800000]" />
                  </div>
                </div>
                <button className="w-full bg-[#2a1b1b] text-white py-2.5 rounded-lg text-[13px] font-bold shadow-sm hover:bg-black transition-colors mt-auto">
                  Apply Filters
                </button>
              </div>
              <div className="flex-1 bg-[#f9fafb] flex flex-col items-center justify-center p-10 text-center">
                 <div className="w-20 h-20 bg-white border border-[#d8cdcd] rounded-full flex items-center justify-center mb-6 shadow-sm">
                   <Users size={32} className="text-[#800000]" />
                 </div>
                 <h2 className="text-xl font-bold text-[#2a1b1b] mb-2">270,000,000+ Contacts</h2>
                 <p className="text-[14px] text-[#7a6b6b] max-w-md">Use the filters on the left to narrow down your ideal customer profile. Once you build a list, you can save it to your dashboard.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;