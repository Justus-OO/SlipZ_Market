import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireAdmin } from './middleware/auth.middleware';
import { CoreService } from '../services/core.services';
import { PDFGenerator } from '../services/pdf.service'; // Ensure consistent naming
import { MailerService } from '../services/mailer.service';
import fs from 'fs';
import path from 'path';

const router = Router();

// 1. Get all invoices with their items
router.get('/', requireAuth, requireAdmin, CoreService.catchAsync(async (req: Request | any, res: Response) => {
  const invoices = await prisma.invoice.findMany({
    orderBy: { date: 'desc' },
    include: { items: true, workspace: true }
  });
  return CoreService.success(res, 200, 'Invoices fetched', { invoices });
}));

// 2. Create/Update (Upsert) Invoice
router.post('/upsert', requireAuth, requireAdmin, CoreService.catchAsync(async (req: Request | any, res: Response) => {
  const { id, description, amount, status, date, workspaceId, items } = req.body;

  // Use a transaction to ensure atomic creation/update
  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.upsert({
      where: { id },
      update: { description, amount: parseFloat(amount), status, date: new Date(date) },
      create: {
        id, description,
        amount: parseFloat(amount),
        status,
        date: new Date(date),
        workspaceId,
        items: { create: items } 
      }
    });
    return inv;
  });

  // AUTO-TRIGGER: If invoice is marked COMPLETED, email the client
  if (status === 'COMPLETED') {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    
    const pdfPath = path.join(tempDir, `INV-${invoice.id}.pdf`);
    
    // Generate PDF using consistent service name
    await PDFGenerator.generateInvoice(invoice, pdfPath);
    
    const workspace = await prisma.workspace.findUnique({ 
        where: { id: workspaceId }, include: { users: true } 
    });
    
    if (workspace?.users[0]) {
      await MailerService.send({
        to: workspace.users[0].email,
        templateName: 'INVOICE_CONFIRMATION',
        context: { name: workspace.users[0].firstName, invoiceId: invoice.id, total: invoice.amount },
        attachments: [{ filename: 'Receipt.pdf', path: pdfPath }]
      });
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    }
  }

  return CoreService.success(res, 200, 'Invoice saved', { invoice });
}));

// 3. Download PDF Endpoint
router.get('/download/:id', requireAuth, requireAdmin, CoreService.catchAsync(async (req: Request | any, res: Response) => {
  const invoice = await prisma.invoice.findUnique({ 
    where: { id: req.params.id },
    include: { items: true } 
  });
  
  if (!invoice) return CoreService.error(res, 404, 'Invoice not found');

  const pdfPath = path.join(process.cwd(), 'temp', `INV-${invoice.id}.pdf`);
  await PDFGenerator.generateInvoice(invoice, pdfPath);

  res.download(pdfPath, `Invoice-${invoice.id}.pdf`, (err: any) => {
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  });
}));

// 4. Delete Invoice
router.delete('/:id', requireAuth, requireAdmin, CoreService.catchAsync(async (req: Request | any, res: Response) => {
  await prisma.invoice.delete({ where: { id: req.params.id } });
  return CoreService.success(res, 200, 'Invoice deleted');
}));

export default router;