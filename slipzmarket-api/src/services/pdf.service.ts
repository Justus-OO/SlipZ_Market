// @ts-ignore: pdfkit has no bundled TypeScript declarations in this project
import PDFDocument from 'pdfkit';
import { Response } from 'express';

export const PDFGenerator = {
  // Pass the Express 'res' object into this function
  streamInvoiceToResponse(invoiceData: any, res: Response) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // 1. Set the headers so the browser knows it's receiving a PDF file
    res.setHeader('Content-disposition', `attachment; filename="Receipt-${invoiceData.id}.pdf"`);
    res.setHeader('Content-type', 'application/pdf');

    // 2. Pipe the PDF directly to the HTTP response
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('INVOICE', { align: 'right' });
    doc.fontSize(10).text(`Invoice ID: ${invoiceData.id}`);
    doc.text(`Date: ${new Date(invoiceData.date).toLocaleDateString()}`);
    doc.moveDown();

    // Table Header
    doc.fontSize(12).font('Helvetica-Bold')
       .text('Description', 50, 150)
       .text('Qty', 350, 150)
       .text('Price', 450, 150);
    doc.moveTo(50, 165).lineTo(550, 165).stroke();

    // Table Rows
    let y = 180;
    
    // Support both cart purchases (items) and direct balance deposits (no items)
    if (invoiceData.items && invoiceData.items.length > 0) {
      invoiceData.items.forEach((item: any) => {
        doc.font('Helvetica').fontSize(10)
           .text(item.package?.brand || item.packageId || 'Data Package', 50, y)
           .text(item.quantity.toString(), 350, y)
           .text(`£${Number(item.priceAtPurchase).toFixed(2)}`, 450, y);
        y += 20;
      });
    } else {
      doc.font('Helvetica').fontSize(10)
         .text(invoiceData.description || 'Workspace Deposit', 50, y)
         .text('1', 350, y)
         .text(`£${Number(invoiceData.amount).toFixed(2)}`, 450, y);
      y += 20;
    }

    // Total
    doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();
    doc.font('Helvetica-Bold').fontSize(12)
       .text(`Total Amount: £${Number(invoiceData.amount).toFixed(2)}`, 350, y + 30);

    // 3. Finalize the document (this automatically closes the HTTP response)
    doc.end();
  }
};