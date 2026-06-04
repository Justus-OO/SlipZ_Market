import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, Users, Database, DollarSign, 
  Activity, AlertTriangle, CheckCircle2, 
  MoreVertical, Download, ArrowUpRight, 
  ArrowDownRight, Calendar, Bell, Mail, Phone,
  Server, ShieldCheck, Zap, Megaphone, UserCog, 
  BarChart2, Globe, Lock, Search, Filter,
  X, Send, Eye, RefreshCw, Ban, Loader2
} from 'lucide-react';

// --- DYNAMIC DATA MAPPINGS ---
const DATA_BY_RANGE = {
  '24H': {
    kpis: [
      { label: 'Revenue (24H)', value: '£4,250.00', trend: '+2.1%', isUp: true, icon: DollarSign },
      { label: 'Active Workspaces', value: '342', trend: '+1.5%', isUp: true, icon: Users },
      { label: 'Datasets Exported', value: '128', trend: '-0.5%', isUp: false, icon: Database },
      { label: 'Support Tickets', value: '2', trend: '0.0%', isUp: true, icon: AlertTriangle },
    ],
    chart: [
      { label: '00:00', value: 20 }, { label: '04:00', value: 15 }, 
      { label: '08:00', value: 45 }, { label: '12:00', value: 80 }, 
      { label: '16:00', value: 65 }, { label: '20:00', value: 50 }, 
      { label: 'Now', value: 35 }
    ]
  },
  '7D': {
    kpis: [
      { label: 'Revenue (7D)', value: '£28,400.00', trend: '+8.4%', isUp: true, icon: DollarSign },
      { label: 'Active Workspaces', value: '890', trend: '+4.2%', isUp: true, icon: Users },
      { label: 'Datasets Exported', value: '945', trend: '+15.2%', isUp: true, icon: Database },
      { label: 'Support Tickets', value: '14', trend: '-2.4%', isUp: false, icon: AlertTriangle },
    ],
    chart: [
      { label: 'Mon', value: 45 }, { label: 'Tue', value: 52 }, 
      { label: 'Wed', value: 38 }, { label: 'Thu', value: 65 }, 
      { label: 'Fri', value: 78 }, { label: 'Sat', value: 30 }, 
      { label: 'Sun', value: 40 }
    ]
  },
  '30D': {
    kpis: [
      { label: 'Revenue (30D)', value: '£124,500.00', trend: '+14.5%', isUp: true, icon: DollarSign },
      { label: 'Active Workspaces', value: '1,284', trend: '+5.2%', isUp: true, icon: Users },
      { label: 'Datasets Exported', value: '8,432', trend: '+12.1%', isUp: true, icon: Database },
      { label: 'Support Tickets', value: '45', trend: '+1.1%', isUp: false, icon: AlertTriangle },
    ],
    chart: [
      { label: 'Week 1', value: 60 }, { label: 'Week 2', value: 75 }, 
      { label: 'Week 3', value: 65 }, { label: 'Week 4', value: 90 }
    ]
  },
  'YTD': {
    kpis: [
      { label: 'Revenue (YTD)', value: '£845,200.00', trend: '+24.5%', isUp: true, icon: DollarSign },
      { label: 'Active Workspaces', value: '3,450', trend: '+18.2%', isUp: true, icon: Users },
      { label: 'Datasets Exported', value: '45,210', trend: '+32.1%', isUp: true, icon: Database },
      { label: 'Support Tickets', value: '312', trend: '-5.4%', isUp: true, icon: AlertTriangle },
    ],
    chart: [
      { label: 'Jan', value: 45 }, { label: 'Feb', value: 52 }, 
      { label: 'Mar', value: 38 }, { label: 'Apr', value: 65 }, 
      { label: 'May', value: 78 }, { label: 'Jun', value: 85 }, 
      { label: 'Jul', value: 100 }
    ]
  }
};

const INITIAL_ACTIVITY = [
  { id: 'ACT-01', user: 'alex@acmecorp.com', action: 'Purchased 10k Email Leads', time: '10 mins ago', amount: 1125.00, status: 'Completed' },
  { id: 'ACT-02', user: 'sarah@fintech.io', action: 'Requested Refund (INV-088)', time: '45 mins ago', amount: 1350.00, status: 'Pending Review' },
  { id: 'ACT-03', user: 'james@startup.co', action: 'Added £500.00 to Wallet', time: '2 hours ago', amount: 500.00, status: 'Completed' },
  { id: 'ACT-04', user: 'system_auto', action: 'Dataset Sync: NA Healthcare', time: '5 hours ago', amount: null, status: 'System' },
  { id: 'ACT-05', user: 'mike@global.net', action: 'Exported 400 Phone Leads', time: '1 day ago', amount: 200.00, status: 'Completed' },
];

const SYSTEM_HEALTH = [
  { service: 'Main API Gateway', status: 'Operational', uptime: '99.99%', icon: Server },
  { service: 'SMTP Validation Engine', status: 'Operational', uptime: '99.95%', icon: Mail },
  { service: 'Payment Processor', status: 'Degraded', uptime: '98.50%', icon: DollarSign },
  { service: 'Data Enrichment Sync', status: 'Operational', uptime: '100%', icon: Zap },
];

const AdminDashboard = () => {
  const { t } = useTranslation();
  // --- CORE STATE ---
  const [timeRange, setTimeRange] = useState('7D');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());
  const [activitySearch, setActivitySearch] = useState('');
  const [activities, setActivities] = useState(INITIAL_ACTIVITY);

  // --- INTERACTIVE STATE ---
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [toast, setToast] = useState(null);

  // Derive Data based on Time Range
  const currentKPIs = DATA_BY_RANGE[timeRange].kpis;
  const currentChart = DATA_BY_RANGE[timeRange].chart;

  // --- CLICK OUTSIDE LISTENER ---
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // --- FUNCTIONAL HANDLERS ---
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate fetching new data
    setTimeout(() => {
      setIsRefreshing(false);
      setLastSync(new Date().toLocaleTimeString());
      setActivities([
        { id: `ACT-NEW-${Math.floor(Math.random()*100)}`, user: 'new_user@domain.com', action: 'Logged in', time: 'Just now', amount: null, status: 'System' },
        ...activities
      ]);
      showToast('Dashboard data synced successfully.');
    }, 1200);
  };

  const handleExportCSV = () => {
    // Generate actual CSV string
    const headers = ['Period', 'Relative Volume'];
    const rows = currentChart.map(data => [data.label, data.value]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    // Trigger browser download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `slipzmarket_revenue_${timeRange.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Report downloaded successfully.');
  };

  const handleSendAnnouncement = (e) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    setIsAnnouncementModalOpen(false);
    setAnnouncementText('');
    showToast('Global announcement broadcasted to all active users.');
  };

  const handleGenerateTaxReport = () => {
    showToast('Compiling fiscal tax report...', 'loading');
    setTimeout(() => {
      showToast('Tax report generated and sent to admin email.');
    }, 2000);
  };

  const handleRowAction = (actionType, id) => {
    setActiveMenuId(null);
    if (actionType === 'ban') {
      const confirmBan = window.confirm('Are you sure you want to suspend this user?');
      if (confirmBan) {
        setActivities(activities.filter(a => a.id !== id));
        showToast('User account suspended.');
      }
    } else if (actionType === 'revert') {
      setActivities(activities.map(a => a.id === id ? { ...a, status: 'Reverted' } : a));
      showToast('Action reverted successfully.');
    } else {
      showToast('Fetching complete audit trail for this event...');
    }
  };

  // Memoized Search Filter
  const filteredActivity = useMemo(() => {
    return activities.filter(log => 
      log.user.toLowerCase().includes(activitySearch.toLowerCase()) || 
      log.action.toLowerCase().includes(activitySearch.toLowerCase())
    );
  }, [activities, activitySearch]);

  return (
    <div className="flex flex-col h-full min-h-screen bg-app font-sans pb-16 selection:bg-accent selection:text-surface relative">
      
      {/* --- DASHBOARD HEADER --- */}
      <div className="bg-surface border-b border-theme px-0 md:px-0 py-6 sticky top-0 z-30 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary tracking-tight">{t('adminOverviewTitle')}</h1>
              <p className="text-[14px] text-muted font-medium mt-1">{t('adminOverviewSubtitle')}</p>
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
                  className={`px-4 py-1.5 rounded-md text-[13px] font-bold transition-all ${timeRange === range ? 'bg-surface shadow-sm text-primary border border-theme' : 'text-muted hover:text-primary'}`}
                >
                  {range}
                </button>
              ))}
            </div>
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 bg-accent hover:bg-accent text-surface px-4 py-2.5 rounded-lg shadow-sm text-[14px] font-bold transition-all disabled:opacity-70"
            >
              <Activity size={16} className={isRefreshing ? "animate-spin" : ""} /> 
              {isRefreshing ? 'Syncing...' : 'Sync Data'}
            </button>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="px-0 mt-8 w-full flex flex-col gap-8">

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
            onClick={() => showToast('Routing to User Management Module...')}
            className="flex items-center justify-center gap-2 bg-white border border-[#d6c9b8] hover:border-[#8b6f5a] hover:bg-[#faf6f0] text-[#3b2a23] p-3 rounded-xl shadow-sm transition-all group"
          >
            <UserCog size={18} className="text-[#8b6f5a] group-hover:scale-110 transition-transform" />
            <span className="text-[13px] font-bold">Manage Workspaces</span>
          </button>
          <button 
            onClick={handleGenerateTaxReport}
            className="flex items-center justify-center gap-2 bg-white border border-[#d6c9b8] hover:border-[#8b6f5a] hover:bg-[#faf6f0] text-[#3b2a23] p-3 rounded-xl shadow-sm transition-all group"
          >
            <BarChart2 size={18} className="text-[#8b6f5a] group-hover:scale-110 transition-transform" />
            <span className="text-[13px] font-bold">Generate Tax Report</span>
          </button>
          <button 
            onClick={() => showToast('Routing to Infrastructure Settings...')}
            className="flex items-center justify-center gap-2 bg-white border border-[#d6c9b8] hover:border-[#8b6f5a] hover:bg-[#faf6f0] text-[#3b2a23] p-3 rounded-xl shadow-sm transition-all group"
          >
            <Globe size={18} className="text-[#8b6f5a] group-hover:scale-110 transition-transform" />
            <span className="text-[13px] font-bold">Region Restrictions</span>
          </button>
        </div>

        {/* 2. DYNAMIC KPI STATS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {currentKPIs.map((stat, i) => (
            <div key={i} className="bg-white border border-[#d6c9b8] rounded-2xl p-6 shadow-sm hover:border-[#8b6f5a] transition-colors relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-[#faf6f0] rounded-xl flex items-center justify-center border border-[#d6c9b8] group-hover:bg-[#8b6f5a] group-hover:text-white transition-colors text-[#8b6f5a]">
                  <stat.icon size={20} />
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

              {currentChart.map((data, i) => (
                <div key={i} className="flex flex-col items-center gap-3 flex-1 group z-10 h-full justify-end">
                  <div className="w-full relative flex justify-center h-full items-end">
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 bg-[#3b2a23] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-opacity whitespace-nowrap z-20 shadow-xl border border-[#8b6f5a]">
                      Val: {data.value}
                    </div>
                    <div 
                      className="w-3/4 bg-[#d6c9b8] group-hover:bg-[#8b6f5a] rounded-t-md transition-all duration-500"
                      style={{ height: `${data.value}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#8b6f5a] uppercase">{data.label}</span>
                </div>
              ))}
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
              {SYSTEM_HEALTH.map((sys, i) => (
                <div key={i} className="p-3 border border-[#d6c9b8] bg-[#faf6f0] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${sys.status === 'Operational' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      <sys.icon size={16} />
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
        <div className="bg-white border border-[#d6c9b8] rounded-2xl shadow-sm overflow-hidden flex flex-col">
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

      </div>

      {/* ========================================= */}
      {/* GLOBAL ANNOUNCEMENT MODAL                 */}
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
                This message will appear as a banner in the dashboard for all active workspaces.
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
      {/* TOAST NOTIFICATION SYSTEM                 */}
      {/* ========================================= */}
      {toast && (
        <div className="fixed bottom-10 right-10 z-80 bg-[#3b2a23] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-up border border-[#8b6f5a]">
          {toast.type === 'loading' ? (
            <Loader2 size={20} className="text-[#d6c9b8] animate-spin" />
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