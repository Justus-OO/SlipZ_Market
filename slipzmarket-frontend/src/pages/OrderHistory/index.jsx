import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { 
  Search, Filter, Download, CheckCircle2, 
  Clock, Receipt, Calendar, ArrowUpRight, 
  Database, FileText, X, Building2, CreditCard,
  Mail, Phone, AlertCircle, ChevronDown, ChevronUp,
  MoreVertical, FileCheck, RefreshCw, AlertTriangle, FileDown,
  Loader2, Send
} from 'lucide-react';

const OrderHistory = () => {
  const { t } = useTranslation();
  // --- STATE ---
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getAuthConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('slipz_token')}` }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  
  // Interactive UI States
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isDownloadingBulk, setIsDownloadingBulk] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null); 
  
  // Modal Specific States
  const [refundOrder, setRefundOrder] = useState(null);
  const [discrepancyOrder, setDiscrepancyOrder] = useState(null);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);
  
  // Form States
  const [refundReason, setRefundReason] = useState('');
  const [discrepancyType, setDiscrepancyType] = useState('Missing Data');
  const [discrepancyDetails, setDiscrepancyDetails] = useState('');

  // --- EFFECT FOR CLICK OUTSIDE TO CLOSE ACTIONS MENU ---
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // --- FETCH ORDER HISTORY FROM API ---
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_URL}/history`, getAuthConfig());
        const invoices = res.data?.data?.invoices || res.data?.invoices || [];
        const mappedOrders = invoices.map((invoice) => ({
          id: invoice.id,
          timestamp: new Date(invoice.date).getTime(),
          date: new Date(invoice.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }),
          item: invoice.description || 'Invoice Purchase',
          type: invoice.items?.length ? `${invoice.items.length} item${invoice.items.length > 1 ? 's' : ''}` : 'Invoice',
          total: Number(invoice.amount),
          status: invoice.status || 'UNKNOWN',
          payment: invoice.paymentMethod || 'Invoice',
          raw: invoice
        }));
        setOrders(mappedOrders);
      } catch (error) {
        console.error('Failed to load invoice history', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // --- NATIVE BROWSER PDF GENERATION ENGINE ---
  const generateAndPrintPDF = (invoiceData) => {
    setDownloadingReceiptId(invoiceData.id);
    setActiveMenuId(null);

    // Simulate a brief loading state to show the UI toast
    setTimeout(() => {
      // 1. Create a pristine new window
      const printWindow = window.open('', '_blank');
      
      // 2. Inject HTML and CSS perfectly styled for a standard A4 print/PDF format
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt_${invoiceData.id}</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                padding: 50px; 
                color: #3b2a23; 
                line-height: 1.5;
              }
              .header { 
                display: flex; justify-content: space-between; align-items: flex-start;
                border-bottom: 2px dashed #d6c9b8; padding-bottom: 30px; margin-bottom: 30px; 
              }
              .title { font-size: 32px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 5px; }
              .subtitle { font-size: 14px; color: #8b6f5a; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
              .info-block { display: flex; justify-content: space-between; margin-bottom: 40px; }
              .label { font-size: 11px; color: #8b6f5a; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
              .val-lg { font-weight: bold; font-size: 16px; margin-bottom: 2px; }
              .val-sm { font-size: 14px; color: #555; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
              th { border-bottom: 2px solid #3b2a23; padding: 12px 0; color: #8b6f5a; font-size: 12px; text-transform: uppercase; text-align: left; }
              th.center { text-align: center; }
              th.right { text-align: right; }
              td { border-bottom: 1px solid #d6c9b8; padding: 20px 0; }
              .totals-wrapper { display: flex; justify-content: flex-end; }
              .totals { width: 350px; background: #f5efe6; padding: 25px; border-radius: 12px; border: 1px solid #d6c9b8; }
              .tot-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
              .tot-final { font-size: 20px; font-weight: 900; border-top: 1px solid #d6c9b8; padding-top: 15px; margin-top: 15px; display: flex; justify-content: space-between; align-items: center; }
              .footer { margin-top: 60px; font-size: 12px; color: #8b6f5a; text-align: center; border-top: 1px solid #d6c9b8; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="title">RECEIPT</div>
                <div class="subtitle">${invoiceData.id} • ${invoiceData.date}</div>
              </div>
              <div style="text-align: right;">
                <div class="title" style="color: #8b6f5a;">SlipZMarket</div>
                <div class="subtitle">B2B Data Intelligence</div>
              </div>
            </div>

            <div class="info-block">
              <div>
                <div class="label">Billed To</div>
                <div class="val-lg">Acme Corp Ltd.</div>
                <div class="val-sm">Alex Doe<br/>billing@acmecorp.com</div>
              </div>
              <div style="text-align: right;">
                <div class="label">Payment Method</div>
                <div class="val-lg">${invoiceData.payment}</div>
                <div style="font-size: 13px; font-weight: bold; margin-top: 5px; color: ${invoiceData.status === 'COMPLETED' ? '#059669' : '#b45309'};">
                  STATUS: ${invoiceData.status}
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="center">Qty</th>
                  <th class="right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div style="font-weight: bold; font-size: 16px;">${invoiceData.item}</div>
                    <div style="font-size: 13px; color: #8b6f5a; margin-top: 4px;">Dataset Formatting: ${invoiceData.type}</div>
                  </td>
                  <td class="center" style="font-weight: bold;">1</td>
                  <td class="right" style="font-weight: bold; font-family: monospace; font-size: 16px;">£${invoiceData.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div class="totals-wrapper">
              <div class="totals">
                <div class="tot-row">
                  <span style="color: #8b6f5a; font-weight: bold;">Subtotal</span>
                  <span style="font-family: monospace; font-weight: bold;">£${invoiceData.total.toFixed(2)}</span>
                </div>
                <div class="tot-row">
                  <span style="color: #8b6f5a; font-weight: bold;">Tax / VAT (0%)</span>
                  <span style="font-family: monospace; font-weight: bold;">£0.00</span>
                </div>
                <div class="tot-final">
                  <span style="text-transform: uppercase; font-size: 14px; letter-spacing: 1px;">Total Paid</span>
                  <span style="font-family: monospace;">£${invoiceData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div class="footer">
              This is a computer generated receipt and does not require a signature.<br/>
              SlipZMarket Data Solutions • 123 Business Avenue, London, UK
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      // Delay printing very briefly to allow CSS rendering, then trigger print/pdf dialog
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setDownloadingReceiptId(null);
      }, 500);

    }, 800); // UI Toast duration
  };

  // --- TABLE ACTIONS ---
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e, filteredData) => {
    if (e.target.checked) {
      setSelectedOrders(filteredData.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    setSelectedOrders(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleRowMenuToggle = (e, id) => {
    e.stopPropagation(); 
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  // --- CONTEXTUAL FEATURE HANDLERS ---
  const submitRefundRequest = async (e) => {
    e.preventDefault();
    if (!refundReason.trim() || !refundOrder) return;

    try {
      await axios.post(`${API_URL}/history/report-issue`, {
        invoiceId: refundOrder.id,
        type: 'Refund Request',
        details: refundReason,
        actionType: 'REFUND'
      }, getAuthConfig());

      setOrders(prev => prev.map(o => o.id === refundOrder.id ? { ...o, status: 'PROCESSING' } : o));
    } catch (error) {
      console.error('Refund request failed', error);
    } finally {
      setRefundOrder(null);
      setRefundReason('');
    }
  };

  const submitDiscrepancyReport = async (e) => {
    e.preventDefault();
    if (!discrepancyDetails.trim() || !discrepancyOrder) return;

    try {
      await axios.post(`${API_URL}/history/report-issue`, {
        invoiceId: discrepancyOrder.id,
        type: discrepancyType,
        details: discrepancyDetails,
        actionType: 'DISCREPANCY'
      }, getAuthConfig());

    } catch (error) {
      console.error('Discrepancy report failed', error);
    } finally {
      setDiscrepancyOrder(null);
      setDiscrepancyType('Missing Data');
      setDiscrepancyDetails('');
    }
  };

  const handleBulkDownloadZIP = () => {
    setIsDownloadingBulk(true);
    setTimeout(() => {
      setIsDownloadingBulk(false);
      setSelectedOrders([]);
      alert("Bulk download is not available in this build. Use individual invoice PDF downloads instead.");
    }, 2000);
  };

  // Memoized Filtering & Sorting
  const processedOrders = useMemo(() => {
    let filtered = orders.filter(order => 
      (statusFilter === 'All' || order.status === statusFilter) &&
      (order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
       order.item.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    filtered.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [orders, searchTerm, statusFilter, sortConfig]);

  const bulkTotal = processedOrders
    .filter(o => selectedOrders.includes(o.id))
    .reduce((acc, curr) => acc + curr.total, 0);

  const lifetimeSpend = orders.reduce((acc, order) => acc + Number(order.total || 0), 0);
  const totalTransactions = orders.length;
  const pendingCount = orders.filter(o => o.status === 'PROCESSING').length;

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return <ChevronDown size={14} className="opacity-0 group-hover:opacity-40 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-[#8b6f5a]" /> : <ChevronDown size={14} className="text-[#8b6f5a]" />;
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#f5efe6] font-sans pb-16 selection:bg-[#8b6f5a] selection:text-white relative">
      
      {/* --- WORKSPACE HEADER --- */}
      <div className="bg-white border-b border-[#d6c9b8] px-0 md:px-0 py-6 sticky top-0 z-30 shadow-sm shadow-[#3b2a23]/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
          <div>
            <h1 className="text-2xl font-bold text-[#3b2a23] tracking-tight">{t('historyTitle')}</h1>
            <p className="text-[14px] text-[#8b6f5a] font-medium mt-1">{t('historySubtitle')}</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center w-full md:w-72 bg-white border border-[#d6c9b8] rounded-lg px-4 py-2.5 shadow-sm focus-within:border-[#8b6f5a] focus-within:ring-1 focus-within:ring-[#8b6f5a] transition-all">
              <Search size={16} className="text-[#8b6f5a] opacity-70" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Invoice ID..." 
                className="bg-transparent border-none outline-none text-[14px] text-[#3b2a23] w-full px-3 placeholder:text-[#8b6f5a] placeholder:opacity-60"
              />
            </div>
            <button 
              onClick={() => setIsFilterDrawerOpen(true)}
              className="flex items-center gap-2 bg-white border border-[#d6c9b8] text-[#3b2a23] hover:bg-[#faf6f0] px-4 py-2.5 rounded-lg shadow-sm text-[14px] font-bold transition-colors whitespace-nowrap"
            >
              <Filter size={16} className="text-[#8b6f5a]" /> Filters
            </button>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="px-0 mt-8 w-full flex flex-col gap-8">

        {/* --- STATS ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#d6c9b8] rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-[#8b6f5a] transition-colors">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">{t('lifetimeSpend')}</span>
              <div className="w-10 h-10 bg-[#faf6f0] rounded-lg flex items-center justify-center border border-[#d6c9b8]">
                <ArrowUpRight size={18} className="text-[#8b6f5a]" />
              </div>
            </div>
            <p className="text-[28px] font-black font-mono text-[#3b2a23] tracking-tighter">£{lifetimeSpend.toFixed(2)}</p>
          </div>

          <div className="bg-white border border-[#d6c9b8] rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-[#8b6f5a] transition-colors">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">{t('totalTransactions')}</span>
              <div className="w-10 h-10 bg-[#faf6f0] rounded-lg flex items-center justify-center border border-[#d6c9b8]">
                <Receipt size={18} className="text-[#8b6f5a]" />
              </div>
            </div>
            <p className="text-[28px] font-black font-mono text-[#3b2a23] tracking-tighter">{totalTransactions}</p>
          </div>

          <div className="bg-white border border-[#d6c9b8] rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-[#8b6f5a] transition-colors">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">{t('pendingDatasets')}</span>
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-200">
                <Clock size={18} className="text-amber-600" />
              </div>
            </div>
            <p className="text-[28px] font-black font-mono text-[#3b2a23] tracking-tighter">{pendingCount}</p>
          </div>
        </div>

        {/* --- BULK ACTIONS --- */}
        <div className={`bg-white border border-[#8b6f5a] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between shadow-lg shadow-[#3b2a23]/5 transition-all duration-300 ${selectedOrders.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 hidden'}`}>
          <div className="flex items-center gap-4 mb-3 sm:mb-0">
            <span className="bg-[#faf6f0] border border-[#d6c9b8] text-[#8b6f5a] text-[12px] font-bold px-3 py-1 rounded-full">
              {selectedOrders.length} Selected
            </span>
            <span className="text-[14px] text-[#3b2a23] font-medium">Selected Total: <span className="font-bold font-mono ml-1">£{bulkTotal.toFixed(2)}</span></span>
          </div>
          <button 
            onClick={handleBulkDownloadZIP}
            disabled={isDownloadingBulk}
            className="w-full sm:w-auto text-[13px] font-bold text-white bg-[#8b6f5a] hover:bg-[#6c5544] px-5 py-2.5 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            {isDownloadingBulk ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Compiling ZIP...</span> : <span className="flex items-center gap-2"><Download size={16} /> Download Selected PDFs</span>}
          </button>
        </div>

        {/* --- ORDER LEDGER TABLE --- */}
        <div className="bg-white border border-[#d6c9b8] rounded-xl shadow-sm flex flex-col overflow-hidden">
          
          <div className="flex justify-between items-center p-5 border-b border-[#d6c9b8] bg-[#faf6f0]">
            <h3 className="text-[14px] font-bold text-[#3b2a23] uppercase tracking-widest flex items-center gap-2">
              <Calendar size={18} className="text-[#8b6f5a]" />
              {t('transactionLedger')}
            </h3>
            <button className="text-[13px] font-bold text-[#3b2a23] hover:text-[#8b6f5a] transition-colors flex items-center gap-2 border border-[#d6c9b8] px-4 py-2 rounded-lg bg-white shadow-sm">
              <FileCheck size={16} className="text-[#8b6f5a]" /> {t('exportLedgerCsv')}
            </button>
          </div>

          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse min-w-225">
              <thead>
                <tr className="bg-white border-b border-[#d6c9b8]">
                  <th className="w-14 px-5 py-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedOrders.length === processedOrders.length && processedOrders.length > 0}
                      onChange={(e) => handleSelectAll(e, processedOrders)}
                      className="w-4 h-4 rounded border-[#d6c9b8] text-[#8b6f5a] focus:ring-[#8b6f5a] cursor-pointer" 
                    />
                  </th>
                  <th className="px-5 py-4 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest cursor-pointer group" onClick={() => handleSort('timestamp')}>
                    <div className="flex items-center gap-1">Invoice Details {renderSortIcon('timestamp')}</div>
                  </th>
                  <th className="px-5 py-4 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Type / Format</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest cursor-pointer group text-right" onClick={() => handleSort('total')}>
                    <div className="flex items-center justify-end gap-1">Amount {renderSortIcon('total')}</div>
                  </th>
                  <th className="px-5 py-4 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest cursor-pointer group text-center" onClick={() => handleSort('status')}>
                    <div className="flex items-center justify-center gap-1">Status {renderSortIcon('status')}</div>
                  </th>
                  <th className="w-16 px-5 py-4 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d6c9b8]/50">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <Loader2 size={32} className="mx-auto text-[#8b6f5a] mb-3 animate-spin" />
                      <p className="text-[#3b2a23] font-bold">Loading invoice history...</p>
                      <p className="text-[#8b6f5a] text-[13px] mt-1">Please wait while we fetch your billing records.</p>
                    </td>
                  </tr>
                ) : processedOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <FileText size={32} className="mx-auto text-[#d6c9b8] mb-3" />
                      <p className="text-[#3b2a23] font-bold">{t('noTransactionsFound')}</p>
                      <p className="text-[#8b6f5a] text-[13px] mt-1">{t('tryAdjusting')}</p>
                    </td>
                  </tr>
                ) : (
                  processedOrders.map((order) => {
                    const isSelected = selectedOrders.includes(order.id);
                    return (
                      <tr 
                        key={order.id} 
                        className={`transition-colors cursor-pointer ${isSelected ? 'bg-[#faf6f0]' : 'hover:bg-[#f5efe6]/50'}`}
                        onClick={() => setSelectedInvoice(order)}
                      >
                        <td className="px-5 py-4 text-center" onClick={(e) => handleSelectRow(e, order.id)}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded border-[#d6c9b8] text-[#8b6f5a] focus:ring-[#8b6f5a] cursor-pointer" 
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-white border border-[#d6c9b8] rounded-xl flex items-center justify-center shrink-0 shadow-sm text-[#8b6f5a]">
                              {order.type.includes('Email') ? <Mail size={18} /> : 
                               order.type.includes('Phone') ? <Phone size={18} /> : 
                               <Database size={18} />}
                            </div>
                            <div>
                              <div className="text-[14px] font-bold text-[#3b2a23] hover:text-[#8b6f5a] transition-colors mb-1">
                                {order.item}
                              </div>
                              <div className="flex items-center gap-2 text-[12px] font-medium text-[#8b6f5a]">
                                <span className="font-mono text-[#3b2a23]">{order.id}</span>
                                <span className="opacity-50">•</span>
                                <span>{order.date}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-[13px] font-bold text-[#3b2a23] bg-[#faf6f0] px-3 py-1 rounded-md border border-[#d6c9b8]">
                            {order.type}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className="text-[15px] font-mono font-bold text-[#3b2a23] tracking-tight">
                            £{order.total.toFixed(2)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-center">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest border ${
                              order.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              order.status === 'PROCESSING' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                              'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {order.status === 'COMPLETED' && <CheckCircle2 size={14} />}
                              {order.status === 'PROCESSING' && <Clock size={14} />}
                              {order.status === 'FAILED' && <AlertCircle size={14} />}
                              {order.status}
                            </span>
                          </div>
                        </td>

                        {/* --- FUNCTIONAL ACTIONS DROPDOWN MENU --- */}
                        <td className="px-5 py-4 text-center relative">
                          <button 
                            className={`p-2 rounded-lg transition-colors ${activeMenuId === order.id ? 'bg-[#d6c9b8]/40 text-[#3b2a23]' : 'text-[#8b6f5a] hover:text-[#3b2a23] hover:bg-[#d6c9b8]/30'}`}
                            onClick={(e) => handleRowMenuToggle(e, order.id)}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {activeMenuId === order.id && (
                            <div className="absolute right-6 top-12 w-48 bg-white border border-[#d6c9b8] rounded-xl shadow-xl z-50 py-1 flex flex-col text-left animate-fade-in-up">
                              <button 
                                onClick={(e) => { e.stopPropagation(); generateAndPrintPDF(order); }}
                                className="w-full px-4 py-2 text-[13px] text-[#3b2a23] hover:bg-[#faf6f0] flex items-center gap-2 font-medium"
                              >
                                <FileDown size={14} className="text-[#8b6f5a]" /> Download PDF
                              </button>
                              
                              {order.status === 'COMPLETED' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setRefundOrder(order); setActiveMenuId(null); }}
                                  className="w-full px-4 py-2 text-[13px] text-amber-800 hover:bg-amber-50 flex items-center gap-2 font-medium border-t border-[#d6c9b8]/30"
                                >
                                  <RefreshCw size={14} /> Request Refund
                                </button>
                              )}
                              
                              <button 
                                onClick={(e) => { e.stopPropagation(); setDiscrepancyOrder(order); setActiveMenuId(null); }}
                                className="w-full px-4 py-2 text-[13px] text-red-700 hover:bg-red-50 flex items-center gap-2 font-medium"
                              >
                                <AlertTriangle size={14} /> Report Discrepancy
                              </button>
                            </div>
                          )}
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 border-t border-[#d6c9b8] bg-[#faf6f0] flex items-center justify-between">
            <span className="text-[12px] text-[#8b6f5a] font-bold uppercase tracking-wider">{processedOrders.length} {t('recordsFound')}</span>
            <div className="flex items-center gap-3">
              <button className="text-[13px] font-bold text-[#8b6f5a] opacity-50 cursor-not-allowed transition-colors" disabled>Previous</button>
              <span className="text-[13px] text-[#3b2a23] font-bold px-2">1 / 1</span>
              <button className="text-[13px] font-bold text-[#8b6f5a] opacity-50 cursor-not-allowed transition-colors" disabled>Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS & DRAWERS                            */}
      {/* ========================================================================= */}

      {/* 1. ADVANCED FILTERS DRAWER */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-60 flex justify-end">
          <div className="absolute inset-0 bg-[#3b2a23]/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={() => setIsFilterDrawerOpen(false)} />
          <div className="relative w-full max-w-sm bg-[#f5efe6] h-full shadow-2xl shadow-[#3b2a23]/20 flex flex-col animate-fade-in-right border-l border-[#d6c9b8]">
            <div className="px-6 py-5 border-b border-[#d6c9b8] bg-white flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[#3b2a23] flex items-center gap-2"><Filter size={18} className="text-[#8b6f5a]"/> Filter Transactions</h3>
              <button onClick={() => setIsFilterDrawerOpen(false)} className="p-2 text-[#8b6f5a] hover:text-[#3b2a23] hover:bg-[#f5efe6] rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-[#8b6f5a] uppercase tracking-widest">Transaction Status</label>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white border border-[#d6c9b8] rounded-lg px-4 py-3 text-[14px] text-[#3b2a23] font-medium outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
                >
                  <option value="All">All Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-[#d6c9b8] bg-white flex gap-3">
              <button onClick={() => { setStatusFilter('All'); setIsFilterDrawerOpen(false); }} className="flex-1 py-2.5 text-[14px] font-bold text-[#3b2a23] bg-white border border-[#d6c9b8] hover:bg-[#faf6f0] transition-colors rounded-lg shadow-sm">
                Reset
              </button>
              <button onClick={() => setIsFilterDrawerOpen(false)} className="flex-1 bg-[#8b6f5a] hover:bg-[#6c5544] text-white py-2.5 rounded-lg text-[14px] font-bold shadow-sm transition-colors">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. INVOICE / RECEIPT DETAILS DRAWER */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-60 flex justify-end">
          <div className="absolute inset-0 bg-[#3b2a23]/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={() => setSelectedInvoice(null)} />
          <div className="relative w-full max-w-150 bg-[#f5efe6] h-full shadow-2xl shadow-[#3b2a23]/20 flex flex-col animate-fade-in-right border-l border-[#d6c9b8]">
            <div className="px-8 py-6 border-b border-[#d6c9b8] flex items-start justify-between bg-white">
              <div>
                <h2 className="text-[20px] font-bold text-[#3b2a23] mb-1.5">Invoice {selectedInvoice.id}</h2>
                <div className="flex items-center gap-2 text-[13px] font-bold text-[#8b6f5a] uppercase tracking-wider">
                  <span>{selectedInvoice.date}</span>
                  <span className="w-1 h-1 bg-[#d6c9b8] rounded-full" />
                  <span className={selectedInvoice.status === 'COMPLETED' ? 'text-emerald-600' : selectedInvoice.status === 'PROCESSING' ? 'text-amber-600' : 'text-red-600'}>
                    {selectedInvoice.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); generateAndPrintPDF(selectedInvoice); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#d6c9b8] bg-white text-[13px] font-bold text-[#3b2a23] hover:bg-[#faf6f0] transition-colors shadow-sm"
                >
                  <Download size={16} className="text-[#8b6f5a]" /> PDF
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="p-2 text-[#8b6f5a] hover:text-[#3b2a23] hover:bg-[#f5efe6] rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-8 flex-1 overflow-y-auto bg-white">
              <div className="flex justify-between items-start mb-10 pb-10 border-b border-[#d6c9b8] border-dashed">
                <div>
                  <h3 className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest mb-3">Billed To</h3>
                  <div className="flex items-center gap-2 text-[#3b2a23] font-bold text-[16px] mb-1">
                    <Building2 size={18} className="text-[#8b6f5a]" /> Acme Corp Ltd.
                  </div>
                  <p className="text-[14px] text-[#3b2a23]/80 leading-relaxed">Alex Doe<br/>billing@acmecorp.com</p>
                </div>
                <div className="text-right">
                  <h3 className="text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest mb-3">Payment Method</h3>
                  <div className="flex items-center justify-end gap-2 text-[#3b2a23] font-bold text-[16px]">
                    <CreditCard size={18} className="text-[#8b6f5a]" /> {selectedInvoice.payment}
                  </div>
                </div>
              </div>
              <table className="w-full text-left mb-10">
                <thead>
                  <tr className="border-b border-[#3b2a23]">
                    <th className="pb-3 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest">Description</th>
                    <th className="pb-3 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest text-center">Qty</th>
                    <th className="pb-3 text-[11px] font-bold text-[#8b6f5a] uppercase tracking-widest text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d6c9b8]/50">
                  <tr>
                    <td className="py-5">
                      <p className="text-[15px] font-bold text-[#3b2a23]">{selectedInvoice.item}</p>
                      <p className="text-[13px] text-[#8b6f5a] mt-1 font-medium">Dataset Type: {selectedInvoice.type}</p>
                    </td>
                    <td className="py-5 text-center text-[14px] font-bold text-[#3b2a23]">1</td>
                    <td className="py-5 text-right text-[15px] font-mono font-bold text-[#3b2a23]">£{selectedInvoice.total.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="flex justify-end">
                <div className="w-72 bg-[#faf6f0] p-6 rounded-xl border border-[#d6c9b8]">
                  <div className="flex justify-between text-[14px] mb-3">
                    <span className="text-[#8b6f5a] font-bold">Subtotal</span>
                    <span className="text-[#3b2a23] font-mono font-bold">£{selectedInvoice.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[14px] mb-4">
                    <span className="text-[#8b6f5a] font-bold">Tax / VAT (0%)</span>
                    <span className="text-[#3b2a23] font-mono font-bold">£0.00</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-[#d6c9b8] pt-4">
                    <span className="text-[14px] font-bold text-[#3b2a23] uppercase tracking-wider">Total Paid</span>
                    <span className="text-[24px] font-mono font-black text-[#3b2a23] tracking-tight">£{selectedInvoice.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. REQUEST REFUND MODAL */}
      {refundOrder && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#3b2a23]/60 backdrop-blur-sm animate-fade-in" onClick={() => setRefundOrder(null)} />
          <form onSubmit={submitRefundRequest} className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-fade-in-up border border-[#d6c9b8]">
            <div className="px-6 py-5 border-b border-[#d6c9b8] flex items-center justify-between bg-[#faf6f0]">
              <h3 className="text-[18px] font-bold text-[#3b2a23] flex items-center gap-2">
                <RefreshCw size={20} className="text-[#8b6f5a]" /> Request Refund
              </h3>
              <button type="button" onClick={() => setRefundOrder(null)} className="text-[#8b6f5a] hover:text-[#3b2a23] hover:bg-white p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-[13px] text-[#3b2a23]/80 mb-5">
                You are requesting a refund for <strong>{refundOrder.id}</strong>. Our data quality team will review your claim under our 2% bounce rate guarantee.
              </p>
              <div className="flex flex-col gap-2 mb-2">
                <label className="text-[12px] font-bold text-[#8b6f5a] uppercase tracking-widest">Reason for Refund</label>
                <textarea 
                  required
                  rows="4"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Please describe why this dataset did not meet the quality standards..." 
                  className="w-full p-4 bg-white border border-[#d6c9b8] rounded-xl text-[14px] text-[#3b2a23] font-medium outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] resize-none transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-6 border-t border-[#d6c9b8] bg-[#faf6f0]">
              <button type="button" onClick={() => setRefundOrder(null)} className="flex-1 px-4 py-2.5 border border-[#d6c9b8] bg-white text-[#3b2a23] text-[14px] font-bold rounded-xl hover:bg-[#f5efe6] transition-colors shadow-sm">
                Cancel
              </button>
              <button type="submit" className="flex-2 px-4 py-2.5 bg-[#8b6f5a] hover:bg-[#6c5544] text-white text-[14px] font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2">
                <Send size={16} /> Submit Claim
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. REPORT DISCREPANCY MODAL */}
      {discrepancyOrder && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#3b2a23]/60 backdrop-blur-sm animate-fade-in" onClick={() => setDiscrepancyOrder(null)} />
          <form onSubmit={submitDiscrepancyReport} className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-fade-in-up border border-[#d6c9b8]">
            <div className="px-6 py-5 border-b border-[#d6c9b8] flex items-center justify-between bg-red-50">
              <h3 className="text-[18px] font-bold text-red-900 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-600" /> Report Data Issue
              </h3>
              <button type="button" onClick={() => setDiscrepancyOrder(null)} className="text-red-400 hover:text-red-900 hover:bg-red-100 p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <p className="text-[13px] text-[#3b2a23]/80">
                Found an issue with <strong>{discrepancyOrder.id}</strong>? Let us know so our support team can investigate the records.
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-[#8b6f5a] uppercase tracking-widest">Issue Type</label>
                <select 
                  value={discrepancyType}
                  onChange={(e) => setDiscrepancyType(e.target.value)}
                  className="w-full bg-white border border-[#d6c9b8] rounded-xl px-4 py-3 text-[14px] text-[#3b2a23] font-medium outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a]"
                >
                  <option>High Bounce Rate</option>
                  <option>Incorrect Contact Titles</option>
                  <option>Formatting Errors in CSV</option>
                  <option>Other / Misc</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-[#8b6f5a] uppercase tracking-widest">Details</label>
                <textarea 
                  required
                  rows="3"
                  value={discrepancyDetails}
                  onChange={(e) => setDiscrepancyDetails(e.target.value)}
                  placeholder="Provide context on the corrupted or incorrect data..." 
                  className="w-full p-4 bg-white border border-[#d6c9b8] rounded-xl text-[14px] text-[#3b2a23] font-medium outline-none focus:border-[#8b6f5a] focus:ring-1 focus:ring-[#8b6f5a] resize-none transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-6 border-t border-[#d6c9b8] bg-[#faf6f0]">
              <button type="button" onClick={() => setDiscrepancyOrder(null)} className="flex-1 px-4 py-2.5 border border-[#d6c9b8] bg-white text-[#3b2a23] text-[14px] font-bold rounded-xl hover:bg-[#f5efe6] transition-colors shadow-sm">
                Cancel
              </button>
              <button type="submit" className="flex-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-[14px] font-bold shadow-sm transition-colors flex items-center justify-center gap-2">
                <Send size={16} /> Submit Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. DOWNLOAD RECEIPT TOAST / OVERLAY */}
      {downloadingReceiptId && (
        <div className="fixed bottom-10 right-10 z-80 bg-[#3b2a23] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-fade-in-up border border-[#8b6f5a]">
          <Loader2 size={24} className="text-[#d6c9b8] animate-spin" />
          <div>
            <p className="text-[14px] font-bold">Generating PDF...</p>
            <p className="text-[12px] text-[#d6c9b8] font-medium mt-0.5">Preparing receipt for {downloadingReceiptId}</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrderHistory;