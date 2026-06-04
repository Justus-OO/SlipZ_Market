import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { 
  Search, Filter, Plus, Edit2, Trash2, X, Save, 
  CheckCircle2, Clock, AlertTriangle, Receipt, 
  Download, Building2, Calendar, DollarSign
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ManageInvoices = () => {
  const { t } = useTranslation();
  // --- STATE ---
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  
  // UI & Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [toast, setToast] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    id: '', client: '', description: '', amount: '', status: 'COMPLETED', date: '', workspaceId: ''
  });

  const getAuthConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('slipz_token')}` }
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchInvoices = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get(`${API_URL}/admin-invoice`, getAuthConfig());
        const invoicesData = res.data?.data?.invoices || res.data?.invoices || [];
        setInvoices(invoicesData.map((invoice) => ({
          id: invoice.id,
          client: invoice.workspace?.name || 'Unknown Workspace',
          description: invoice.description,
          amount: Number(invoice.amount),
          status: invoice.status,
          date: new Date(invoice.date).toISOString().split('T')[0],
          workspaceId: invoice.workspaceId,
          raw: invoice,
          workspace: invoice.workspace
        })));
      } catch (error) {
        console.error('Failed to load admin invoices', error);
        showToast('Unable to load invoices from server', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, []);


  const handleSelectAll = (e, filteredData) => {
    if (e.target.checked) setSelectedInvoices(filteredData.map(inv => inv.id));
    else setSelectedInvoices([]);
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    setSelectedInvoices(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const openDrawer = (invoice = null) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        id: invoice.id,
        client: invoice.client || invoice.workspace?.name || '',
        description: invoice.description,
        amount: invoice.amount.toString(),
        status: invoice.status,
        date: invoice.date,
        workspaceId: invoice.workspaceId || ''
      });
    } else {
      setEditingInvoice(null);
      const today = new Date().toISOString().split('T')[0];
      const randomId = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`;
      setFormData({
        id: randomId,
        client: invoices[0]?.client || '',
        description: '',
        amount: '',
        status: 'COMPLETED',
        date: today,
        workspaceId: invoices[0]?.workspaceId || ''
      });
    }
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingInvoice(null);
  };

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (!formData.workspaceId) {
      showToast('Workspace is required to save this invoice.', 'error');
      return;
    }

    const payload = {
      id: formData.id,
      description: formData.description,
      amount: parseFloat(formData.amount),
      status: formData.status,
      date: new Date(formData.date).toISOString(),
      workspaceId: formData.workspaceId,
      items: []
    };

    try {
      const res = await axios.post(`${API_URL}/admin-invoice/upsert`, payload, getAuthConfig());
      const invoice = res.data?.data?.invoice || res.data?.invoice;
      const mappedInvoice = {
        id: invoice.id,
        client: invoice.workspace?.name || 'Unknown Workspace',
        description: invoice.description,
        amount: Number(invoice.amount),
        status: invoice.status,
        date: new Date(invoice.date).toISOString().split('T')[0],
        workspaceId: invoice.workspaceId,
        raw: invoice,
        workspace: invoice.workspace
      };

      if (editingInvoice) {
        setInvoices(invoices.map(inv => inv.id === editingInvoice.id ? mappedInvoice : inv));
        showToast(`Invoice ${mappedInvoice.id} updated successfully.`);
      } else {
        setInvoices([mappedInvoice, ...invoices]);
        showToast(`Invoice ${mappedInvoice.id} created successfully.`);
      }
      closeDrawer();
    } catch (error) {
      console.error('Failed to save invoice', error);
      showToast('Failed to save invoice.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;

    try {
      await axios.delete(`${API_URL}/admin-invoice/${id}`, getAuthConfig());
      setInvoices(invoices.filter(inv => inv.id !== id));
      setSelectedInvoices(selectedInvoices.filter(selectedId => selectedId !== id));
      showToast(`Invoice ${id} deleted.`);
    } catch (error) {
      console.error('Failed to delete invoice', error);
      showToast('Failed to delete invoice.');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedInvoices.length} invoices?`)) return;

    try {
      await Promise.all(selectedInvoices.map((id) => axios.delete(`${API_URL}/admin-invoice/${id}`, getAuthConfig())));
      setInvoices(invoices.filter(inv => !selectedInvoices.includes(inv.id)));
      setSelectedInvoices([]);
      showToast('Selected invoices deleted successfully.');
    } catch (error) {
      console.error('Failed to delete selected invoices', error);
      showToast('Failed to delete selected invoices.');
    }
  };

  const handleBulkExport = () => {
    showToast(`Exporting ${selectedInvoices.length} invoices to CSV...`);
    setTimeout(() => setSelectedInvoices([]), 1500);
  };

  // --- DERIVED DATA ---
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => 
      (statusFilter === 'All' || inv.status === statusFilter) &&
      (inv.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
       inv.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
       inv.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [invoices, searchTerm, statusFilter]);

  const bulkTotal = useMemo(() => {
    return invoices
      .filter(inv => selectedInvoices.includes(inv.id))
      .reduce((sum, inv) => sum + inv.amount, 0);
  }, [invoices, selectedInvoices]);

  // --- RENDERERS ---
  const getStatusBadge = (status) => {
    switch(status) {
      case 'COMPLETED': return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 size={12}/> {status}</span>;
      case 'PROCESSING': return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200"><Clock size={12}/> {status}</span>;
      case 'FAILED': 
      case 'OVERDUE': return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider bg-red-50 text-red-700 border border-red-200"><AlertTriangle size={12}/> {status}</span>;
      default: return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider bg-[#faf6f0] text-[#8b6f5a] border border-[#d6c9b8]">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#f5efe6] font-sans pb-12 selection:bg-[#8b6f5a] selection:text-white relative">
      
      {/* --- HEADER --- */}
      <div className="bg-white border-b border-[#d6c9b8] px-6 lg:px-10 py-5 sticky top-0 z-30 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1400px] mx-auto w-full">
          <div>
            <h1 className="text-xl font-bold text-[#3b2a23] tracking-tight flex items-center gap-2">
              <Receipt size={22} className="text-[#8b6f5a]" /> {t('invoicesTitle')}
            </h1>
            <p className="text-[13px] text-[#8b6f5a] font-medium mt-0.5">{t('invoicesSubtitle')}</p>
          </div>
          <button 
            onClick={() => openDrawer()}
            className="flex items-center justify-center gap-2 bg-[#8b6f5a] hover:bg-[#6c5544] text-white px-5 py-2.5 rounded-lg shadow-sm text-[13px] font-bold transition-all w-full md:w-auto"
          >
            <Plus size={16} /> {t('createInvoice')}
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="px-6 lg:px-10 mt-6 max-w-[1400px] mx-auto w-full flex flex-col gap-5">

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6f5a] opacity-70" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ID, client, or description..." 
                className="w-full bg-white border border-[#d6c9b8] rounded-lg pl-9 pr-3 py-2.5 text-[13px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] shadow-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-[#8b6f5a]" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-[#d6c9b8] rounded-lg px-3 py-2.5 text-[13px] font-bold text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] shadow-sm w-full sm:w-auto"
            >
              <option value="All">{t('allStatuses')}</option>
              <option value="COMPLETED">Completed</option>
              <option value="PROCESSING">Processing</option>
              <option value="OVERDUE">Overdue</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {isLoading && (
          <div className="rounded-xl border border-[#d6c9b8] bg-white p-6 text-center text-[#3b2a23] font-medium shadow-sm">
            Loading invoices...
          </div>
        )}

        {/* Bulk Action Bar */}
        <div className={`bg-white border border-[#8b6f5a] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between shadow-lg shadow-[#3b2a23]/5 transition-all duration-300 ${selectedInvoices.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 hidden'}`}>
          <div className="flex items-center gap-3 mb-3 sm:mb-0 px-2">
            <span className="bg-[#faf6f0] border border-[#d6c9b8] text-[#8b6f5a] text-[12px] font-bold px-3 py-1 rounded-full">
              {selectedInvoices.length} Selected
            </span>
            <span className="text-[13px] text-[#3b2a23] font-medium">Selected Value: <span className="font-bold font-mono ml-1">£{bulkTotal.toFixed(2)}</span></span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={handleBulkDelete} className="flex-1 sm:flex-none text-[12px] font-bold text-red-600 hover:bg-red-50 px-4 py-2 border border-red-200 rounded-lg bg-white shadow-sm transition-colors flex items-center justify-center gap-1.5">
              <Trash2 size={14} /> Delete
            </button>
            <button onClick={handleBulkExport} className="flex-1 sm:flex-none text-[12px] font-bold text-white bg-[#8b6f5a] hover:bg-[#6c5544] px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5">
              <Download size={14} /> Export Selected
            </button>
          </div>
        </div>

        {/* Main Data Table */}
        <div className="bg-white border border-[#d6c9b8] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#faf6f0] border-b border-[#d6c9b8]">
                  <th className="w-12 px-5 py-3.5 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                      onChange={(e) => handleSelectAll(e, filteredInvoices)}
                      className="w-4 h-4 rounded border-[#d6c9b8] text-[#8b6f5a] focus:ring-[#8b6f5a] cursor-pointer" 
                    />
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Invoice / Client</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Description</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest text-right">Amount</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest text-center">Status</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d6c9b8]/50">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <Receipt size={32} className="mx-auto text-[#d6c9b8] mb-3" />
                      <p className="text-[#3b2a23] font-bold text-[14px]">{t('noInvoicesFound')}</p>
                      <p className="text-[#8b6f5a] text-[13px] mt-1">{t('adjustSearchOrCreate')}</p>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const isSelected = selectedInvoices.includes(inv.id);
                    return (
                      <tr key={inv.id} className={`transition-colors group ${isSelected ? 'bg-[#faf6f0]' : 'hover:bg-[#f5efe6]/50'}`}>
                        <td className="px-5 py-3.5 text-center" onClick={(e) => handleSelectRow(e, inv.id)}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded border-[#d6c9b8] text-[#8b6f5a] focus:ring-[#8b6f5a] cursor-pointer" 
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="text-[14px] font-bold text-[#3b2a23] leading-tight">{inv.id}</span>
                            <span className="text-[12px] font-medium text-[#8b6f5a] flex items-center gap-1 mt-0.5"><Building2 size={12} /> {inv.client}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-medium text-[#3b2a23] leading-tight">{inv.description}</span>
                            <span className="text-[11px] text-[#8b6f5a] mt-0.5 flex items-center gap-1"><Calendar size={10}/> Billed: {inv.date}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-[14px] font-mono font-bold text-[#3b2a23]">£{inv.amount.toFixed(2)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {getStatusBadge(inv.status)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openDrawer(inv)} className="p-1.5 text-[#8b6f5a] hover:bg-[#faf6f0] hover:text-[#3b2a23] rounded-md transition-colors border border-transparent hover:border-[#d6c9b8]" title="Edit">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(inv.id)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors border border-transparent hover:border-red-200" title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-3.5 border-t border-[#d6c9b8] bg-[#faf6f0] flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">{filteredInvoices.length} {t('invoicesTotal')}</span>
          </div>
        </div>

      </div>

      {/* ========================================= */}
      {/* DRAWER: CREATE / EDIT INVOICE             */}
      {/* ========================================= */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-[#3b2a23]/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={closeDrawer} />
          
          <div className="relative w-full max-w-[450px] bg-[#f5efe6] h-full shadow-2xl shadow-[#3b2a23]/20 flex flex-col animate-fade-in-right border-l border-[#d6c9b8]">
            <div className="px-6 py-5 border-b border-[#d6c9b8] bg-white flex items-center justify-between shrink-0">
              <h3 className="text-[16px] font-bold text-[#3b2a23] flex items-center gap-2">
                <Edit2 size={18} className="text-[#8b6f5a]"/> {editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
              </h3>
              <button onClick={closeDrawer} className="p-1.5 text-[#8b6f5a] hover:text-[#3b2a23] hover:bg-[#f5efe6] rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form id="invoice-form" onSubmit={handleSaveInvoice} className="p-6 flex-1 overflow-y-auto flex flex-col gap-5">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Invoice ID</label>
                <input 
                  type="text" required 
                  value={formData.id} 
                  onChange={(e) => setFormData({...formData, id: e.target.value})} 
                  className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2.5 text-[13px] font-mono text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
                  disabled={!!editingInvoice} // Disallow changing ID if editing
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Client / Organization</label>
                <input 
                  type="text" required 
                  value={formData.client} 
                  onChange={(e) => setFormData({...formData, client: e.target.value})} 
                  placeholder="e.g., Acme Corp Ltd."
                  className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Line Item / Description</label>
                <textarea 
                  required rows="2"
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  placeholder="e.g., 10,000 Verified Email Leads"
                  className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Amount (£)</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6f5a]" />
                    <input 
                      type="number" step="0.01" required 
                      value={formData.amount} 
                      onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                      className="w-full bg-white border border-[#d6c9b8] rounded-lg pl-8 pr-3 py-2.5 text-[13px] font-mono text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Billing Date</label>
                  <input 
                    type="date" required 
                    value={formData.date} 
                    onChange={(e) => setFormData({...formData, date: e.target.value})} 
                    className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2.5 text-[13px] font-mono text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Payment Status</label>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({...formData, status: e.target.value})} 
                  className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2.5 text-[13px] font-bold text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
                >
                  <option value="COMPLETED">Completed</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="FAILED">Failed</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>

            </form>

            <div className="p-5 border-t border-[#d6c9b8] bg-white flex gap-3 shrink-0">
              <button type="button" onClick={closeDrawer} className="flex-1 py-2.5 text-[13px] font-bold text-[#3b2a23] bg-white border border-[#d6c9b8] hover:bg-[#faf6f0] transition-colors rounded-lg shadow-sm">
                Cancel
              </button>
              <button type="submit" form="invoice-form" className="flex-[2] bg-[#8b6f5a] hover:bg-[#6c5544] text-white py-2.5 rounded-lg text-[13px] font-bold shadow-sm transition-colors flex items-center justify-center gap-2">
                <Save size={16} /> {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* TOAST NOTIFICATIONS                       */}
      {/* ========================================= */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-[80] bg-[#3b2a23] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-up border border-[#8b6f5a]">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <p className="text-[13px] font-bold">{toast.msg}</p>
        </div>
      )}

    </div>
  );
};

export default ManageInvoices;