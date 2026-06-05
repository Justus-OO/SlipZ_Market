import React, { useState, useEffect, useMemo, useRef } from 'react';

import axios from 'axios';
import { API_URL } from '../../utils/api';

import { 

  Download, Database, Eye, Loader2, FileSpreadsheet, 

  ChevronLeft, Search, Filter, CheckSquare, Square, 

  SlidersHorizontal, Trash2, AlertTriangle, ChevronRight, CheckCircle2, AlertCircle, X, Building2, UserCircle, Briefcase, Mail, Phone, Globe, Tag

} from 'lucide-react';

const MyDatasets = () => {

  // Global & UI State

  const [datasets, setDatasets] = useState([]);

  const [isLoadingList, setIsLoadingList] = useState(true);

  const [downloadingId, setDownloadingId] = useState(null);

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const [modal, setModal] = useState({ isOpen: false, type: '', target: null, title: '', message: '' });

  

  // 👉 NEW: State to track which lead is currently being previewed

  const [previewLead, setPreviewLead] = useState(null);



  // Workspace State

  const [activeDataset, setActiveDataset] = useState(null);

  const [leads, setLeads] = useState([]);

  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  

  // Manipulation & Pagination State

  const [searchQuery, setSearchQuery] = useState('');

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

      setDatasets(res.data.data?.datasets || res.data.datasets || []);

    } catch (err) {

      showToast("Failed to fetch library", "error");

    } finally {

      setIsLoadingList(false);

    }

  };



  useEffect(() => { fetchDatasets(); }, []);



  const openWorkspace = async (dataset) => {

    setActiveDataset(dataset);

    setIsLoadingLeads(true);

    setSearchQuery('');

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



  // --- 2. DATA MANIPULATION & PAGINATION ---

  const filteredLeads = useMemo(() => {

    if (!searchQuery) return leads;

    const lowerQuery = searchQuery.toLowerCase();

    return leads.filter(l => 

      (l.firstName?.toLowerCase() || '').includes(lowerQuery) ||

      (l.lastName?.toLowerCase() || '').includes(lowerQuery) ||

      (l.companyName?.toLowerCase() || '').includes(lowerQuery) ||

      (l.jobTitle?.toLowerCase() || '').includes(lowerQuery) ||

      (l.email?.toLowerCase() || '').includes(lowerQuery)

    );

  }, [leads, searchQuery]);



  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);

  const paginatedLeads = useMemo(() => {

    const start = (currentPage - 1) * itemsPerPage;

    return filteredLeads.slice(start, start + itemsPerPage);

  }, [filteredLeads, currentPage]);



  useEffect(() => { setCurrentPage(1); }, [searchQuery]);



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



  // --- 3. DELETION LOGIC ---

  const confirmDeleteDataset = (dataset) => {

    setModal({

      isOpen: true,

      type: 'DATASET',

      target: dataset.invoiceId,

      title: 'Delete Entire Dataset?',

      message: `Are you sure you want to delete "${dataset.description}"? This will permanently remove access to these leads. Your financial invoice will remain for receipt purposes.`

    });

  };



  const confirmRemoveLeads = () => {

    setModal({

      isOpen: true,

      type: 'LEADS',

      target: Array.from(selectedLeadIds),

      title: 'Remove Selected Leads?',

      message: `You are about to permanently remove ${selectedLeadIds.size} leads from this workspace. They will not be recoverable.`

    });

  };



  const executeDelete = async () => {

    setIsProcessing(true);

    try {

      if (modal.type === 'DATASET') {

        await axios.delete(`${API_URL}/datasets/${modal.target}`, getAuthConfig());

        showToast("Dataset permanently deleted.");

        fetchDatasets();

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



  // --- 4. EXPORT LOGIC ---

  const handleFullDownload = async (invoiceId, description) => {

    setDownloadingId(invoiceId);

    try {

      const response = await axios.get(`${API_URL}/datasets/download/${invoiceId}`, {

        ...getAuthConfig(), responseType: 'blob' 

      });

      triggerDownload(response.data, description, invoiceId, 'full');

      showToast("Export successful!");

    } catch (err) {

      showToast("Failed to download dataset.", "error");

    } finally {

      setDownloadingId(null);

    }

  };



  const handleSelectedDownload = () => {

    const selectedData = leads.filter(l => selectedLeadIds.has(l.id));

    if (selectedData.length === 0) return;



    const headers = ['FirstName', 'LastName', 'Email', 'Phone', 'JobTitle', 'CompanyName', 'Industry', 'Country'];

    const csvContent = [

      headers.join(','),

      ...selectedData.map(row => 

        headers.map(field => `"${(row[field] || '').replace(/"/g, '""')}"`).join(',')

      )

    ].join('\n');



    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    triggerDownload(blob, activeDataset.description, activeDataset.invoiceId, 'selected');

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

              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Confirm Delete

            </button>

          </div>

        </div>

      </div>

    );

  };



  // 👉 NEW: Single Lead Preview Modal

  const LeadPreviewModal = () => {

    if (!previewLead) return null;

    

    return (

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">

        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">

          {/* Header */}

          <div className="bg-[#fcfbfb] border-b border-[#e8e2e2] px-6 py-4 flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 bg-[#800000]/10 rounded-full flex items-center justify-center text-[#800000]">

                <UserCircle size={20} />

              </div>

              <div>

                <h3 className="text-[16px] font-bold text-[#2a1b1b]">

                  {previewLead.firstName} {previewLead.lastName}

                </h3>

                <p className="text-[13px] text-[#7a6b6b]">{previewLead.jobTitle}</p>

              </div>

            </div>

            <button 

              onClick={() => setPreviewLead(null)} 

              className="p-2 text-[#a09393] hover:text-[#2a1b1b] hover:bg-[#f5f2f2] rounded-lg transition-colors"

            >

              <X size={20} />

            </button>

          </div>

          

          {/* Body */}

          <div className="p-6 space-y-4">

            <div className="grid grid-cols-2 gap-4">

              <div className="p-3 border border-[#e8e2e2] rounded-lg bg-[#fcfbfb]">

                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#a09393] mb-1">

                  <Mail size={14} /> Email Address

                </div>

                <div className="text-[14px] font-medium text-[#2a1b1b] break-all">{previewLead.email || 'N/A'}</div>

              </div>

              <div className="p-3 border border-[#e8e2e2] rounded-lg bg-[#fcfbfb]">

                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#a09393] mb-1">

                  <Phone size={14} /> Phone Number

                </div>

                <div className="text-[14px] font-medium text-[#2a1b1b]">{previewLead.phone || 'N/A'}</div>

              </div>

            </div>



            <div className="space-y-3 pt-2">

              <div className="flex items-center gap-3 text-[14px]">

                <Building2 size={16} className="text-[#a09393] shrink-0" />

                <span className="text-[#7a6b6b] w-20">Company:</span>

                <span className="font-bold text-[#2a1b1b]">{previewLead.companyName || 'N/A'}</span>

              </div>

              <div className="flex items-center gap-3 text-[14px]">

                <Briefcase size={16} className="text-[#a09393] shrink-0" />

                <span className="text-[#7a6b6b] w-20">Title:</span>

                <span className="font-medium text-[#2a1b1b]">{previewLead.jobTitle || 'N/A'}</span>

              </div>

              <div className="flex items-center gap-3 text-[14px]">

                <Tag size={16} className="text-[#a09393] shrink-0" />

                <span className="text-[#7a6b6b] w-20">Industry:</span>

                <span className="font-medium text-[#2a1b1b]">{previewLead.industry || 'N/A'}</span>

              </div>

              <div className="flex items-center gap-3 text-[14px]">

                <Globe size={16} className="text-[#a09393] shrink-0" />

                <span className="text-[#7a6b6b] w-20">Location:</span>

                <span className="font-medium text-[#2a1b1b]">{previewLead.country || 'N/A'}</span>

              </div>

            </div>

          </div>

          

          {/* Footer */}

          <div className="bg-[#fcfbfb] border-t border-[#e8e2e2] px-6 py-4 flex justify-end">

            <button 

              onClick={() => setPreviewLead(null)} 

              className="px-5 py-2 bg-white border border-[#d8cdcd] text-[#2a1b1b] text-[13px] font-bold rounded-lg hover:bg-[#f5f2f2] transition-colors"

            >

              Close Preview

            </button>

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

        <LeadPreviewModal />

        

        {/* Workspace Header */}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">

          <div>

            <button onClick={() => { setActiveDataset(null); fetchDatasets(); }} className="flex items-center gap-1 text-[13px] font-bold text-[#7a6b6b] hover:text-[#800000] transition-colors mb-2">

              <ChevronLeft size={14} /> Back to Library

            </button>

            <h1 className="text-2xl font-bold text-[#2a1b1b]">{activeDataset.description}</h1>

            <p className="text-[13px] text-[#7a6b6b] mt-1 font-mono">ID: {activeDataset.invoiceId} • {leads.length} records</p>

          </div>



          <div className="flex items-center gap-3">

            {selectedLeadIds.size > 0 && (

              <>

                <span className="text-[13px] font-bold text-[#800000] bg-[#800000]/10 px-3 py-1.5 rounded-md">

                  {selectedLeadIds.size} selected

                </span>

                <button 

                  onClick={confirmRemoveLeads}

                  className="flex items-center gap-2 bg-white border border-red-200 text-red-600 px-3 py-2 rounded-lg text-[13px] font-bold hover:bg-red-50 transition-colors shadow-sm"

                >

                  <Trash2 size={14} /> Remove

                </button>

                <button 

                  onClick={handleSelectedDownload}

                  className="flex items-center gap-2 bg-white border border-[#d8cdcd] text-[#2a1b1b] px-4 py-2 rounded-lg text-[13px] font-bold hover:bg-[#f5f2f2] transition-colors shadow-sm"

                >

                  Export Selection

                </button>

              </>

            )}

            <button 

              onClick={() => handleFullDownload(activeDataset.invoiceId || activeDataset.id || activeDataset.packageId, activeDataset.description || activeDataset.brand)}

              disabled={downloadingId === (activeDataset.invoiceId || activeDataset.id || activeDataset.packageId)}

              className="flex items-center gap-2 bg-[#800000] text-white px-4 py-2 rounded-lg text-[13px] font-bold hover:bg-[#660000] transition-colors shadow-sm disabled:opacity-70"

            >

              {downloadingId === (activeDataset.invoiceId || activeDataset.id || activeDataset.packageId) ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}

              Export Full Dataset

            </button>

          </div>

        </div>



        {/* Workspace Toolbar */}

        <div className="flex items-center gap-4 bg-white p-3 border border-[#d8cdcd] border-b-0 rounded-t-xl shrink-0">

          <div className="relative flex-1 max-w-md">

            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a09393]" />

            <input 

              type="text" 

              placeholder="Search data..." 

              value={searchQuery}

              onChange={(e) => setSearchQuery(e.target.value)}

              className="w-full pl-9 pr-4 py-2 bg-[#f9fafb] border border-[#e8e2e2] rounded-lg text-[13px] focus:outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000] transition-all"

            />

          </div>

          <div className="flex-1 text-[12px] text-[#7a6b6b] text-right pr-4">

            Showing {filteredLeads.length} results

          </div>

        </div>



        {/* Data Grid */}

        <div className="bg-white border border-[#d8cdcd] rounded-b-xl shadow-sm flex-1 overflow-auto custom-scrollbar relative">

          {isLoadingLeads ? (

            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">

              <Loader2 className="animate-spin text-[#800000] mb-3" size={32} />

              <p className="text-[14px] font-bold text-[#7a6b6b]">Loading records...</p>

            </div>

          ) : (

            <table className="w-full text-left border-collapse whitespace-nowrap">

              <thead className="sticky top-0 bg-[#fcfbfb] shadow-[0_1px_0_#e8e2e2] z-10">

                <tr className="text-[12px] uppercase tracking-wider font-bold text-[#7a6b6b]">

                  <th className="px-4 py-3 w-10 text-center cursor-pointer" onClick={toggleSelectAllPage} title="Select All on Page">

                    {paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeadIds.has(l.id)) ? (

                      <CheckSquare size={16} className="text-[#800000] inline-block" />

                    ) : (

                      <Square size={16} className="text-[#d8cdcd] hover:text-[#a09393] inline-block transition-colors" />

                    )}

                  </th>

                  <th className="px-4 py-3">Prospect</th>

                  <th className="px-4 py-3">Job Title</th>

                  <th className="px-4 py-3">Company</th>

                  <th className="px-4 py-3">Contact Info</th>

                  <th className="px-4 py-3 w-16 text-center">Action</th>

                </tr>

              </thead>

              <tbody className="divide-y divide-[#e8e2e2]">

                {paginatedLeads.map((lead) => {

                  const isSelected = selectedLeadIds.has(lead.id);

                  return (

                    <tr 

                      key={lead.id} 

                      onClick={() => toggleSelectLead(lead.id)}

                      className={`transition-colors cursor-pointer group ${isSelected ? 'bg-[#800000]/5' : 'hover:bg-[#f5f2f2]'}`}

                    >

                      <td className="px-4 py-3 text-center">

                        {isSelected ? <CheckSquare size={16} className="text-[#800000] inline-block" /> : <Square size={16} className="text-[#d8cdcd] inline-block" />}

                      </td>

                      <td className="px-4 py-3">

                        <div className="font-bold text-[#2a1b1b] text-[13px]">{lead.firstName} {lead.lastName}</div>

                      </td>

                      <td className="px-4 py-3 text-[13px] text-[#7a6b6b] truncate max-w-[200px]" title={lead.jobTitle}>

                        {lead.jobTitle}

                      </td>

                      <td className="px-4 py-3 text-[13px] font-medium text-[#2a1b1b]">{lead.companyName}</td>

                      <td className="px-4 py-3">

                        <div className="text-[13px] text-[#2a1b1b]">{lead.email}</div>

                        {lead.phone && lead.phone !== 'N/A' && <div className="text-[11px] text-[#7a6b6b] font-mono mt-0.5">{lead.phone}</div>}

                      </td>

                      <td className="px-4 py-3 text-center">

                        {/* 👉 NEW: Preview Button inside the row */}

                        <button 

                          onClick={(e) => { 

                            e.stopPropagation(); // Prevents the row selection from triggering

                            setPreviewLead(lead); 

                          }}

                          className="p-1.5 text-[#a09393] hover:text-[#800000] hover:bg-white border border-transparent hover:border-[#d8cdcd] rounded-md transition-all opacity-0 group-hover:opacity-100"

                          title="Preview Lead"

                        >

                          <Eye size={16} />

                        </button>

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

          <div className="mt-4 flex items-center justify-between shrink-0 bg-white p-3 border border-[#d8cdcd] rounded-lg shadow-sm">

            <span className="text-[13px] text-[#7a6b6b] font-medium">Page {currentPage} of {totalPages}</span>

            <div className="flex gap-2">

              <button 

                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 

                disabled={currentPage === 1}

                className="p-1.5 rounded-md border border-[#d8cdcd] text-[#2a1b1b] hover:bg-[#f5f2f2] disabled:opacity-50 transition-colors"

              ><ChevronLeft size={16}/></button>

              <button 

                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 

                disabled={currentPage === totalPages}

                className="p-1.5 rounded-md border border-[#d8cdcd] text-[#2a1b1b] hover:bg-[#f5f2f2] disabled:opacity-50 transition-colors"

              ><ChevronRight size={16}/></button>

            </div>

          </div>

        )}

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



      <div className="flex items-center justify-between mb-8">

        <div>

          <h1 className="text-2xl font-bold text-[#2a1b1b] flex items-center gap-2">

            <Database size={24} className="text-[#800000]" /> My Datasets

          </h1>

          <p className="text-[14px] text-[#7a6b6b] mt-1">

            Access, manipulate, and download your dynamically generated lead exports.

          </p>

        </div>

      </div>



      <div className="bg-white border border-[#d8cdcd] rounded-xl shadow-sm overflow-hidden">

        {isLoadingList ? (

          <div className="p-12 flex justify-center">

            <Loader2 className="animate-spin text-[#800000]" size={32} />

          </div>

        ) : datasets.length === 0 ? (

          <div className="p-12 text-center text-[#7a6b6b]">

            <FileSpreadsheet size={48} className="mx-auto mb-4 text-[#d8cdcd]" />

            <p className="text-[15px] font-bold text-[#2a1b1b]">No datasets found</p>

            <p className="text-[13px] mt-1">You haven't purchased any data exports yet.</p>

          </div>

        ) : (

          <table className="w-full text-left border-collapse">

            <thead>

              <tr className="bg-[#fcfbfb] border-b border-[#e8e2e2] text-[12px] uppercase tracking-wider font-bold text-[#7a6b6b]">

                <th className="px-6 py-4">Export Details</th>

                <th className="px-6 py-4">Type</th>

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

                  <td className="px-6 py-4 text-[13px] text-[#2a1b1b]">Custom Export</td>

                  <td className="px-6 py-4">

                    <span className="bg-[#fcfbfb] border border-[#d8cdcd] text-[#2a1b1b] text-[12px] font-bold px-2.5 py-1 rounded-full">

                      {dataset.leadsCount?.toLocaleString()} leads

                    </span>

                  </td>

                  <td className="px-6 py-4 text-[13px] text-[#7a6b6b]">

                    {dataset.date ? new Date(dataset.date).toLocaleDateString() : 'N/A'}

                  </td>

                  <td className="px-6 py-4 flex justify-end items-center gap-3">

                    <button 

                      onClick={() => confirmDeleteDataset(dataset)}

                      className="text-[#a09393] hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100"

                      title="Delete Dataset"

                    >

                      <Trash2 size={16} />

                    </button>

                    

                    <button 

                      onClick={() => openWorkspace(dataset)}

                      className="flex items-center gap-1.5 text-[13px] font-bold text-[#2a1b1b] bg-white border border-[#d8cdcd] px-4 py-1.5 rounded-lg shadow-sm hover:bg-[#f5f2f2] hover:border-[#a09393] transition-all"

                    >

                      <Eye size={14} /> View & Manipulate

                    </button>

                    

                    <button 

                      onClick={() => handleFullDownload(dataset.invoiceId || dataset.id || dataset.packageId, dataset.description || dataset.brand)}

                      disabled={downloadingId === (dataset.invoiceId || dataset.id || dataset.packageId)}

                      className="flex items-center gap-1.5 text-[13px] font-bold text-white bg-[#800000] hover:bg-[#660000] px-4 py-1.5 rounded-lg shadow-sm transition-colors disabled:opacity-70"

                    >

                      {downloadingId === (dataset.invoiceId || dataset.id || dataset.packageId) ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}

                      CSV

                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        )}

      </div>

    </div>

  );

};



export default MyDatasets;