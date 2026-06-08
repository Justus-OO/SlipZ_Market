import { Router, Response } from 'express';
import { requireAuth } from './middleware/auth.middleware';
import { CoreService } from '../services/core.services';
import { ReportService } from '../services/report.service';
import prisma from '../db';

const router = Router();

router.get('/download/:type', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const { type } = req.params;
  const { workspaceId } = req.user;
  const { startDate, endDate } = req.query;

  const templateMap: Record<string, string> = {
    'tax': 'tax-report',
    'perf': 'pipeline-report',
    'inv': 'inventory-report',
    'summary': 'workspace-summary',
    'audit': 'audit-report',
    'pipeline': 'pipeline-report'
  };

  const templateName = templateMap[type];
  if (!templateName) {
    return res.status(400).json({ error: `Invalid report type: ${type}` });
  }

  // Fetch the combined data (leads + logo)
  const reportData = await getReportDataByType(type, workspaceId, { 
    startDate: startDate as string, 
    endDate: endDate as string 
  });

  try {
    // Generate the HTML/PDF using the registry-based service
    const pdfBuffer = await ReportService.generatePDF(templateName, reportData);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${Date.now()}.pdf"`);
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error('[REPORT_GEN_ERROR]', err);
    return res.status(500).json({ error: 'Failed to generate report' });
  }
}));

async function getReportDataByType(type: string, workspaceId: string, filters: { startDate?: string, endDate?: string }) {
  // 1. Fetch Workspace for dynamic logo
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  
  // 2. Build dynamic date filter
  const dateFilter: any = {};
  if (filters.startDate && filters.endDate) {
    dateFilter.unlockedAt = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate)
    };
  }

  // 3. Fetch data
  const leads = await prisma.unlockedLead.findMany({ 
    where: { 
      workspaceId,
      ...dateFilter 
    }, 
    include: { lead: true } 
  });
  
  const formattedLeads = leads.map(l => l.lead);

  // 4. Return unified object containing logoUrl
  const baseData = { 
    leads: formattedLeads, 
    logoUrl: workspace?.logoUrl || 'https://your-default-logo.png',
    date: new Date().toLocaleDateString()
  };

  switch (type) {
    case 'tax':
      return { ...baseData, title: 'Fiscal Tax Report' };
    case 'perf':
      return { ...baseData, title: 'Sales Performance', industry: 'All' };
    case 'inv':
      return { ...baseData, title: 'Stock Valuation' };
    case 'summary':
      return { ...baseData, title: 'Workspace Summary', totalLeads: leads.length };
    case 'audit':
      return { ...baseData, title: 'Verification Audit', qualityScore: 98 };
    default:
      return { ...baseData, title: 'Report' };
  }
}

export default router;