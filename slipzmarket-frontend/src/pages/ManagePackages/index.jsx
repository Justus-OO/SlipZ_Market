import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { 
  Search, Filter, Plus, Edit2, Trash2, X, Save, 
  CheckCircle2, Database, Download, Mail, Phone, 
  Activity, Layers, Upload, Loader2, FileUp, AlertCircle
} from 'lucide-react';

const ManagePackages = () => {
  const { t } = useTranslation();
  
  // --- STATE ---
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingLeads, setIsUploadingLeads] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedPackages, setSelectedPackages] = useState([]);
  
  // UI & Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  // 👉 NEW: State for uploading datasets to specific packages
  const [isUploadDataModalOpen, setIsUploadDataModalOpen] = useState(false);
  const [uploadTargetPkg, setUploadTargetPkg] = useState(null);

  const [toast, setToast] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    id: '', brand: '', category: 'Email Leads', leadsCount: '', price: '', deliverability: '99.0%', lastUpdated: new Date().toISOString().slice(0, 10)
  });

  // Helper: Auth Header
  const getAuthConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('slipz_token')}` }
  });

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // --- API HANDLERS ---
  const fetchPackages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/packages`);
      setPackages(res.data.packages || []);
    } catch {
      showToast('Error loading packages', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const loadPackages = async () => {
      await fetchPackages();
    };
    loadPackages();
  }, [fetchPackages]);

  const toggleSelectRow = (id) => {
    setSelectedPackages((prev) =>
      prev.includes(id) ? prev.filter((pkgId) => pkgId !== id) : [...prev, id]
    );
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    toggleSelectRow(id);
  };

  const handleSelectAll = (e, currentPackages) => {
    if (e.target.checked) {
      setSelectedPackages(currentPackages.map((pkg) => pkg.id));
    } else {
      setSelectedPackages([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPackages.length === 0) {
      showToast('Select packages first.', 'error');
      return;
    }

    if (!window.confirm(`Delete ${selectedPackages.length} selected package(s)?`)) {
      return;
    }

    try {
      await Promise.all(selectedPackages.map((id) => axios.delete(`${API_URL}/packages/${id}`, getAuthConfig())));
      setSelectedPackages([]);
      fetchPackages();
      showToast('Selected packages deleted.');
    } catch {
      showToast('Bulk delete failed.', 'error');
    }
  };

  const openDeleteModal = (id) => {
    setDeleteTarget(id);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setIsDeleteModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_URL}/packages/${deleteTarget}`, getAuthConfig());
      fetchPackages();
      showToast('Package deleted.');
    } catch {
      showToast('Delete failed.', 'error');
    } finally {
      closeDeleteModal();
    }
  };

  // Catalog Import Handlers
  const openImportModal = () => setIsImportModalOpen(true);
  const closeImportModal = () => setIsImportModalOpen(false);

  // 👉 NEW: Dataset Import Handlers
  const openUploadDataModal = (pkg) => {
    setUploadTargetPkg(pkg);
    setIsUploadDataModalOpen(true);
  };
  const closeUploadDataModal = () => {
    setUploadTargetPkg(null);
    setIsUploadDataModalOpen(false);
  };

  const exportCsv = (rows, filename) => {
    const csvContent = [
      ['ID', 'Brand', 'Category', 'Contacts', 'Price', 'Deliverability', 'Last Updated'],
      ...rows.map((row) => [row.id, row.brand, row.category, row.leadsCount, row.price, row.deliverability, row.lastUpdated || ''])
    ]
      .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleBulkExport = () => {
    if (selectedPackages.length === 0) {
      showToast('Select packages to export.', 'error');
      return;
    }
    const rows = packages.filter((pkg) => selectedPackages.includes(pkg.id)).map((pkg) => ({
      id: pkg.id, brand: pkg.brand, category: pkg.category, leadsCount: pkg.leadsCount, price: pkg.price, deliverability: pkg.deliverability, lastUpdated: pkg.lastUpdated || ''
    }));
    exportCsv(rows, 'selected-packages.csv');
    showToast('Selected packages exported.');
  };

  const handleExportFiltered = () => {
    if (filteredPackages.length === 0) {
      showToast('No filtered packages to export.', 'error');
      return;
    }
    const rows = filteredPackages.map((pkg) => ({
      id: pkg.id, brand: pkg.brand, category: pkg.category, leadsCount: pkg.leadsCount, price: pkg.price, deliverability: pkg.deliverability, lastUpdated: pkg.lastUpdated || ''
    }));
    exportCsv(rows, 'filtered-packages.csv');
    showToast('Filtered packages exported.');
  };

  const handleExportAll = () => {
    if (packages.length === 0) {
      showToast('No packages available to export.', 'error');
      return;
    }
    const rows = packages.map((pkg) => ({
      id: pkg.id, brand: pkg.brand, category: pkg.category, leadsCount: pkg.leadsCount, price: pkg.price, deliverability: pkg.deliverability, lastUpdated: pkg.lastUpdated || ''
    }));
    exportCsv(rows, 'all-packages.csv');
    showToast('All packages exported.');
  };

  // Upload Package Catalog Metadata
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);

    try {
      await axios.post(`${API_URL}/packages/import`, fd, getAuthConfig());
      showToast('CSV import complete!');
      fetchPackages();
    } catch {
      showToast('CSV import failed.', 'error');
    } finally {
      e.target.value = '';
      closeImportModal();
    }
  };

  // 👉 NEW: Upload Raw Leads for a specific package
  const handleLeadsFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetPkg) return;
    
    const fd = new FormData();
    fd.append('file', file);
    
    setIsUploadingLeads(true);
    try {
      // Assuming your backend route handles mapping these leads to the specific package
      await axios.post(`${API_URL}/packages/${uploadTargetPkg.id}/upload-leads`, fd, getAuthConfig());
      showToast(`Successfully uploaded dataset for ${uploadTargetPkg.brand}!`);
      fetchPackages(); // Refresh to update lead counts if backend calculates it automatically
    } catch (err) {
      console.error(err);
      showToast('Dataset upload failed.', 'error');
    } finally {
      e.target.value = '';
      setIsUploadingLeads(false);
      closeUploadDataModal();
    }
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      leadsCount: parseInt(formData.leadsCount, 10),
      price: parseFloat(formData.price)
    };

    try {
      if (editingPackage) {
        await axios.put(`${API_URL}/packages/${editingPackage.id}`, payload, getAuthConfig());
        showToast('Package updated successfully.');
      } else {
        await axios.post(`${API_URL}/packages`, payload, getAuthConfig());
        showToast('Package created successfully.');
      }
      fetchPackages();
      closeDrawer();
    } catch {
      showToast('Failed to save package.', 'error');
    }
  };

  // --- UI HANDLERS ---
  const openDrawer = (pkg = null) => {
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({ ...pkg, price: pkg.price.toString(), leadsCount: pkg.leadsCount.toString() });
    } else {
      setEditingPackage(null);
      const randomId = `PKG-${Math.floor(Math.random() * 9000) + 1000}`;
      setFormData({ id: randomId, brand: '', category: 'Email Leads', leadsCount: '', price: '', deliverability: '99.0%', lastUpdated: new Date().toISOString().slice(0, 10) });
    }
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => { setIsDrawerOpen(false); setEditingPackage(null); };

  // --- DERIVED DATA ---
  const filteredPackages = packages.filter((pkg) =>
    (categoryFilter === 'All' || pkg.category === categoryFilter) &&
    (pkg.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.brand.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const bulkTotalContacts = packages
    .filter((pkg) => selectedPackages.includes(pkg.id))
    .reduce((sum, pkg) => sum + pkg.leadsCount, 0);

  const categorySummary = (() => {
    const map = {};
    let totalRevenue = 0;
    let totalLeads = 0;

    packages.forEach((pkg) => {
      const label = pkg.category || 'Other';
      map[label] = (map[label] || 0) + 1;
      totalRevenue += Number(pkg.price || 0);
      totalLeads += Number(pkg.leadsCount || 0);
    });

    const breakdown = Object.entries(map).map(([category, count]) => ({
      category, count, percentage: packages.length > 0 ? Math.round((count / packages.length) * 100) : 0
    }));

    const maxCount = breakdown.reduce((max, item) => Math.max(max, item.count), 0) || 1;
    return { breakdown, totalRevenue, totalLeads, maxCount };
  })();

  const getCategoryIcon = (category) => {
    if (category.includes('Email')) return <Mail size={16} className="text-[#8b6f5a]" />;
    if (category.includes('Phone')) return <Phone size={16} className="text-[#8b6f5a]" />;
    return <Layers size={16} className="text-[#8b6f5a]" />;
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#f5efe6] font-sans pb-12 selection:bg-[#8b6f5a] selection:text-white relative">
      
      {/* --- HEADER --- */}
      <div className="bg-white border-b border-[#d6c9b8] px-0 lg:px-0 py-5 sticky top-0 z-30 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
          <div>
            <h1 className="text-xl font-bold text-[#3b2a23] tracking-tight flex items-center gap-2">
              <Database size={22} className="text-[#8b6f5a]" /> {t('managePackagesTitle', 'Manage Packages')}
            </h1>
            <p className="text-[13px] text-[#8b6f5a] font-medium mt-0.5">{t('managePackagesSubtitle', 'Control your dataset catalog')}</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <button 
              onClick={() => openDrawer()}
              className="flex items-center justify-center gap-2 bg-[#8b6f5a] hover:bg-[#6c5544] text-white px-5 py-2.5 rounded-lg shadow-sm text-[13px] font-bold transition-all w-full md:w-auto"
            >
              <Plus size={16} /> {t('addNewPackage', 'Add Package')}
            </button>
            <button
              onClick={openImportModal}
              className="flex items-center justify-center gap-2 bg-white border border-[#d6c9b8] hover:bg-[#faf6f0] text-[#3b2a23] px-4 py-2.5 rounded-lg shadow-sm text-[13px] font-bold transition-all w-full md:w-auto"
            >
              <Upload size={16} /> {t('importCsv', 'Import CSV')}
            </button>
            <button
              onClick={handleExportFiltered}
              className="flex items-center justify-center gap-2 bg-white border border-[#d6c9b8] hover:bg-[#faf6f0] text-[#3b2a23] px-4 py-2.5 rounded-lg shadow-sm text-[13px] font-bold transition-all w-full md:w-auto"
            >
              <Download size={16} /> {t('exportFiltered', 'Export Filtered')}
            </button>
            <button
              onClick={handleExportAll}
              className="flex items-center justify-center gap-2 bg-white border border-[#d6c9b8] hover:bg-[#faf6f0] text-[#3b2a23] px-4 py-2.5 rounded-lg shadow-sm text-[13px] font-bold transition-all w-full md:w-auto"
            >
              <Download size={16} /> {t('exportAll', 'Export All')}
            </button>
            {isLoading && (
              <span className="inline-flex items-center gap-2 bg-[#faf6f0] border border-[#d6c9b8] text-[#8b6f5a] text-[13px] font-bold px-4 py-2.5 rounded-lg shadow-sm">
                <Loader2 size={16} className="animate-spin" /> Loading...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="px-0 mt-6 w-full flex flex-col gap-5">

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6f5a] opacity-70" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by ID or brand name..." 
                className="w-full bg-white border border-[#d6c9b8] rounded-lg pl-9 pr-3 py-2.5 text-[13px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] shadow-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-[#8b6f5a]" />
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-[#d6c9b8] rounded-lg px-3 py-2.5 text-[13px] font-bold text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] shadow-sm w-full sm:w-auto"
            >
              <option value="All">{t('allCategories', 'All Categories')}</option>
              <option value="Email Leads">Email Leads</option>
              <option value="Phone Leads">Phone Leads</option>
              <option value="Full Profile">Full Profile</option>
            </select>
          </div>
        </div>

        {/* Package Insights Chart */}
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <div className="bg-white border border-[#d6c9b8] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#3b2a23] uppercase tracking-[0.18em]">{t('categoryBreakdown', 'Category Breakdown')}</h2>
                <p className="text-[13px] text-[#8b6f5a] mt-1">Visual summary of package distribution.</p>
              </div>
              <span className="text-[12px] font-bold text-[#8b6f5a] bg-[#faf6f0] px-3 py-2 rounded-full border border-[#d6c9b8]">{packages.length} total</span>
            </div>

            <div className="mt-5 space-y-4">
              {categorySummary.breakdown.map((item) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between text-[13px] font-bold text-[#3b2a23]">
                    <span>{item.category}</span>
                    <span className="text-[#8b6f5a]">{item.count} ({item.percentage}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#f3ede6] overflow-hidden">
                    <div style={{ width: `${item.percentage}%` }} className="h-full rounded-full bg-[#8b6f5a]" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#d6c9b8] rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-[#3b2a23] uppercase tracking-[0.18em]">{t('packageMetrics', 'Package Metrics')}</h2>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-[#faf6f0] p-4 border border-[#d6c9b8]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#8b6f5a]">{t('totalRevenue', 'Total Inventory Value')}</p>
                <p className="mt-2 text-2xl font-bold text-[#3b2a23]">£{categorySummary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-2xl bg-[#faf6f0] p-4 border border-[#d6c9b8]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#8b6f5a]">{t('totalContacts', 'Total Contacts')}</p>
                <p className="mt-2 text-2xl font-bold text-[#3b2a23]">{categorySummary.totalLeads.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        <div className={`bg-white border border-[#8b6f5a] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between shadow-lg shadow-[#3b2a23]/5 transition-all duration-300 ${selectedPackages.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 hidden'}`}>
          <div className="flex items-center gap-3 mb-3 sm:mb-0 px-2">
            <span className="bg-[#faf6f0] border border-[#d6c9b8] text-[#8b6f5a] text-[12px] font-bold px-3 py-1 rounded-full">
              {selectedPackages.length} Selected
            </span>
            <span className="text-[13px] text-[#3b2a23] font-medium">Total Contacts: <span className="font-bold ml-1">{bulkTotalContacts.toLocaleString()}</span></span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={handleBulkDelete} className="flex-1 sm:flex-none text-[12px] font-bold text-red-600 hover:bg-red-50 px-4 py-2 border border-red-200 rounded-lg bg-white shadow-sm transition-colors flex items-center justify-center gap-1.5">
              <Trash2 size={14} /> Delete
            </button>
            <button onClick={handleBulkExport} className="flex-1 sm:flex-none text-[12px] font-bold text-white bg-[#8b6f5a] hover:bg-[#6c5544] px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Main Data Table */}
        <div className="bg-white border border-[#d6c9b8] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse min-w-225">
              <thead>
                <tr className="bg-[#faf6f0] border-b border-[#d6c9b8]">
                  <th className="w-12 px-5 py-3.5 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedPackages.length === filteredPackages.length && filteredPackages.length > 0}
                      onChange={(e) => handleSelectAll(e, filteredPackages)}
                      className="w-4 h-4 rounded border-[#d6c9b8] text-[#8b6f5a] focus:ring-[#8b6f5a] cursor-pointer" 
                    />
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">{t('packageDetails', 'Package Details')}</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">{t('volumeHealth', 'Volume & Health')}</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest text-right">{t('price', 'Price')}</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest text-right">{t('actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d6c9b8]/50">
                {filteredPackages.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <Database size={32} className="mx-auto text-[#d6c9b8] mb-3" />
                      <p className="text-[#3b2a23] font-bold text-[14px]">{t('noPackagesFound', 'No packages found')}</p>
                      <p className="text-[#8b6f5a] text-[13px] mt-1">{t('adjustFilters', 'Try adjusting your search or filters')}</p>
                    </td>
                  </tr>
                ) : (
                  filteredPackages.map((pkg) => {
                    const isSelected = selectedPackages.includes(pkg.id);
                    return (
                      <tr key={pkg.id} className={`transition-colors group ${isSelected ? 'bg-[#faf6f0]' : 'hover:bg-[#f5efe6]/50'}`}>
                        <td className="px-5 py-3.5 text-center" onClick={(e) => handleSelectRow(e, pkg.id)}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(e, pkg.id)}
                            className="w-4 h-4 rounded border-[#d6c9b8] text-[#8b6f5a] focus:ring-[#8b6f5a] cursor-pointer" 
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white border border-[#d6c9b8] rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                              {getCategoryIcon(pkg.category)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[14px] font-bold text-[#3b2a23] leading-tight">{pkg.brand}</span>
                              <span className="text-[12px] font-medium text-[#8b6f5a] flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono">{pkg.id}</span> • {pkg.category}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-[#3b2a23] leading-tight">{pkg.leadsCount.toLocaleString()} Contacts</span>
                            <span className="text-[11px] text-[#8b6f5a] mt-0.5 flex items-center gap-1">
                              <Activity size={10} className="text-emerald-600"/> {pkg.deliverability} Valid
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-[14px] font-mono font-bold text-[#3b2a23]">£{pkg.price.toFixed(2)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            
                            {/* 👉 NEW: Upload Leads Dataset Button */}
                            <button onClick={() => openUploadDataModal(pkg)} className="p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors border border-transparent hover:border-blue-200" title="Upload Dataset/Leads">
                              <FileUp size={16} />
                            </button>

                            <button onClick={() => openDrawer(pkg)} className="p-1.5 text-[#8b6f5a] hover:bg-[#faf6f0] hover:text-[#3b2a23] rounded-md transition-colors border border-transparent hover:border-[#d6c9b8]" title="Edit Metadata">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => openDeleteModal(pkg.id)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors border border-transparent hover:border-red-200" title="Delete Package">
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
            <span className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">{filteredPackages.length} {t('packagesTotal', 'Packages Total')}</span>
          </div>
        </div>

      </div>

      {/* ========================================= */}
      {/* DRAWER: CREATE / EDIT PACKAGE METADATA      */}
      {/* ========================================= */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-60 flex justify-end">
          <div className="absolute inset-0 bg-[#3b2a23]/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={closeDrawer} />
          
          <div className="relative w-full max-w-[450px] bg-[#f5efe6] h-full shadow-2xl shadow-[#3b2a23]/20 flex flex-col animate-fade-in-right border-l border-[#d6c9b8]">
            <div className="px-6 py-5 border-b border-[#d6c9b8] bg-white flex items-center justify-between shrink-0">
              <h3 className="text-[16px] font-bold text-[#3b2a23] flex items-center gap-2">
                <Edit2 size={18} className="text-[#8b6f5a]"/> {editingPackage ? 'Edit Package Metadata' : 'Create Package'}
              </h3>
              <button onClick={closeDrawer} className="p-1.5 text-[#8b6f5a] hover:text-[#3b2a23] hover:bg-[#f5efe6] rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form id="package-form" onSubmit={handleSavePackage} className="p-6 flex-1 overflow-y-auto flex flex-col gap-5">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Package ID</label>
                <input 
                  type="text" required 
                  value={formData.id} 
                  onChange={(e) => setFormData({...formData, id: e.target.value})} 
                  className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2.5 text-[13px] font-mono text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
                  disabled={!!editingPackage} 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Brand / Display Name</label>
                <input 
                  type="text" required 
                  value={formData.brand} 
                  onChange={(e) => setFormData({...formData, brand: e.target.value})} 
                  placeholder="e.g., 10,000 SaaS Founders"
                  className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Category</label>
                <select 
                  value={formData.category} 
                  onChange={(e) => setFormData({...formData, category: e.target.value})} 
                  className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2.5 text-[13px] font-bold text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
                >
                  <option value="Email Leads">Email Leads</option>
                  <option value="Phone Leads">Phone Leads</option>
                  <option value="Full Profile">Full Profile</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Lead Volume</label>
                  <input 
                    type="number" required min="1"
                    value={formData.leadsCount} 
                    onChange={(e) => setFormData({...formData, leadsCount: e.target.value})} 
                    className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2.5 text-[13px] font-mono text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Price (£)</label>
                  <input 
                    type="number" step="0.01" required min="0"
                    value={formData.price} 
                    onChange={(e) => setFormData({...formData, price: e.target.value})} 
                    className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2.5 text-[13px] font-mono text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Deliverability %</label>
                  <input 
                    type="text" required placeholder="e.g. 98.5%"
                    value={formData.deliverability} 
                    onChange={(e) => setFormData({...formData, deliverability: e.target.value})} 
                    className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2.5 text-[13px] font-mono text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Last Updated</label>
                  <input 
                    type="date" required 
                    value={formData.lastUpdated} 
                    onChange={(e) => setFormData({...formData, lastUpdated: e.target.value})} 
                    className="w-full bg-white border border-[#d6c9b8] rounded-lg px-3 py-2.5 text-[13px] font-mono text-[#3b2a23] outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
                  />
                </div>
              </div>

            </form>

            <div className="p-5 border-t border-[#d6c9b8] bg-white flex gap-3 shrink-0">
              <button type="button" onClick={closeDrawer} className="flex-1 py-2.5 text-[13px] font-bold text-[#3b2a23] bg-white border border-[#d6c9b8] hover:bg-[#faf6f0] transition-colors rounded-lg shadow-sm">
                Cancel
              </button>
              <button type="submit" form="package-form" className="flex-2 bg-[#8b6f5a] hover:bg-[#6c5544] text-white py-2.5 rounded-lg text-[13px] font-bold shadow-sm transition-colors flex items-center justify-center gap-2">
                <Save size={16} /> {editingPackage ? 'Update Metadata' : 'Create Package'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* PACKAGE METADATA IMPORT MODAL             */}
      {/* ========================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#3b2a23]/60 backdrop-blur-sm animate-fade-in" onClick={closeImportModal} />
          <div className="relative w-full max-w-lg rounded-3xl bg-[#f5efe6] border border-[#d6c9b8] shadow-2xl shadow-[#3b2a23]/10 overflow-hidden animate-fade-in-right">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#d6c9b8] bg-white">
              <div>
                <h3 className="text-lg font-bold text-[#3b2a23]">Import Package Catalog</h3>
                <p className="text-[13px] text-[#8b6f5a] mt-1">Upload a CSV file to add or update package metadata.</p>
              </div>
              <button onClick={closeImportModal} className="text-[#8b6f5a] hover:text-[#3b2a23] p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="rounded-3xl bg-white border border-[#d6c9b8] p-5">
                  <p className="text-sm font-semibold text-[#3b2a23]">CSV Format</p>
                  <p className="text-[13px] text-[#8b6f5a] mt-2">Required columns: <span className="font-mono">id, brand, category, leadsCount, price, deliverability, lastUpdated</span>.</p>
                </div>

                <label className="block rounded-3xl bg-white border border-dashed border-[#8b6f5a]/40 p-6 text-center cursor-pointer hover:border-[#8b6f5a] transition-colors">
                  <Upload size={24} className="mx-auto text-[#8b6f5a]" />
                  <p className="mt-3 text-[13px] font-bold text-[#3b2a23]">Select CSV File</p>
                  <p className="text-[12px] text-[#8b6f5a] mt-1">Only .csv files are accepted.</p>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={closeImportModal} className="py-3 text-[14px] font-bold text-[#3b2a23] bg-white border border-[#d6c9b8] rounded-2xl hover:bg-[#faf6f0] transition-colors">
                    Cancel
                  </button>
                  <button type="button" onClick={closeImportModal} className="py-3 text-[14px] font-bold text-white bg-[#8b6f5a] rounded-2xl hover:bg-[#6c5544] transition-colors">
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* 👉 NEW: DATASET (LEADS) UPLOAD MODAL      */}
      {/* ========================================= */}
      {isUploadDataModalOpen && uploadTargetPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#3b2a23]/60 backdrop-blur-sm animate-fade-in" onClick={closeUploadDataModal} />
          <div className="relative w-full max-w-lg rounded-3xl bg-[#f5efe6] border border-[#d6c9b8] shadow-2xl shadow-[#3b2a23]/10 overflow-hidden animate-fade-in-right">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#d6c9b8] bg-white">
              <div>
                <h3 className="text-lg font-bold text-[#3b2a23]">Upload Dataset Leads</h3>
                <p className="text-[13px] text-[#8b6f5a] mt-1">Import actual contact data for <span className="font-bold">{uploadTargetPkg.brand}</span>.</p>
              </div>
              <button onClick={closeUploadDataModal} className="text-[#8b6f5a] hover:text-[#3b2a23] p-2 rounded-full transition-colors disabled:opacity-50" disabled={isUploadingLeads}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="rounded-3xl bg-white border border-[#d6c9b8] p-5">
                  <p className="text-sm font-semibold text-[#3b2a23]">Leads CSV Format</p>
                  <p className="text-[13px] text-[#8b6f5a] mt-2">Required columns: <span className="font-mono bg-gray-100 px-1 rounded">firstName, lastName, email, phone, jobTitle, companyName, industry, country</span>.</p>
                </div>

                <label className={`block rounded-3xl bg-white border border-dashed border-[#8b6f5a]/40 p-6 text-center transition-colors ${isUploadingLeads ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#8b6f5a]'}`}>
                  {isUploadingLeads ? (
                    <Loader2 size={24} className="mx-auto text-blue-500 animate-spin" />
                  ) : (
                    <FileUp size={24} className="mx-auto text-blue-500" />
                  )}
                  <p className="mt-3 text-[13px] font-bold text-[#3b2a23]">
                    {isUploadingLeads ? 'Uploading dataset...' : 'Select Leads CSV File'}
                  </p>
                  <p className="text-[12px] text-[#8b6f5a] mt-1">Will be permanently tied to {uploadTargetPkg.id}.</p>
                  <input type="file" accept=".csv" onChange={handleLeadsFileUpload} disabled={isUploadingLeads} className="hidden" />
                </label>

                <div className="w-full">
                  <button type="button" onClick={closeUploadDataModal} disabled={isUploadingLeads} className="w-full py-3 text-[14px] font-bold text-[#3b2a23] bg-white border border-[#d6c9b8] rounded-2xl hover:bg-[#faf6f0] transition-colors disabled:opacity-50">
                    Cancel Upload
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#3b2a23]/60 backdrop-blur-sm animate-fade-in" onClick={closeDeleteModal} />
          <div className="relative w-full max-w-md rounded-3xl bg-[#f5efe6] border border-[#d6c9b8] shadow-2xl shadow-[#3b2a23]/10 overflow-hidden animate-fade-in-right">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#d6c9b8] bg-white">
              <h3 className="text-lg font-bold text-[#3b2a23]">Confirm Deletion</h3>
              <button onClick={closeDeleteModal} className="text-[#8b6f5a] hover:text-[#3b2a23] p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[14px] text-[#3b2a23]">Are you sure you want to delete this package? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button type="button" onClick={closeDeleteModal} className="flex-1 py-3 text-[14px] font-bold text-[#3b2a23] bg-white border border-[#d6c9b8] rounded-2xl hover:bg-[#faf6f0] transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleConfirmDelete} className="flex-1 py-3 text-[14px] font-bold text-white bg-red-600 rounded-2xl hover:bg-red-700 transition-colors">
                  Delete Package
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-80 bg-[#3b2a23] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-up border border-[#8b6f5a]">
          {toast.type === 'error' ? (
            <AlertCircle size={18} className="text-red-400" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-400" />
          )}
          <p className="text-[13px] font-bold">{toast.msg}</p>
        </div>
      )}

    </div>
  );
};

export default ManagePackages;