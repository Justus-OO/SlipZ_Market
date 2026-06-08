import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../../utils/api';
import { 
  Download, Database, Eye, Loader2, FileSpreadsheet,
  ChevronLeft, Search, Filter, CheckSquare, Square, 
  Trash2, AlertTriangle, ChevronRight, CheckCircle2, AlertCircle, X, 
  Building2, UserCircle, Briefcase, Mail, Phone, Globe, Tag, 
  Users, Activity, Zap, FolderOutput, Link, ArchiveRestore, Trash
} from 'lucide-react';

const MyDatasets = () => {
  // Global & UI State
  const [datasets, setDatasets] = useState([]);
  const [deletedDatasets, setDeletedDatasets] = useState([]); // NEW: Trash tracking
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'trash'
  
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [modal, setModal] = useState({ isOpen: false, type: '', target: null, title: '', message: '' });
  const [moveModalOpen, setMoveModalOpen] = useState(false); // NEW: Move Leads Modal
  const [moveDestination, setMoveDestination] = useState('');
  const [previewLead, setPreviewLead] = useState(null);

  // Workspace State
  const [activeDataset, setActiveDataset] = useState(null);
  const [leads, setLeads] = useState([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Advanced Filtering & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    industry: '',
    country: '',
    hasEmail: false,
    hasPhone: false,
    hasLinkedIn: false // NEW
  });

  // Pagination & Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const toastTimer = useRef(null);

  const getAuthConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('slipz_token')}` }
  });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  // --- 1. DATA FETCHING ---
  const fetchDatasets = async () => {
    setIsLoadingList(true);
    try {
      const res = await axios.get(`${API_URL}/datasets/my-datasets`, getAuthConfig());
      // In a real app, the backend might return { active: [], deleted: [] }
      setDatasets(res.data.data?.datasets || res.data.datasets || []);
    } catch (err) {
      showToast("Failed to fetch library", "error");
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => { fetchDatasets(); }, []);

  // --- 2. ANALYTICS & INSIGHTS ---
  const datasetStats = useMemo(() => {
    const totalDatasets = datasets.length;
    const totalLeads = datasets.reduce((sum, dataset) => sum + (dataset.leadsCount || 0), 0);
    const latestDataset = [...datasets].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;
    return { totalDatasets, totalLeads, latestDataset };
  }, [datasets]);

  const leadMetrics = useMemo(() => {
    if (!leads.length) return null;
    const emailCount = leads.filter(l => l.email && l.email !== 'N/A').length;
    const phoneCount = leads.filter(l => l.phone && l.phone !== 'N/A').length;
    
    const countryCounts = leads.reduce((acc, lead) => {
      const country = lead.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});
    
    const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([country, count]) => ({ country, count }));
    const industryCounts = leads.reduce((acc, lead) => {
      const industry = lead.industry || 'Unknown';
      acc[industry] = (acc[industry] || 0) + 1;
      return acc;
    }, {});
    const topIndustries = Object.entries(industryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([industry, count]) => ({ industry, count }));
    return { emailCount, phoneCount, topCountries, topIndustries, total: leads.length };
  }, [leads]);

  const filterOptions = useMemo(() => {
    const industries = [...new Set(leads.map(l => l.industry).filter(Boolean))].sort();
    const countries = [...new Set(leads.map(l => l.country).filter(Boolean))].sort();
    return { industries, countries };
  }, [leads]);

  const openWorkspace = async (dataset) => {
    setActiveDataset(dataset);
    setIsLoadingLeads(true);
    setSearchQuery('');
    setAdvancedFilters({ industry: '', country: '', hasEmail: false, hasPhone: false, hasLinkedIn: false });
    setMoveDestination('');
    setSelectedLeadIds(new Set());
    setCurrentPage(1);

    try {
      const res = await axios.get(`${API_URL}/datasets/${dataset.invoiceId}/json`, getAuthConfig());
      setLeads(res.data.data?.leads || res.data.leads || []);
    } catch (err) {
      showToast("Failed to load dataset records.", "error");
      setActiveDataset(null);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  // --- 3. FILTERING & PAGINATION ---
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const lowerQuery = searchQuery.toLowerCase();
      // Text Search
      const matchesSearch = !searchQuery || 
        (l.firstName?.toLowerCase() || '').includes(lowerQuery) ||
        (l.lastName?.toLowerCase() || '').includes(lowerQuery) ||
        (l.companyName?.toLowerCase() || '').includes(lowerQuery) ||
        (l.jobTitle?.toLowerCase() || '').includes(lowerQuery);

      // Advanced Filters
      const matchesIndustry = !advancedFilters.industry || l.industry === advancedFilters.industry;
      const matchesCountry = !advancedFilters.country || l.country === advancedFilters.country;
      const matchesEmail = !advancedFilters.hasEmail || (l.email && l.email !== 'N/A');
      const matchesPhone = !advancedFilters.hasPhone || (l.phone && l.phone !== 'N/A');
      const matchesLinkedIn = !advancedFilters.hasLinkedIn || (l.linkedin && l.linkedin !== 'N/A');

      return matchesSearch && matchesIndustry && matchesCountry && matchesEmail && matchesPhone && matchesLinkedIn;
    });
  }, [leads, searchQuery, advancedFilters]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, advancedFilters]);

  // --- 4. SELECTION LOGIC ---
  const toggleSelectAllPage = () => {
    const newSet = new Set(selectedLeadIds);
    const allPageSelected = paginatedLeads.every(l => newSet.has(l.id));
    if (allPageSelected) {
      paginatedLeads.forEach(l => newSet.delete(l.id));
    } else {
      paginatedLeads.forEach(l => newSet.add(l.id));
    }
    setSelectedLeadIds(newSet);
  };

  const toggleSelectLead = (id) => {
    const newSet = new Set(selectedLeadIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedLeadIds(newSet);
  };

  // --- 5. MASS ACTIONS & EXPORT ---
  const executeDelete = async () => {
    setIsProcessing(true);
    try {
      if (modal.type === 'DATASET') {
        // Mocking soft-delete: Move to trash state
        const datasetToTrash = datasets.find(d => d.invoiceId === modal.target);
        setDeletedDatasets([...deletedDatasets, { ...datasetToTrash, deletedAt: new Date().toISOString() }]);
        setDatasets(datasets.filter(d => d.invoiceId !== modal.target));
        showToast("Dataset moved to trash.");
        
        // await axios.delete(`${API_URL}/datasets/${modal.target}`, getAuthConfig()); // Re-enable for real backend
      } else if (modal.type === 'LEADS') {
        await axios.post(`${API_URL}/datasets/${activeDataset.invoiceId}/remove-leads`, { leadIds: modal.target }, getAuthConfig());
        setLeads(leads.filter(l => !selectedLeadIds.has(l.id)));
        setSelectedLeadIds(new Set());
        showToast(`${modal.target.length} leads removed successfully.`);
      }
    } catch (err) {
      showToast("Deletion failed. Please try again.", "error");
    } finally {
      setIsProcessing(false);
      setModal({ isOpen: false, type: '', target: null, title: '', message: '' });
    }
  };

  const handleRestoreDataset = (invoiceId) => {
    const datasetToRestore = deletedDatasets.find(d => d.invoiceId === invoiceId);
    setDatasets([...datasets, datasetToRestore]);
    setDeletedDatasets(deletedDatasets.filter(d => d.invoiceId !== invoiceId));
    showToast("Dataset restored successfully.");
    // Make API call here if backend tracks soft deletes
  };

  const handleMoveLeadsSubmit = async (targetDatasetId) => {
    if (!targetDatasetId) {
      showToast('Please select a destination dataset before moving leads.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      // API call to move leads between datasets goes here
      // await axios.post(`${API_URL}/datasets/move`, { sourceId: activeDataset.invoiceId, destId: targetDatasetId, leadIds: Array.from(selectedLeadIds) }, getAuthConfig());
      
      setTimeout(() => {
        setLeads(leads.filter(l => !selectedLeadIds.has(l.id)));
        setSelectedLeadIds(new Set());
        setMoveDestination('');
        setMoveModalOpen(false);
        showToast(`Moved leads to selected dataset successfully.`);
        setIsProcessing(false);
      }, 800); // Mock processing delay
    } catch (err) {
      showToast("Failed to move leads.", "error");
      setIsProcessing(false);
    }
  };

  const handleVerifyData = () => {
    showToast("Verification job queued! We are validating the selected emails/phones against our master db.");
  };

  const handleFullDownload = async (invoiceId, description) => {
    setDownloadingId(invoiceId);
    try {
      const response = await axios.get(`${API_URL}/datasets/download/${invoiceId}`, { ...getAuthConfig(), responseType: 'blob' });
      triggerDownload(response.data, description, invoiceId, 'full');
      showToast("Export successful!");
    } catch (err) {
      showToast("Failed to download dataset.", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadWorkspaceReport = async () => {
    setIsProcessing(true);
    const token = localStorage.getItem('slipz_token');

    try {
      const response = await axios.get(`${API_URL}/reports/download/workspace-summary`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `Workspace_Summary_${timestamp}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast("Report downloaded successfully!", "success");
    } catch (error) {
      console.error("Failed to download report:", error);
      showToast("Failed to generate the report. Please try again.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectedDownload = () => {
    const selectedData = leads.filter(l => selectedLeadIds.has(l.id));
    if (selectedData.length === 0) return;
    const headers = ['FirstName', 'LastName', 'Email', 'Phone', 'JobTitle', 'CompanyName', 'Industry', 'Country'];
    const csvContent = [headers.join(','), ...selectedData.map(row => headers.map(field => `"${(row[field] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    triggerDownload(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), activeDataset.description, activeDataset.invoiceId, 'selected');
    showToast("Exported selected leads!");
  };

  const triggerDownload = (blob, description, invoiceId, suffix) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanName = (description || 'Custom_Export').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `${cleanName}_${invoiceId.split('-')[1] || 'leads'}_${suffix}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  };

  // --- SUB-COMPONENTS ---
  const ToastNotification = () => {
    if (!toast.visible) return null;
    return (
      <div className="fixed top-8 right-8 z-50 animate-in fade-in slide-in-from-top-4">
        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border ${toast.type === 'error' ? 'bg-white border-red-200 text-red-800' : 'bg-emerald-600 border-emerald-700 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle size={18} className="text-red-600" /> : <CheckCircle2 size={18} />}
          <p className="text-[14px] font-bold">{toast.message}</p>
        </div>
      </div>
    );
  };

  const ConfirmationModal = () => {
    if (!modal.isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
          <div className="flex items-center gap-3 text-red-600 mb-3">
            <AlertTriangle size={24} />
            <h3 className="text-lg font-black">{modal.title}</h3>
          </div>
          <p className="text-[14px] text-[#7a6b6b] leading-relaxed mb-6">{modal.message}</p>
          <div className="flex items-center justify-end gap-3">
            <button onClick={() => setModal({ ...modal, isOpen: false })} disabled={isProcessing} className="px-4 py-2 text-[14px] font-bold text-[#7a6b6b] hover:bg-[#f5f2f2] rounded-lg transition-all">Cancel</button>
            <button onClick={executeDelete} disabled={isProcessing} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-[14px] font-bold rounded-lg transition-all flex items-center gap-2">
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  const MoveLeadsModal = () => {
    if (!moveModalOpen) return null;
    const availableDestinations = datasets.filter(d => d.invoiceId !== activeDataset.invoiceId);
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
          <div className="flex items-center gap-3 text-[#2a1b1b] mb-4">
            <FolderOutput size={24} className="text-[#800000]" />
            <h3 className="text-lg font-black">Move Leads to List</h3>
          </div>
          <p className="text-[14px] text-[#7a6b6b] leading-relaxed mb-4">Select the destination list for the {selectedLeadIds.size} selected leads. They will be removed from the current dataset.</p>
          
          {availableDestinations.length === 0 ? (
            <div className="p-4 bg-[#fcfbfb] border border-[#e8e2e2] rounded-lg text-[13px] text-[#7a6b6b] text-center mb-6">
              You don't have any other active datasets to move leads into.
            </div>
          ) : (
            <select value={moveDestination} onChange={e => setMoveDestination(e.target.value)} className="w-full border border-[#d8cdcd] rounded-lg p-3 text-[14px] font-medium text-[#2a1b1b] focus:border-[#800000] outline-none mb-6">
              <option value="">Select destination list</option>
              {availableDestinations.map(d => (
                <option key={d.invoiceId} value={d.invoiceId}>{d.description}</option>
              ))}
            </select>
          )}

          <div className="flex items-center justify-end gap-3">
            <button onClick={() => setMoveModalOpen(false)} disabled={isProcessing} className="px-4 py-2 text-[14px] font-bold text-[#7a6b6b] hover:bg-[#f5f2f2] rounded-lg transition-all">Cancel</button>
            <button 
              onClick={() => handleMoveLeadsSubmit(moveDestination)} 
              disabled={isProcessing || availableDestinations.length === 0 || !moveDestination} 
              className="px-5 py-2 bg-[#2a1b1b] hover:bg-black text-white text-[14px] font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Move Leads
            </button>
          </div>
        </div>
      </div>
    );
  };

  const LeadPreviewModal = () => {
    if (!previewLead) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
          <div className="bg-[#fcfbfb] border-b border-[#e8e2e2] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#800000]/10 rounded-full flex items-center justify-center text-[#800000]">
                <UserCircle size={20} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[#2a1b1b]">{previewLead.firstName} {previewLead.lastName}</h3>
                <p className="text-[13px] text-[#7a6b6b]">{previewLead.jobTitle}</p>
              </div>
            </div>
            <button onClick={() => setPreviewLead(null)} className="p-2 text-[#a09393] hover:text-[#2a1b1b] hover:bg-[#f5f2f2] rounded-lg transition-colors"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border border-[#e8e2e2] rounded-lg bg-[#fcfbfb]">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#a09393] mb-1"><Mail size={14} /> Email</div>
                <div className="text-[14px] font-medium text-[#2a1b1b] break-all">{previewLead.email || 'N/A'}</div>
              </div>
              <div className="p-3 border border-[#e8e2e2] rounded-lg bg-[#fcfbfb]">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#a09393] mb-1"><Phone size={14} /> Phone</div>
                <div className="text-[14px] font-medium text-[#2a1b1b]">{previewLead.phone || 'N/A'}</div>
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-[14px]"><Building2 size={16} className="text-[#a09393] shrink-0" /><span className="text-[#7a6b6b] w-20">Company:</span><span className="font-bold text-[#2a1b1b]">{previewLead.companyName || 'N/A'}</span></div>
              <div className="flex items-center gap-3 text-[14px]"><Briefcase size={16} className="text-[#a09393] shrink-0" /><span className="text-[#7a6b6b] w-20">Title:</span><span className="font-medium text-[#2a1b1b]">{previewLead.jobTitle || 'N/A'}</span></div>
              <div className="flex items-center gap-3 text-[14px]"><Tag size={16} className="text-[#a09393] shrink-0" /><span className="text-[#7a6b6b] w-20">Industry:</span><span className="font-medium text-[#2a1b1b]">{previewLead.industry || 'N/A'}</span></div>
              <div className="flex items-center gap-3 text-[14px]"><Globe size={16} className="text-[#a09393] shrink-0" /><span className="text-[#7a6b6b] w-20">Location:</span><span className="font-medium text-[#2a1b1b]">{previewLead.country || 'N/A'}</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: WORKSPACE VIEW
  // ==========================================
  if (activeDataset) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto w-full h-[calc(100vh-80px)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
        <ToastNotification />
        <ConfirmationModal />
        <MoveLeadsModal />
        <LeadPreviewModal />
        
        {/* Workspace Header & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 shrink-0">
          <div>
            <button onClick={() => { setActiveDataset(null); fetchDatasets(); }} className="flex items-center gap-1 text-[13px] font-bold text-[#7a6b6b] hover:text-[#800000] transition-colors mb-2">
              <ChevronLeft size={14} /> Back to Library
            </button>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-[#2a1b1b]">{activeDataset.description}</h1>
              <button onClick={handleVerifyData} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors"><Zap size={14} /> Enrich Data</button>
            </div>
            <p className="text-[13px] text-[#7a6b6b] mt-1 font-mono">ID: {activeDataset.invoiceId}</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            {selectedLeadIds.size > 0 ? (
              <div className="flex items-center gap-2 bg-[#fcfbfb] border border-[#e8e2e2] p-1.5 rounded-lg shadow-sm animate-in fade-in">
                <span className="text-[12px] font-bold text-[#800000] px-3">{selectedLeadIds.size} selected</span>
                <div className="w-px h-4 bg-[#d8cdcd]"></div>
                <button onClick={handleVerifyData} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[#2a1b1b] hover:bg-[#f5f2f2] rounded transition-colors"><Zap size={14} className="text-amber-500" /> Verify</button>
                <button onClick={() => setMoveModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[#2a1b1b] hover:bg-[#f5f2f2] rounded transition-colors"><FolderOutput size={14} /> Move</button>
                <button onClick={handleSelectedDownload} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[#2a1b1b] hover:bg-[#f5f2f2] rounded transition-colors"><Download size={14} /> Export</button>
                <div className="w-px h-4 bg-[#d8cdcd]"></div>
                <button onClick={() => setModal({ isOpen: true, type: 'LEADS', target: Array.from(selectedLeadIds), title: 'Remove Leads', message: 'Permanently remove selected leads from this list?' })} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={14} /> Remove</button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button onClick={() => handleFullDownload(activeDataset.invoiceId || activeDataset.id, activeDataset.description)} disabled={downloadingId === activeDataset.invoiceId} className="flex items-center gap-2 bg-[#800000] text-white px-5 py-2.5 rounded-lg text-[13px] font-bold hover:bg-[#660000] transition-colors shadow-sm disabled:opacity-70">
                  {downloadingId === activeDataset.invoiceId ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Export Full List
                </button>
                <button onClick={downloadWorkspaceReport} disabled={isProcessing} className="flex items-center gap-2 bg-[#1f2937] text-white px-4 py-2.5 rounded-lg text-[13px] font-bold hover:bg-[#111827] transition-colors shadow-sm disabled:opacity-70">
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                  Generate PDF Report
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dataset Insights Panel */}
        {!isLoadingLeads && leadMetrics && (
          <div className="bg-white border border-[#d8cdcd] rounded-xl p-4 mb-6 shrink-0 flex flex-wrap lg:flex-nowrap gap-6 items-center shadow-sm">
            <div className="flex flex-col flex-1 min-w-[200px]">
              <span className="text-[11px] font-bold uppercase text-[#7a6b6b] tracking-wider mb-2">Data Health</span>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-[12px] font-bold mb-1"><span className="text-[#2a1b1b]">Emails</span><span className="text-[#800000]">{Math.round((leadMetrics.emailCount/leadMetrics.total)*100)}%</span></div>
                  <div className="h-1.5 bg-[#f5f2f2] rounded-full overflow-hidden"><div className="h-full bg-[#800000]" style={{width: `${(leadMetrics.emailCount/leadMetrics.total)*100}%`}}></div></div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-[12px] font-bold mb-1"><span className="text-[#2a1b1b]">Direct Dials</span><span className="text-emerald-600">{Math.round((leadMetrics.phoneCount/leadMetrics.total)*100)}%</span></div>
                  <div className="h-1.5 bg-[#f5f2f2] rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{width: `${(leadMetrics.phoneCount/leadMetrics.total)*100}%`}}></div></div>
                </div>
              </div>
            </div>
            <div className="w-px h-10 bg-[#e8e2e2] hidden lg:block"></div>
            <div className="flex gap-6 flex-1 min-w-[300px]">
              <div>
                <span className="text-[11px] font-bold uppercase text-[#7a6b6b] tracking-wider block mb-1">Top Locations</span>
                <div className="text-[13px] font-medium text-[#2a1b1b]">{leadMetrics.topCountries.map(c => c.country).join(', ') || 'Varied'}</div>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase text-[#7a6b6b] tracking-wider block mb-1">Top Industries</span>
                <div className="text-[13px] font-medium text-[#2a1b1b]">{leadMetrics.topIndustries.map(i => i.industry).join(', ') || 'Varied'}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden gap-6 min-h-0">
          {/* Advanced Filter Drawer */}
          {isFilterDrawerOpen && (
            <div className="w-64 shrink-0 bg-white border border-[#d8cdcd] rounded-xl shadow-sm flex flex-col animate-in slide-in-from-left-4">
              <div className="p-4 border-b border-[#e8e2e2] flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-[#2a1b1b] flex items-center gap-2"><Filter size={16} className="text-[#800000]"/> Advanced Filters</h3>
                <button onClick={() => setIsFilterDrawerOpen(false)} className="text-[#7a6b6b] hover:bg-[#f5f2f2] p-1 rounded-md"><X size={16} /></button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-5">
                <div>
                  <label className="text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider block mb-2">Industry</label>
                  <select value={advancedFilters.industry} onChange={e => setAdvancedFilters({...advancedFilters, industry: e.target.value})} className="w-full border border-[#d8cdcd] rounded-lg p-2 text-[13px] focus:border-[#800000] outline-none">
                    <option value="">All Industries</option>
                    {filterOptions.industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider block mb-2">Location</label>
                  <select value={advancedFilters.country} onChange={e => setAdvancedFilters({...advancedFilters, country: e.target.value})} className="w-full border border-[#d8cdcd] rounded-lg p-2 text-[13px] focus:border-[#800000] outline-none">
                    <option value="">All Locations</option>
                    {filterOptions.countries.map(country => <option key={country} value={country}>{country}</option>)}
                  </select>
                </div>
                <div className="pt-2 border-t border-[#e8e2e2] space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={advancedFilters.hasEmail} onChange={e => setAdvancedFilters({...advancedFilters, hasEmail: e.target.checked})} className="rounded text-[#800000] focus:ring-[#800000]" />
                    <span className="text-[13px] font-medium text-[#2a1b1b] flex items-center gap-2"><Mail size={14} className="text-[#7a6b6b]"/> Has Email</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={advancedFilters.hasPhone} onChange={e => setAdvancedFilters({...advancedFilters, hasPhone: e.target.checked})} className="rounded text-[#800000] focus:ring-[#800000]" />
                    <span className="text-[13px] font-medium text-[#2a1b1b] flex items-center gap-2"><Phone size={14} className="text-[#7a6b6b]"/> Has Phone</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={advancedFilters.hasLinkedIn} onChange={e => setAdvancedFilters({...advancedFilters, hasLinkedIn: e.target.checked})} className="rounded text-[#800000] focus:ring-[#800000]" />
                    <span className="text-[13px] font-medium text-[#2a1b1b] flex items-center gap-2"><Link size={14} className="text-[#7a6b6b]"/> Has LinkedIn</span>
                  </label>
                </div>
              </div>
              <div className="p-4 border-t border-[#e8e2e2] bg-[#fcfbfb]">
                <button onClick={() => setAdvancedFilters({industry: '', country: '', hasEmail: false, hasPhone: false, hasLinkedIn: false})} className="w-full py-2 text-[13px] font-bold text-[#7a6b6b] bg-white border border-[#d8cdcd] rounded-lg hover:bg-[#f5f2f2]">Clear Filters</button>
              </div>
            </div>
          )}

          {/* Data Grid Section */}
          <div className="flex-1 flex flex-col bg-white border border-[#d8cdcd] rounded-xl shadow-sm overflow-hidden min-h-0">
            {/* Toolbar */}
            <div className="flex items-center gap-4 bg-white p-3 border-b border-[#e8e2e2] shrink-0">
              <button onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)} className={`px-3 py-2 rounded-lg text-[13px] font-medium flex items-center gap-2 border transition-colors ${isFilterDrawerOpen || Object.values(advancedFilters).some(v => v) ? 'bg-[#800000]/10 border-[#800000]/20 text-[#800000]' : 'border-[#d8cdcd] text-[#2a1b1b] hover:bg-[#f5f2f2]'}`}>
                <Filter size={16} /> Filters {(Object.values(advancedFilters).filter(Boolean).length > 0) && `(${Object.values(advancedFilters).filter(Boolean).length})`}
              </button>
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a09393]" />
                <input type="text" placeholder="Search within this list..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-[#f9fafb] border border-[#e8e2e2] rounded-lg text-[13px] focus:outline-none focus:border-[#800000] transition-all" />
              </div>
              <div className="ml-auto text-[12px] font-bold text-[#7a6b6b] bg-[#fcfbfb] px-3 py-1.5 rounded-full border border-[#e8e2e2]">
                Showing {filteredLeads.length} leads
              </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto custom-scrollbar relative bg-white">
              {isLoadingLeads ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10"><Loader2 className="animate-spin text-[#800000] mb-3" size={24} /></div>
              ) : (
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="sticky top-0 bg-[#fcfbfb] shadow-[0_1px_0_#e8e2e2] z-10">
                    <tr className="text-[12px] uppercase tracking-wider font-bold text-[#7a6b6b]">
                      <th className="px-4 py-3 w-10 text-center cursor-pointer" onClick={toggleSelectAllPage}>
                        {paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeadIds.has(l.id)) ? <CheckSquare size={16} className="text-[#800000] inline-block" /> : <Square size={16} className="text-[#d8cdcd] hover:text-[#a09393] inline-block" />}
                      </th>
                      <th className="px-4 py-3">Prospect</th>
                      <th className="px-4 py-3">Job Title</th>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Contact Info</th>
                      <th className="px-4 py-3 w-16 text-center">Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e2e2]">
                    {paginatedLeads.length === 0 ? (
                       <tr><td colSpan="6" className="py-12 text-center text-[#7a6b6b] text-[13px]">No records found matching your filters.</td></tr>
                    ) : paginatedLeads.map((lead) => {
                      const isSelected = selectedLeadIds.has(lead.id);
                      return (
                        <tr key={lead.id} onClick={() => toggleSelectLead(lead.id)} className={`transition-colors cursor-pointer group ${isSelected ? 'bg-[#800000]/5' : 'hover:bg-[#f5f2f2]'}`}>
                          <td className="px-4 py-3 text-center">{isSelected ? <CheckSquare size={16} className="text-[#800000] inline-block" /> : <Square size={16} className="text-[#d8cdcd] inline-block" />}</td>
                          <td className="px-4 py-3"><div className="font-bold text-[#2a1b1b] text-[13px]">{lead.firstName} {lead.lastName}</div></td>
                          <td className="px-4 py-3 text-[13px] text-[#7a6b6b] truncate max-w-[200px]" title={lead.jobTitle}>{lead.jobTitle}</td>
                          <td className="px-4 py-3 text-[13px] font-medium text-[#2a1b1b]">{lead.companyName}</td>
                          <td className="px-4 py-3">
                            <div className="text-[13px] text-[#2a1b1b]">{lead.email}</div>
                            {lead.phone && lead.phone !== 'N/A' && <div className="text-[11px] text-[#7a6b6b] font-mono mt-0.5">{lead.phone}</div>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={(e) => { e.stopPropagation(); setPreviewLead(lead); }} className="p-1.5 text-[#a09393] hover:text-[#800000] hover:bg-white border border-transparent hover:border-[#d8cdcd] rounded-md opacity-0 group-hover:opacity-100 transition-all"><Eye size={16} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {!isLoadingLeads && totalPages > 1 && (
              <div className="flex items-center justify-between shrink-0 bg-[#fcfbfb] p-3 border-t border-[#e8e2e2]">
                <span className="text-[13px] text-[#7a6b6b] font-medium">Page {currentPage} of {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-md border border-[#d8cdcd] text-[#2a1b1b] hover:bg-white disabled:opacity-50"><ChevronLeft size={16}/></button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-md border border-[#d8cdcd] text-[#2a1b1b] hover:bg-white disabled:opacity-50"><ChevronRight size={16}/></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: LIBRARY VIEW
  // ==========================================
  return (
    <div className="p-8 max-w-[1200px] mx-auto w-full animate-in fade-in duration-300 relative">
      <ToastNotification />
      <ConfirmationModal />

      <div className="flex items-center justify-between mb-8 border-b border-[#e8e2e2] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2a1b1b] flex items-center gap-2">
            <Database size={24} className="text-[#800000]" /> Library
          </h1>
          <p className="text-[14px] text-[#7a6b6b] mt-1">Manage your saved leads and track deleted lists.</p>
        </div>
        
        {/* Toggle between Active and Trash views */}
        <div className="flex items-center bg-[#f5f2f2] p-1 rounded-xl border border-[#d8cdcd]">
          <button onClick={() => setViewMode('active')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${viewMode === 'active' ? 'bg-white text-[#2a1b1b] shadow-sm' : 'text-[#7a6b6b] hover:text-[#2a1b1b]'}`}>
            <Database size={16} /> Active ({datasets.length})
          </button>
          <button onClick={() => setViewMode('trash')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${viewMode === 'trash' ? 'bg-white text-red-600 shadow-sm' : 'text-[#7a6b6b] hover:text-red-600'}`}>
            <Trash size={16} /> Trash ({deletedDatasets.length})
          </button>
        </div>
      </div>

      {/* Global Analytics Header (Only show in Active View) */}
      {viewMode === 'active' && !isLoadingList && datasets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-[#d8cdcd] rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#800000]/10 flex items-center justify-center text-[#800000]"><Users size={24} /></div>
            <div><p className="text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider">Total Contacts</p><p className="text-2xl font-black text-[#2a1b1b]">{datasetStats.totalLeads.toLocaleString()}</p></div>
          </div>
          <div className="bg-white border border-[#d8cdcd] rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><FileSpreadsheet size={24} /></div>
            <div><p className="text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider">Saved Lists</p><p className="text-2xl font-black text-[#2a1b1b]">{datasetStats.totalDatasets}</p></div>
          </div>
          <div className="bg-white border border-[#d8cdcd] rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Activity size={24} /></div>
            <div><p className="text-[12px] font-bold text-[#7a6b6b] uppercase tracking-wider">Latest Export</p><p className="text-[15px] font-bold text-[#2a1b1b] mt-1">{datasetStats.latestDataset?.date ? new Date(datasetStats.latestDataset.date).toLocaleDateString() : 'N/A'}</p></div>
          </div>
        </div>
      )}

      {/* Main Lists Table */}
      <div className="bg-white border border-[#d8cdcd] rounded-xl shadow-sm overflow-hidden">
        {isLoadingList ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-[#800000]" size={24} /></div>
        ) : viewMode === 'active' ? (
          datasets.length === 0 ? (
            <div className="p-16 text-center text-[#7a6b6b] flex flex-col items-center">
              <Database size={48} className="mx-auto mb-4 text-[#e8e2e2]" />
              <h3 className="text-lg font-bold text-[#2a1b1b] mb-1">No active datasets found</h3>
              <p className="text-[14px]">You haven't saved or exported any lists yet.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfbfb] border-b border-[#e8e2e2] text-[12px] uppercase tracking-wider font-bold text-[#7a6b6b]">
                  <th className="px-6 py-4">Export Details</th>
                  <th className="px-6 py-4">Volume</th>
                  <th className="px-6 py-4">Purchased On</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e2e2]">
                {datasets.map((dataset, idx) => (
                  <tr key={idx} className="hover:bg-[#f5f2f2] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#2a1b1b] text-[14px]">{dataset.description || 'Custom Data Export'}</div>
                      <div className="text-[11px] text-[#7a6b6b] mt-0.5 font-mono">ID: {dataset.invoiceId}</div>
                    </td>
                    <td className="px-6 py-4"><span className="bg-[#fcfbfb] border border-[#d8cdcd] text-[#2a1b1b] text-[12px] font-bold px-2.5 py-1 rounded-full">{dataset.leadsCount?.toLocaleString()} leads</span></td>
                    <td className="px-6 py-4 text-[13px] text-[#7a6b6b]">{dataset.date ? new Date(dataset.date).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4 flex justify-end items-center gap-3">
                      <button onClick={() => setModal({ isOpen: true, type: 'DATASET', target: dataset.invoiceId, title: 'Move Dataset to Trash?', message: `Are you sure you want to delete "${dataset.description}"? You can view it in the Trash later.` })} className="text-[#a09393] hover:text-red-600 p-2 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                      <button onClick={() => openWorkspace(dataset)} className="flex items-center gap-1.5 text-[13px] font-bold text-[#2a1b1b] bg-white border border-[#d8cdcd] px-4 py-1.5 rounded-lg shadow-sm hover:bg-[#f5f2f2] transition-all"><Eye size={14} /> Open</button>
                      <button onClick={() => handleFullDownload(dataset.invoiceId || dataset.id, dataset.description)} disabled={downloadingId === dataset.invoiceId} className="flex items-center gap-1.5 text-[13px] font-bold text-white bg-[#800000] hover:bg-[#660000] px-4 py-1.5 rounded-lg shadow-sm disabled:opacity-70"><Download size={14} /> CSV</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          // TRASH VIEW
          deletedDatasets.length === 0 ? (
            <div className="p-16 text-center text-[#7a6b6b] flex flex-col items-center">
              <Trash size={48} className="mx-auto mb-4 text-[#e8e2e2]" />
              <h3 className="text-lg font-bold text-[#2a1b1b] mb-1">Trash is empty</h3>
              <p className="text-[14px]">No deleted datasets to display.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse opacity-75 hover:opacity-100 transition-opacity">
              <thead>
                <tr className="bg-[#fcfbfb] border-b border-[#e8e2e2] text-[12px] uppercase tracking-wider font-bold text-[#7a6b6b]">
                  <th className="px-6 py-4">Deleted Export</th>
                  <th className="px-6 py-4">Volume</th>
                  <th className="px-6 py-4">Deleted On</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e2e2]">
                {deletedDatasets.map((dataset, idx) => (
                  <tr key={idx} className="hover:bg-[#fcfbfb] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-red-700 line-through text-[14px]">{dataset.description || 'Custom Data Export'}</div>
                      <div className="text-[11px] text-[#7a6b6b] mt-0.5 font-mono">ID: {dataset.invoiceId}</div>
                    </td>
                    <td className="px-6 py-4"><span className="text-[#2a1b1b] text-[13px] font-medium">{dataset.leadsCount?.toLocaleString()} leads</span></td>
                    <td className="px-6 py-4 text-[13px] text-[#7a6b6b]">{dataset.deletedAt ? new Date(dataset.deletedAt).toLocaleString() : 'Just now'}</td>
                    <td className="px-6 py-4 flex justify-end items-center gap-3">
                      <button onClick={() => handleRestoreDataset(dataset.invoiceId)} className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-lg shadow-sm hover:bg-emerald-100 transition-all"><ArchiveRestore size={14} /> Restore</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
};

export default MyDatasets;