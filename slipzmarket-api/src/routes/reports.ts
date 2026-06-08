import { Router, Response } from 'express';
import { requireAuth } from './middleware/auth.middleware';
import { CoreService } from '../services/core.services';
import { ReportService } from '../services/report.service';
import prisma from '../db';

const router = Router();

router.get('/download/workspace-summary', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const { userId, workspaceId } = req.user;

  // 1. Fetch the data you want to inject into the report
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  // Example: Fetching unlocked leads for this workspace
  const unlockedRecords = await prisma.unlockedLead.findMany({
    where: { workspaceId },
    include: { lead: true },
    take: 100 // Limit for the PDF example
  });

  const formattedLeads = unlockedRecords.map(record => record.lead);

  // 2. Prepare the exact data structure your .hbs template expects
  const reportData = {
    title: 'Workspace Lead Allocation Report',
    workspaceName: 'Main Workspace', // Fetch actual workspace name if needed
    date: new Date().toLocaleDateString(),
    userName: `${user?.firstName} ${user?.lastName}`,
    totalLeads: formattedLeads.length,
    leads: formattedLeads
  };

  // 3. Call the reusable service
  // 'workspace-summary' matches the name of your file in the templates folder
  const pdfBuffer = await ReportService.generatePDF('workspace-summary', reportData);

  // 4. Send the file to the client as a download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="SlipZMarket_Report_${Date.now()}.pdf"`);
  
  return res.status(200).send(pdfBuffer);
}));

export default router;