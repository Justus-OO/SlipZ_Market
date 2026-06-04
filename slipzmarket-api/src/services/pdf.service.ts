// @ts-ignore: pdfkit has no bundled TypeScript declarations in this project
import PDFDocument from 'pdfkit';
import { Response } from 'express';

export const PDFGenerator = {
  /**
   * Generates a beautifully styled invoice PDF and pipes it directly
   * to the Express Response object. Bypasses the filesystem entirely.
   */
  streamInvoiceToResponse(invoiceData: any, res: Response) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // 1. Set the headers so the browser knows it's receiving a PDF file download
    res.setHeader('Content-disposition', `attachment; filename="SlipZMarket-Receipt-${invoiceData.id}.pdf"`);
    res.setHeader('Content-type', 'application/pdf');

    // 2. Pipe the PDF directly to the HTTP response
    doc.pipe(res);

    // 3. Build the Document Layers
    this.generateHeader(doc);
    this.generateCustomerInformation(doc, invoiceData);
    this.generateInvoiceTable(doc, invoiceData);
    this.generateFooter(doc);

    // 4. Finalize the document (this automatically closes the HTTP response)
    doc.end();
  },

  // =========================================
  // --- LAYOUT HELPERS ---
  // =========================================

  generateHeader(doc: any) {
    doc
      .fillColor('#3b2a23')
      .fontSize(20)
      .text('SlipZMarket B2B', 50, 45)
      .fontSize(10)
      .fillColor('#8b6f5a')
      .text('Premium Data Solutions', 50, 70)
      .text('support@slipzmarket.com', 50, 85)
      .text('London, United Kingdom', 50, 100)
      .moveDown();
  },

  generateCustomerInformation(doc: any, invoice: any) {
    doc
      .fillColor('#3b2a23')
      .fontSize(20)
      .text('INVOICE', 50, 160);

    this.generateHr(doc, 185);

    const customerInformationTop = 200;

    // Left Column: Invoice Details
    doc
      .fontSize(10)
      .fillColor('#8b6f5a')
      .text('Invoice Number:', 50, customerInformationTop)
      .font('Helvetica-Bold')
      .fillColor('#3b2a23')
      .text(invoice.id, 150, customerInformationTop)
      
      .font('Helvetica')
      .fillColor('#8b6f5a')
      .text('Invoice Date:', 50, customerInformationTop + 15)
      .fillColor('#3b2a23')
      .text(this.formatDate(invoice.date || new Date()), 150, customerInformationTop + 15)
      
      .fillColor('#8b6f5a')
      .text('Amount Paid:', 50, customerInformationTop + 30)
      .fillColor('#3b2a23')
      .text(this.formatCurrency(invoice.amount), 150, customerInformationTop + 30);

    // Right Column: Customer Details
    doc
      .font('Helvetica-Bold')
      .fillColor('#8b6f5a')
      .text('Billed To:', 300, customerInformationTop)
      .font('Helvetica')
      .fillColor('#3b2a23')
      .text(invoice.workspace?.name || 'Workspace Customer', 300, customerInformationTop + 15)
      .text(`Status: ${invoice.status || 'COMPLETED'}`, 300, customerInformationTop + 30);

    this.generateHr(doc, 252);
  },

  generateInvoiceTable(doc: any, invoice: any) {
    const invoiceTableTop = 330;

    // Table Headers
    doc.font('Helvetica-Bold').fillColor('#8b6f5a');
    this.generateTableRow(doc, invoiceTableTop, 'Item / Brand', 'Description', 'Unit Price', 'Qty', 'Line Total');
    this.generateHr(doc, invoiceTableTop + 20);
    doc.font('Helvetica').fillColor('#3b2a23');

    let position = invoiceTableTop + 30;

    // Handle both Data Packages and Wallet Deposits
    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item: any) => {
        const unitPrice = Number(item.priceAtPurchase);
        const lineTotal = unitPrice * item.quantity;
        const title = item.package?.brand || item.packageId || 'Data Package';

        this.generateTableRow(
          doc,
          position,
          title,
          'B2B Data Leads',
          this.formatCurrency(unitPrice),
          item.quantity.toString(),
          this.formatCurrency(lineTotal)
        );

        this.generateHr(doc, position + 20);
        position += 30;
      });
    } else {
      // Fallback for flat deposits or custom invoices without package items
      const unitPrice = Number(invoice.amount);
      this.generateTableRow(
        doc,
        position,
        'Workspace Balance',
        invoice.description || 'Wallet Deposit',
        this.formatCurrency(unitPrice),
        '1',
        this.formatCurrency(unitPrice)
      );
      this.generateHr(doc, position + 20);
      position += 30;
    }

    // Totals Row
    const subtotalPosition = position + 10;
    doc.font('Helvetica-Bold').fillColor('#3b2a23');
    this.generateTableRow(doc, subtotalPosition, '', '', '', 'Total Paid:', this.formatCurrency(invoice.amount));
    doc.font('Helvetica');
  },

  generateFooter(doc: any) {
    doc
      .fontSize(10)
      .fillColor('#8b6f5a')
      .text(
        'Payment has been received in full. Thank you for your business.',
        50,
        700,
        { align: 'center', width: 500 }
      );
  },

  // =========================================
  // --- UTILITY HELPERS ---
  // =========================================

  generateTableRow(doc: any, y: number, item: string, description: string, unitCost: string, quantity: string, lineTotal: string) {
    doc
      .fontSize(10)
      .text(item, 50, y, { width: 140 }) 
      .text(description, 190, y) 
      .text(unitCost, 280, y, { width: 90, align: 'right' })
      .text(quantity, 370, y, { width: 50, align: 'right' })
      .text(lineTotal, 0, y, { align: 'right' });
  },

  generateHr(doc: any, y: number) {
    doc.strokeColor('#d6c9b8').lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
  },

  formatCurrency(amount: number) {
    return `£${Number(amount).toFixed(2)}`;
  },

  formatDate(date: Date | string) {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
};