import { Router, Response } from 'express';
import { requireAuth } from './middleware/auth.middleware';
import { CoreService } from '../services/core.services';
import prisma from '../db';
import NotificationService from '../services/notification.service.js';
import { Parser } from 'json2csv';

const router = Router();

// 1. GET PURCHASED DATASETS (For the UI Table)
router.get('/my-datasets', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const workspaceId = req.user.workspaceId;

  // Fetch all completed invoices that actually have unlocked leads attached
  const invoices = await prisma.invoice.findMany({
    where: { 
      workspaceId, 
      status: 'COMPLETED' 
    },
    include: {
      _count: {
        select: { unlockedLeads: true }
      }
    },
    orderBy: { date: 'desc' }
  });

  // Map into a clean UI format. 
  // Each invoice essentially acts as a "Custom Dataset Container"
const ownedDatasets = invoices
    // Safely check if _count and unlockedLeads exist, defaulting to 0
    .filter(inv => (inv._count?.unlockedLeads || 0) > 0) 
    .map(inv => ({
      invoiceId: inv.id,
      date: inv.date, // 👈 UPDATED: Changed from inv.createdAt to inv.date
      leadsCount: inv._count?.unlockedLeads || 0,
      description: inv.description || 'Custom Data Export',
      filters: (inv as any).queryCriteria || {} 
    }));
  return CoreService.success(res, 200, 'Datasets fetched', { datasets: ownedDatasets });
}));

// 2. DOWNLOAD CSV ENDPOINT (Now driven by Invoice ID instead of Package ID)
router.get('/download/:invoiceId', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const { invoiceId } = req.params;
  const workspaceId = req.user.workspaceId;

  // A. SECURITY CHECK: Verify this workspace actually owns this invoice
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      workspaceId: workspaceId,
      status: 'COMPLETED'
    }
  });

  if (!invoice) {
    return res.status(403).json({ error: 'Unauthorized. You do not own this dataset.' });
  }

  // B. FETCH THE ACTUAL LEADS
  // Pull the relationship from UnlockedLead to MasterLead
  const unlockedRecords = await prisma.unlockedLead.findMany({
    where: { invoiceId: invoiceId },
    include: {
      lead: true // This grabs the actual MasterLead data
    }
  });

  if (unlockedRecords.length === 0) {
    return res.status(404).json({ error: 'No data found for this dataset.' });
  }

  // C. FLATTEN THE DATA FOR THE CSV
  const leadsToExport = unlockedRecords.map(record => ({
    FirstName: record.lead.firstName || '',
    LastName: record.lead.lastName || '',
    Email: record.lead.email || '',
    Phone: record.lead.phone || 'N/A',
    JobTitle: record.lead.jobTitle || '',
    CompanyName: record.lead.companyName || '',
    Industry: record.lead.industry || '',
    Country: record.lead.country || ''
  }));

  // D. GENERATE CSV
  const json2csvParser = new Parser();
  const csvData = json2csvParser.parse(leadsToExport);

  // E. STREAM TO BROWSER AS A FILE DOWNLOAD
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="SlipZMarket_Export_${invoiceId}.csv"`);
  
  return res.status(200).send(csvData);
}));


// Add this right below your existing '/download/:invoiceId' route
router.get('/:invoiceId/json', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const { invoiceId } = req.params;
  const workspaceId = req.user.workspaceId;

  // 1. Verify Ownership
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId, status: 'COMPLETED' }
  });

  if (!invoice) return CoreService.error(res, 403, 'Unauthorized access to dataset');

  // 2. Fetch the raw leads
  const unlockedRecords = await prisma.unlockedLead.findMany({
    where: { invoiceId },
    include: { lead: true }
  });

  // 3. Format securely for the frontend
  const leads = unlockedRecords.map(record => ({
    id: record.lead.id,
    firstName: record.lead.firstName || '',
    lastName: record.lead.lastName || '',
    email: record.lead.email || '',
    phone: record.lead.phone || 'N/A',
    jobTitle: record.lead.jobTitle || '',
    companyName: record.lead.companyName || '',
    industry: record.lead.industry || '',
    country: record.lead.country || ''
  }));

  return CoreService.success(res, 200, 'Data loaded', { leads });
}));

// --- DELETE ENTIRE DATASET ---
router.delete('/:invoiceId', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const { invoiceId } = req.params;
  const workspaceId = req.user.workspaceId;

  // Verify ownership
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId }
  });

  if (!invoice) return CoreService.error(res, 403, 'Unauthorized access');

  // Delete the data mapping (keeps the financial invoice intact for receipts)
  await prisma.unlockedLead.deleteMany({
    where: { invoiceId, workspaceId }
  });

  await NotificationService.sendToUser(req.user.userId, {
    title: 'Dataset Removed',
    message: `The dataset associated with Invoice ${invoiceId} was removed from your workspace. Your invoice record is still available for reference.`,
    type: 'INFO',
    link: '/dashboard/history'
  });

  return CoreService.success(res, 200, 'Dataset deleted successfully');
}));

// --- REMOVE SPECIFIC LEADS FROM A DATASET ---
router.post('/:invoiceId/remove-leads', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const { invoiceId } = req.params;
  const { leadIds } = req.body; // Array of lead IDs
  const workspaceId = req.user.workspaceId;

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return CoreService.error(res, 400, 'No leads provided for deletion');
  }

  await prisma.unlockedLead.deleteMany({
    where: { 
      invoiceId, 
      workspaceId,
      leadId: { in: leadIds }
    }
  });

  await NotificationService.sendToUser(req.user.userId, {
    title: 'Dataset Updated',
    message: `${leadIds.length} lead(s) were removed from dataset ${invoiceId}.`,
    type: 'INFO',
    link: `/datasets/${invoiceId}`
  });

  return CoreService.success(res, 200, 'Selected leads removed');
}));



export default router;