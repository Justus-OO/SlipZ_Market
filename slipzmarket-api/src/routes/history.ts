import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth } from './middleware/auth.middleware';
import { CoreService } from '../services/core.services';

const router = Router();
router.use(requireAuth);

// 1. GET ALL INVOICES FOR WORKSPACE
router.get('/', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const invoices = await prisma.invoice.findMany({
    where: { workspaceId: req.user.workspaceId },
    orderBy: { date: 'desc' },
    include: { items: true } // Include items to show in the UI
  });

  return CoreService.success(res, 200, 'History fetched', { invoices });
}));

router.post('/report-issue', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const { invoiceId, type, details, actionType } = req.body; 
  const userId = req.user.userId;

  // Create a proper Support Ticket in the DB
  const ticket = await prisma.supportTicket.create({
    data: {
      invoiceId,
      userId,
      type: actionType, // 'REFUND' or 'DISCREPANCY'
      message: details,
      status: 'OPEN'
    }
  });

  // Log the activity
  await prisma.activityLog.create({
    data: {
      action: `TICKET_CREATED_${actionType}`,
      userId,
      metadata: { invoiceId, ticketId: ticket.id }
    }
  });

  return CoreService.success(res, 201, 'Request submitted successfully');
}));

export default router;