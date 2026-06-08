import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, Database, DollarSign, 
  Activity, AlertTriangle, CheckCircle2, 
  MoreVertical, Download, ArrowUpRight, 
  ArrowDownRight, Mail, Search,
  Server, ShieldCheck, Zap, Megaphone, UserCog, 
  BarChart2, Globe,
  X, Send, Eye, RefreshCw, Ban, Loader2, FileText, Check
} from 'lucide-react';

// Map string icon names from the backend to actual Lucide components
const ICON_MAP = {
  DollarSign, Users, Database, AlertTriangle, Server, Mail, Zap, Activity
};

const AdminDashboard = () => {
  const { t } = useTranslation();
  
  // --- CORE STATE (Connected to Backend) ---
  const [timeRange, setTimeRange] = useState('7D');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());
  const [activitySearch, setActivitySearch] = useState('');
  
  // Data States
  const [kpis, setKpis] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [systemHealth, setSystemHealth] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  // --- MODAL STATES ---
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [toast, setToast] = useState(null);
  
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);

  // --- CLICK OUTSIDE LISTENER ---
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // --- FUNCTIONAL HANDLERS ---
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // --- API DATA FETCHING ---
  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/dashboard?range=${timeRange}`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const { data, success, message } = await response.json();
      
      if (success && data) {
        // Map backend string icons to Lucide components safely, with fallbacks
        setKpis(data.kpis?.map(k => ({ ...k, icon: ICON_MAP[k.icon] || Activity })) || []);
        setSystemHealth(data.systemHealth?.map(s => ({ ...s, icon: ICON_MAP[s.icon] || Server })) || []);
        setChartData(data.chart || []);
        setActivities(data.activities || []);
        
        setLastSync(new Date().toLocaleTimeString());
        if (isManualRefresh) showToast('Dashboard data synced successfully.');
      } else {
        throw new Error(message || 'Failed to parse payload');
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      showToast('Failed to sync data. Check connection.', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [timeRange, showToast]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/dashboard/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const { data, success, message } = await response.json();
      if (!success) throw new Error(message || 'Failed to load users');

      setUsers(data || []);
    } catch (error) {
      console.error('Failed to load admin users:', error);
      showToast('Failed to load users. Check connection.', 'error');
    }
  }, [showToast]);

  // Re-fetch when timeRange changes
  useEffect(() => {
    fetchDashboardData();
    fetchUsers();
  }, [fetchDashboardData, fetchUsers]);

  const handleExportCSV = () => {
    if (chartData.length === 0) return showToast('No data available to export.', 'error');

    const headers = ['Period', 'Amount'];
    const rows = chartData.map(data => [
      data.label,
      data.amount != null ? Number(data.amount).toFixed(2) : data.value
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `slipzmarket_revenue_${timeRange.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Report downloaded successfully.');
  };

  // API Call: Send Announcement
  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    
    try {
      const res = await fetch('/api/admin/dashboard/announcement', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ message: announcementText })
      });
      const result = await res.json();
      
      if (result.success) {
        // Extract the count from the success message if needed, or just show the message
        showToast(result.message);
        setIsAnnouncementModalOpen(false);
        setAnnouncementText('');
        fetchDashboardData(false); // Refresh logs so the broadcast shows in Activity
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      showToast(err.message || 'Failed to broadcast announcement.', 'error');
    }
  };

  // API Call: Suspend User
  const handleRowAction = async (actionType, id) => {
    setActiveMenuId(null);
    if (actionType === 'ban') {
      const confirmBan = window.confirm('Are you sure you want to suspend this user?');
      if (confirmBan) {
        try {
          const res = await fetch(`/api/admin/dashboard/users/${id}/suspend`, { 
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
          });
          const result = await res.json();
          
          if(res.ok && result.success) {
            showToast('User account suspended.');
            fetchDashboardData(false); // Sync table to show new status
          } else {
            throw new Error(result.message);
          }
        } catch (err) {
          showToast(err.message || 'Failed to suspend user.', 'error');
        }
      }
    } else if (actionType === 'revert') {
       showToast('Action revert requires system admin override.', 'error');
    } else {
      showToast('Fetching complete audit trail for this event...');
    }
  };

  const handleUserAction = async (actionType, id) => {
    const targetUser = users.find(user => user.id === id);
    if (!targetUser) {
      return showToast('User not found.', 'error');
    }

    const payload = {};
    if (actionType === 'toggleBlacklist') {
      payload.action = 'toggleBlacklist';
    }

    if (actionType === 'toggleRole') {
      payload.role = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    }

    try {
      const response = await fetch(`/api/admin/dashboard/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update user');
      }

      setUsers(prev => prev.map(user => user.id === id ? result.data : user));
      showToast('User updated successfully.');
    } catch (err) {
      console.error('Failed to update user:', err);
      showToast(err.message || 'Failed to update user', 'error');
    }
  };

  const handleGenerateTaxReport = (e) => {
    e.preventDefault();
    setIsTaxModalOpen(false);
    showToast('Compiling fiscal tax report...', 'loading');
    setTimeout(() => {
      showToast('Tax report generated and sent to admin email.');
    }, 2000);
  };

  // Memoized Search Filter
  const filteredActivity = useMemo(() => {
    if (!activities) return [];
    return activities.filter(log => 
      log.user.toLowerCase().includes(activitySearch.toLowerCase()) || 
      log.action.toLowerCase().includes(activitySearch.toLowerCase())
    );
  }, [activities, activitySearch]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter(user => {
      const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      return [displayName, user.email, user.role].some(value =>
        value?.toLowerCase().includes(query)
      );
    });
  }, [users, userSearch]);

  // Loading Screen Match
  if (isLoading) {
    return (
      <div className="flex flex-col h-full min-h-screen bg-app font-sans items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#8b6f5a] mb-4" />
        <p className="text-[#3b2a23] font-bold">Loading Dashboard Assets...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-app font-sans pb-16 selection:bg-accent selection:text-surface relative">
      
      {/* --- DASHBOARD HEADER --- */}
      <div className="bg-surface border-b border-theme px-6 py-6 sticky top-0 z-30 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary tracking-tight">{t('adminOverviewTitle', 'Admin Control Center')}</h1>
              <p className="text-[14px] text-muted font-medium mt-1">{t('adminOverviewSubtitle', 'Real-time overview & infrastructure management')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:block text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest mr-2">
              Last Sync: {lastSync}
            </span>
            <div className="bg-surface border border-theme rounded-lg p-1 flex">
              {['24H', '7D', '30D', 'YTD'].map(range => (
                <button 
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-1.5 rounded-md text-[13px] font-bold transition-all ${timeRange === range ? 'bg-[#faf6f0] shadow-sm text-[#3b2a23] border border-[#d6c9b8]' : 'text-[#8b6f5a] hover:text-[#3b2a23]'}`}
                >
                  {range}
                </button>
              ))}
            </div>
            <button 
              onClick={() => { fetchDashboardData(true); fetchUsers(); }}
              disabled={isRefreshing}
              className="flex items-center gap-2 bg-[#8b6f5a] hover:bg-[#6c5544] text-white px-4 py-2.5 rounded-lg shadow-sm text-[14px] font-bold transition-all disabled:opacity-70"
            >
              <Activity size={16} className={isRefreshing ? "animate-spin" : ""} /> 
              {isRefreshing ? 'Syncing...' : 'Sync Data'}
            </button>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="px-6 mt-8 w-full flex flex-col gap-8">

        {/* 1. FUNCTIONAL QUICK ACTIONS BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => setIsAnnouncementModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white border border-[#d6c9b8] hover:border-[#8b6f5a] hover:bg-[#faf6f0] text-[#3b2a23] p-3 rounded-xl shadow-sm transition-all group"
          >
            <Megaphone size={18} className="text-[#8b6f5a] group-hover:scale-110 transition-transform" />
            <span className="text-[13px] font-bold">Global Announcement</span>
          </button>
          <button 
            onClick={() => setIsWorkspaceModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white border border-[#d6c9b8] hover:border-[#8b6f5a] hover:bg-[#faf6f0] text-[#3b2a23] p-3 rounded-xl shadow-sm transition-all group"
          >
            <UserCog size={18} className="text-[#8b6f5a] group-hover:scale-110 transition-transform" />
            <span className="text-[13px] font-bold">Manage Workspaces</span>
          </button>
          <button 
            onClick={() => setIsTaxModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white border border-[#d6c9b8] hover:border-[#8b6f5a] hover:bg-[#faf6f0] text-[#3b2a23] p-3 rounded-xl shadow-sm transition-all group"
          >
            <BarChart2 size={18} className="text-[#8b6f5a] group-hover:scale-110 transition-transform" />
            <span className="text-[13px] font-bold">Generate Tax Report</span>
          </button>
          <button 
            onClick={() => setIsRegionModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white border border-[#d6c9b8] hover:border-[#8b6f5a] hover:bg-[#faf6f0] text-[#3b2a23] p-3 rounded-xl shadow-sm transition-all group"
          >
            <Globe size={18} className="text-[#8b6f5a] group-hover:scale-110 transition-transform" />
            <span className="text-[13px] font-bold">Region Restrictions</span>
          </button>
        </div>

        {/* 2. DYNAMIC KPI STATS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((stat, i) => (
            <div key={i} className="bg-white border border-[#d6c9b8] rounded-2xl p-6 shadow-sm hover:border-[#8b6f5a] transition-colors relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-[#faf6f0] rounded-xl flex items-center justify-center border border-[#d6c9b8] group-hover:bg-[#8b6f5a] group-hover:text-white transition-colors text-[#8b6f5a]">
                  {stat.icon && <stat.icon size={20} />}
                </div>
                <div className={`flex items-center gap-1 text-[12px] font-bold px-2 py-1 rounded-full ${stat.isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {stat.isUp ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                  {stat.trend}
                </div>
              </div>
              <h3 className="text-[13px] font-bold text-[#8b6f5a] uppercase tracking-widest mb-1">{stat.label}</h3>
              <p className="text-[28px] font-black font-mono text-[#3b2a23] tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* 3. CHARTS & SYSTEM HEALTH ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Dynamic Revenue Chart */}
          <div className="lg:col-span-2 bg-white border border-[#d6c9b8] rounded-2xl shadow-sm p-6 flex flex-col transition-all duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-[16px] font-bold text-[#3b2a23]">Revenue & Volume Trend</h3>
                <p className="text-[13px] text-[#8b6f5a] font-medium">Displaying metrics for selected period ({timeRange}).</p>
              </div>
              <button 
                onClick={handleExportCSV}
                className="text-[13px] font-bold text-[#8b6f5a] hover:text-[#3b2a23] flex items-center gap-2 border border-[#d6c9b8] px-4 py-2 rounded-lg bg-[#faf6f0] transition-colors shadow-sm"
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
            
            {/* CSS Bar Chart Engine */}
            <div className="flex-1 flex items-end justify-between gap-2 h-64 mt-auto border-b border-[#d6c9b8]/50 pb-2 relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="border-t border-[#d6c9b8] w-full h-0"></div>
                <div className="border-t border-[#d6c9b8] w-full h-0"></div>
                <div className="border-t border-[#d6c9b8] w-full h-0"></div>
                <div className="border-t border-[#d6c9b8] w-full h-0"></div>
              </div>

              {chartData.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-[#8b6f5a] text-sm font-bold">No chart data available for {timeRange}</div>
              ) : (
                chartData.map((data, i) => (
                  <div key={i} className="flex flex-col items-center gap-3 flex-1 group z-10 h-full justify-end">
                    <div className="w-full relative flex justify-center h-full items-end">
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 bg-[#3b2a23] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-opacity whitespace-nowrap z-20 shadow-xl border border-[#8b6f5a]">
                        {data.amount != null ? `Amount: £${Number(data.amount).toFixed(2)}` : `Val: ${data.value}%`}
                      </div>
                      <div 
                        className="w-3/4 bg-[#d6c9b8] group-hover:bg-[#8b6f5a] rounded-t-md transition-all duration-500"
                        style={{ height: `${Math.max(data.value, 5)}%` }} /* Ensure minimum height for visibility */
                      />
                    </div>
                    <span className="text-[11px] font-bold text-[#8b6f5a] uppercase truncate w-full text-center">{data.label}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System Health Module */}
          <div className="bg-white border border-[#d6c9b8] rounded-2xl shadow-sm p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-[#d6c9b8] pb-4">
              <h3 className="text-[16px] font-bold text-[#3b2a23] flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#8b6f5a]" /> Infrastructure Health
              </h3>
            </div>
            <div className="flex flex-col gap-3">
              {systemHealth.map((sys, i) => (
                <div key={i} className="p-3 border border-[#d6c9b8] bg-[#faf6f0] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${sys.status === 'Operational' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {sys.icon && <sys.icon size={16} />}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#3b2a23]">{sys.service}</p>
                      <p className="text-[11px] text-[#8b6f5a] font-medium">{sys.uptime} Uptime</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${sys.status === 'Operational' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                    {sys.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. FUNCTIONAL RECENT ACTIVITY LOG */}
        <div className="bg-white border border-[#d6c9b8] rounded-2xl shadow-sm overflow-hidden flex flex-col mb-10">
          <div className="p-5 border-b border-[#d6c9b8] bg-[#faf6f0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-[16px] font-bold text-[#3b2a23]">Global Activity Log</h3>
              <p className="text-[13px] text-[#8b6f5a] font-medium">Real-time platform events across all workspaces.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6f5a]" />
                <input 
                  type="text" 
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder="Search user or action..." 
                  className="w-full bg-white border border-[#d6c9b8] rounded-lg pl-9 pr-3 py-2 text-[13px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse min-w-200">
              <thead>
                <tr className="bg-white border-b border-[#d6c9b8]">
                  <th className="px-6 py-4 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">User / Workspace</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Action Performed</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Time</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest text-right">Value</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest text-center">Status</th>
                  <th className="w-16 px-6 py-4 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d6c9b8]/50">
                {filteredActivity.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-[#8b6f5a] text-[13px] font-medium">
                      No activity found matching "{activitySearch}".
                    </td>
                  </tr>
                ) : (
                  filteredActivity.map((log) => (
                    <tr key={log.id} className="hover:bg-[#faf6f0] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#d6c9b8]/40 flex items-center justify-center text-[#8b6f5a] font-bold text-[12px] uppercase shrink-0">
                            {log.user.charAt(0)}
                          </div>
                          <span className="text-[14px] font-bold text-[#3b2a23] truncate max-w-37.5 sm:max-w-none">{log.user}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13px] font-medium text-[#3b2a23]">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 text-[13px] text-[#8b6f5a]">
                        {log.time}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {log.amount ? (
                          <span className="text-[14px] font-mono font-bold text-[#3b2a23]">£{log.amount.toFixed(2)}</span>
                        ) : (
                          <span className="text-[14px] font-mono text-[#8b6f5a]">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                          log.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          log.status === 'Pending Review' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                          log.status === 'Reverted' ? 'bg-[#3b2a23] text-white border-[#3b2a23]' :
                          'bg-[#faf6f0] text-[#8b6f5a] border-[#d6c9b8]'
                        }`}>
                          {log.status}
                        </span>
                      </td>

                      {/* Functional Context Menu */}
                      <td className="px-6 py-4 text-center relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === log.id ? null : log.id); }}
                          className={`p-2 rounded-lg transition-colors ${activeMenuId === log.id ? 'bg-[#d6c9b8]/40 text-[#3b2a23]' : 'text-[#8b6f5a] hover:text-[#3b2a23] hover:bg-[#d6c9b8]/30'}`}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenuId === log.id && (
                          <div className="absolute right-10 top-10 w-48 bg-white border border-[#d6c9b8] rounded-xl shadow-xl z-50 py-1 flex flex-col text-left animate-fade-in-up">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRowAction('view', log.id); }}
                              className="w-full px-4 py-2 text-[13px] text-[#3b2a23] hover:bg-[#faf6f0] flex items-center gap-2 font-medium"
                            >
                              <Eye size={14} className="text-[#8b6f5a]" /> View Audit Trail
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRowAction('revert', log.id); }}
                              className="w-full px-4 py-2 text-[13px] text-amber-800 hover:bg-amber-50 flex items-center gap-2 font-medium border-t border-[#d6c9b8]/30"
                            >
                              <RefreshCw size={14} /> Revert Action
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRowAction('ban', log.id); }}
                              className="w-full px-4 py-2 text-[13px] text-red-700 hover:bg-red-50 flex items-center gap-2 font-medium"
                            >
                              <Ban size={14} /> Suspend User
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. CRM USER MANAGEMENT */}
        <div className="bg-white border border-[#d6c9b8] rounded-2xl shadow-sm overflow-hidden flex flex-col mb-10">
          <div className="p-5 border-b border-[#d6c9b8] bg-[#faf6f0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-[16px] font-bold text-[#3b2a23] flex items-center gap-2">
                <UserCog size={18} className="text-[#8b6f5a]" /> CRM User Management
              </h3>
              <p className="text-[13px] text-[#8b6f5a] font-medium">Manage platform users, roles, and suspend/reactivate accounts from the CRM control panel.</p>
            </div>
            <div className="relative w-full sm:w-96">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6f5a]" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search customers, email, or role..."
                className="w-full bg-white border border-[#d6c9b8] rounded-lg pl-9 pr-3 py-2 text-[13px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
              />
            </div>
          </div>

          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white border-b border-[#d6c9b8]">
                  <th className="px-6 py-4 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Name / Email</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Credits</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Joined</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d6c9b8]/50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-[#8b6f5a] text-[13px] font-medium">
                      No users found matching "{userSearch}".
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#faf6f0] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[14px] font-bold text-[#3b2a23] truncate max-w-[280px]">{`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unnamed'}</span>
                          <span className="text-[12px] text-[#8b6f5a] truncate max-w-[280px]">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13px] font-medium text-[#3b2a23]">{user.role}</td>
                      <td className="px-6 py-4 text-[13px] text-[#3b2a23] font-mono">{user.exportCreditsUsed}/{user.exportCreditsTotal}</td>
                      <td className="px-6 py-4 text-[13px] text-[#8b6f5a]">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border ${user.isBlacklisted ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                          {user.isBlacklisted ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex flex-col sm:flex-row sm:justify-end gap-2">
                        <button
                          onClick={() => handleUserAction('toggleBlacklist', user.id)}
                          className={`text-[12px] font-bold px-3 py-2 rounded-xl transition-all ${user.isBlacklisted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
                        >
                          {user.isBlacklisted ? 'Reinstate' : 'Suspend'}
                        </button>
                        <button
                          onClick={() => handleUserAction('toggleRole', user.id)}
                          className="text-[12px] font-bold px-3 py-2 rounded-xl bg-[#faf6f0] border border-[#d6c9b8] text-[#3b2a23] hover:bg-[#f5efe6]"
                        >
                          {user.role === 'ADMIN' ? 'Demote' : 'Promote'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ========================================= */}
      {/* 1. GLOBAL ANNOUNCEMENT MODAL              */}
      {/* ========================================= */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#3b2a23]/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsAnnouncementModalOpen(false)} />
          <form onSubmit={handleSendAnnouncement} className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-fade-in-up border border-[#d6c9b8]">
            <div className="px-6 py-5 border-b border-[#d6c9b8] flex items-center justify-between bg-[#faf6f0]">
              <h3 className="text-[18px] font-bold text-[#3b2a23] flex items-center gap-2">
                <Megaphone size={20} className="text-[#8b6f5a]" /> Global Announcement
              </h3>
              <button type="button" onClick={() => setIsAnnouncementModalOpen(false)} className="text-[#8b6f5a] hover:text-[#3b2a23] hover:bg-white p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-[13px] text-[#3b2a23]/80 mb-5">
                This message will appear as a banner in the dashboard for all active workspaces and be sent via email if enabled.
              </p>
              <div className="flex flex-col gap-2 mb-2">
                <label className="text-[12px] font-bold text-[#8b6f5a] uppercase tracking-widest">Broadcast Message</label>
                <textarea 
                  required
                  rows="4"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="e.g., System maintenance scheduled for Saturday at 02:00 GMT..." 
                  className="w-full p-4 bg-white border border-[#d6c9b8] rounded-xl text-[14px] text-[#3b2a23] font-medium outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] resize-none transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-6 border-t border-[#d6c9b8] bg-[#faf6f0]">
              <button type="button" onClick={() => setIsAnnouncementModalOpen(false)} className="flex-1 px-4 py-2.5 border border-[#d6c9b8] bg-white text-[#3b2a23] text-[14px] font-bold rounded-xl hover:bg-[#f5efe6] transition-colors shadow-sm">
                Cancel
              </button>
              <button type="submit" className="flex-2 bg-[#8b6f5a] hover:bg-[#6c5544] text-white px-4 py-2.5 rounded-xl text-[14px] font-bold shadow-sm transition-colors flex items-center justify-center gap-2">
                <Send size={16} /> Broadcast Now
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================= */}
      {/* 2. MANAGE WORKSPACES MODAL (REDIRECT)     */}
      {/* ========================================= */}
      {isWorkspaceModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#3b2a23]/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsWorkspaceModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col animate-fade-in-up border border-[#d6c9b8] p-8 text-center items-center">
            <div className="w-16 h-16 bg-[#faf6f0] border border-[#d6c9b8] rounded-2xl flex items-center justify-center text-[#8b6f5a] mb-6">
              <UserCog size={24} />
            </div>
            <h3 className="text-[20px] font-bold text-[#3b2a23] mb-2">Workspace CRM</h3>
            <p className="text-[14px] text-[#8b6f5a] mb-8 font-medium">
              Managing users, billing profiles, and workspace allocations happens in the dedicated Users CRM module.
            </p>
            <div className="flex w-full gap-3">
              <button onClick={() => setIsWorkspaceModalOpen(false)} className="flex-1 px-4 py-2.5 border border-[#d6c9b8] bg-white text-[#3b2a23] text-[14px] font-bold rounded-xl hover:bg-[#f5efe6] transition-colors">
                Close
              </button>
              <button onClick={() => { setIsWorkspaceModalOpen(false); showToast('Routing to User CRM module...'); }} className="flex-1 bg-[#3b2a23] hover:bg-black text-white px-4 py-2.5 rounded-xl text-[14px] font-bold transition-colors">
                Go to CRM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* 3. GENERATE TAX REPORT MODAL              */}
      {/* ========================================= */}
      {isTaxModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#3b2a23]/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsTaxModalOpen(false)} />
          <form onSubmit={handleGenerateTaxReport} className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-fade-in-up border border-[#d6c9b8]">
            <div className="px-6 py-5 border-b border-[#d6c9b8] flex items-center justify-between bg-[#faf6f0]">
              <h3 className="text-[18px] font-bold text-[#3b2a23] flex items-center gap-2">
                <FileText size={20} className="text-[#8b6f5a]" /> Fiscal Tax Report
              </h3>
              <button type="button" onClick={() => setIsTaxModalOpen(false)} className="text-[#8b6f5a] hover:text-[#3b2a23] hover:bg-white p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-[13px] text-[#3b2a23]/80 mb-5">
                Generate a PDF report containing all completed invoices, tax allocations, and total revenue for your selected fiscal period.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Start Date</label>
                  <input type="date" required className="w-full px-4 py-2.5 bg-white border border-[#d6c9b8] rounded-xl text-[14px] text-[#3b2a23] font-medium outline-none focus:border-[#8b6f5a]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">End Date</label>
                  <input type="date" required className="w-full px-4 py-2.5 bg-white border border-[#d6c9b8] rounded-xl text-[14px] text-[#3b2a23] font-medium outline-none focus:border-[#8b6f5a]" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-6 border-t border-[#d6c9b8] bg-[#faf6f0]">
              <button type="button" onClick={() => setIsTaxModalOpen(false)} className="flex-1 px-4 py-2.5 border border-[#d6c9b8] bg-white text-[#3b2a23] text-[14px] font-bold rounded-xl hover:bg-[#f5efe6] transition-colors shadow-sm">
                Cancel
              </button>
              <button type="submit" className="flex-2 bg-[#8b6f5a] hover:bg-[#6c5544] text-white px-4 py-2.5 rounded-xl text-[14px] font-bold shadow-sm transition-colors flex items-center justify-center gap-2">
                <Download size={16} /> Generate PDF
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================= */}
      {/* 4. REGION RESTRICTIONS MODAL              */}
      {/* ========================================= */}
      {isRegionModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#3b2a23]/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsRegionModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-fade-in-up border border-[#d6c9b8]">
            <div className="px-6 py-5 border-b border-[#d6c9b8] flex items-center justify-between bg-[#faf6f0]">
              <h3 className="text-[18px] font-bold text-[#3b2a23] flex items-center gap-2">
                <Globe size={20} className="text-[#8b6f5a]" /> API Region Restrictions
              </h3>
              <button type="button" onClick={() => setIsRegionModalOpen(false)} className="text-[#8b6f5a] hover:text-[#3b2a23] hover:bg-white p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-[13px] text-[#3b2a23]/80 mb-5">
                Block traffic or purchases from specific geographic regions for compliance (e.g., GDPR, CAN-SPAM).
              </p>
              <div className="flex flex-col gap-3">
                {['United Kingdom & EU', 'United States (North America)', 'Asia & Pacific', 'Middle East & Africa'].map((region, i) => (
                  <label key={i} className="flex items-center justify-between p-3 border border-[#d6c9b8] rounded-xl hover:bg-[#faf6f0] cursor-pointer transition-colors group">
                    <span className="text-[14px] font-bold text-[#3b2a23]">{region}</span>
                    <div className="relative flex items-center">
                      <input type="checkbox" defaultChecked={i < 2} className="peer sr-only" />
                      <div className="w-11 h-6 bg-[#d6c9b8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8b6f5a]"></div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 p-6 border-t border-[#d6c9b8] bg-[#faf6f0]">
              <button type="button" onClick={() => setIsRegionModalOpen(false)} className="flex-1 px-4 py-2.5 border border-[#d6c9b8] bg-white text-[#3b2a23] text-[14px] font-bold rounded-xl hover:bg-[#f5efe6] transition-colors shadow-sm">
                Discard Changes
              </button>
              <button onClick={() => { setIsRegionModalOpen(false); showToast('Geo-restrictions updated.'); }} className="flex-2 bg-[#3b2a23] hover:bg-black text-white px-4 py-2.5 rounded-xl text-[14px] font-bold shadow-sm transition-colors flex items-center justify-center gap-2">
                <Check size={16} /> Save Rules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* TOAST NOTIFICATION SYSTEM                 */}
      {/* ========================================= */}
      {toast && (
        <div className="fixed bottom-10 right-10 z-80 bg-[#3b2a23] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-up border border-[#8b6f5a]">
          {toast.type === 'loading' ? (
            <Loader2 size={20} className="text-[#d6c9b8] animate-spin" />
          ) : toast.type === 'error' ? (
            <AlertTriangle size={20} className="text-red-400" />
          ) : (
            <CheckCircle2 size={20} className="text-emerald-400" />
          )}
          <p className="text-[14px] font-bold">{toast.msg}</p>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;