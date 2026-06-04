import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireAdmin } from './middleware/auth.middleware';
import { CoreService } from '../services/core.services';
import { PDFGenerator } from '../services/pdf.service'; 
import { MailerService } from '../services/mailer.service';
// @ts-ignore: pdfkit has no bundled TypeScript declarations in this project
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const router = Router();

// 1. Get all invoices with their items
router.get('/', requireAuth, requireAdmin, CoreService.catchAsync(async (req: Request, res: Response) => {
  const invoices = await prisma.invoice.findMany({
    orderBy: { date: 'desc' },
    include: { items: true, workspace: true }
  });
  return CoreService.success(res, 200, 'Invoices fetched', { invoices });
}));

// 2. Create/Update (Upsert) Invoice
router.post('/upsert', requireAuth, requireAdmin, CoreService.catchAsync(async (req: Request, res: Response) => {
  const { id, description, amount, status, date, workspaceId, items } = req.body;

  // Use a transaction to ensure atomic creation/update
  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.upsert({
      where: { id },
      update: { description, amount: parseFloat(amount), status, date: new Date(date) },
      create: {
        id, 
        description,
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
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const pdfPath = path.join(tempDir, `INV-${invoice.id}.pdf`);
    
    // Fetch full invoice details with relations to ensure complete PDF layout context
    const fullInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { items: true, workspace: true }
    });

    if (fullInvoice) {
      // Build file write stream directly using PDFKit to bypass HTTP response headers
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      // Render Layout Content
      doc.fontSize(20).text('INVOICE', { align: 'right' });
      doc.fontSize(10).text(`Invoice ID: ${fullInvoice.id}`);
      doc.text(`Date: ${new Date(fullInvoice.date).toLocaleDateString()}`);
      doc.moveDown();

      // Table Header
      doc.fontSize(12).font('Helvetica-Bold')
         .text('Description', 50, 150)
         .text('Qty', 350, 150)
         .text('Price', 450, 150);
      doc.moveTo(50, 165).lineTo(550, 165).stroke();

      // Table Rows
      let y = 180;
      if (fullInvoice.items && fullInvoice.items.length > 0) {
        fullInvoice.items.forEach((item: any) => {
          doc.font('Helvetica').fontSize(10)
             .text(item.package?.brand || item.packageId || 'Data Package', 50, y)
             .text(item.quantity.toString(), 350, y)
             .text(`£${Number(item.priceAtPurchase).toFixed(2)}`, 450, y);
          y += 20;
        });
      } else {
        doc.font('Helvetica').fontSize(10)
           .text(fullInvoice.description || 'Workspace Deposit', 50, y)
           .text('1', 350, y)
           .text(`£${Number(fullInvoice.amount).toFixed(2)}`, 450, y);
        y += 20;
      }

      // Total Section
      doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();
      doc.font('Helvetica-Bold').fontSize(12)
         .text(`Total Amount: £${Number(fullInvoice.amount).toFixed(2)}`, 350, y + 30);

      doc.end();

      // Ensure file write finishes safely before dispatching mail worker
      await new Promise((resolve) => writeStream.on('finish', resolve));

      const workspace = await prisma.workspace.findUnique({ 
        where: { id: workspaceId }, 
        include: { users: true } 
      });
      
      if (workspace?.users && workspace.users.length > 0) {
        await MailerService.send({
          to: workspace.users[0].email,
          templateName: 'INVOICE_CONFIRMATION',
          context: { 
            name: workspace.users[0].firstName, 
            invoiceId: fullInvoice.id, 
            total: fullInvoice.amount 
          },
          attachments: [{ filename: `Receipt-${fullInvoice.id}.pdf`, path: pdfPath }]
        });
        
        // Post-execution clean up
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      }
    }
  }

  return CoreService.success(res, 200, 'Invoice saved', { invoice });
}));

// 3. Download PDF Endpoint (Optimized via HTTP Streaming)
router.get('/download/:id', requireAuth, requireAdmin, CoreService.catchAsync(async (req: Request, res: Response) => {
  const invoice = await prisma.invoice.findUnique({ 
    where: { id: req.params.id as string },
    include: { items: true, workspace: true } 
  });
  
  if (!invoice) return CoreService.error(res, 404, 'Invoice not found');

  // Stream data immediately to response stream without blocking filesystem
  return PDFGenerator.streamInvoiceToResponse(invoice, res);
}));

// 4. Delete Invoice
router.delete('/:id', requireAuth, requireAdmin, CoreService.catchAsync(async (req: Request, res: Response) => {
  await prisma.invoice.delete({ where: { id: req.params.id as string } });
  return CoreService.success(res, 200, 'Invoice deleted');
}));

export default router;