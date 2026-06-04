import prisma from '../db';

export const DepositService = {
  async finalizeDeposit(
    userId: string, 
    workspaceId: string, 
    stripeIntentId: string, 
    amountAdded: number
  ) {
    
    // 1. FAST IDEMPOTENCY CHECK (Outside transaction to save DB locks)
    // We use a DEP- prefix to distinguish deposits from data purchases (INV-)
    const existingInvoice = await prisma.invoice.findUnique({ 
      where: { id: `DEP-${stripeIntentId}` }
    });
    
    if (existingInvoice) {
      console.log(`[DEPOSIT] Deposit DEP-${stripeIntentId} already exists. Skipping.`);
      // Fetch the workspace to return the current balance safely
      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      return { invoice: existingInvoice, isDuplicate: true, newBalance: workspace?.balance };
    }

    return await prisma.$transaction(async (tx) => {

      // 2. ATOMIC INVOICE/RECEIPT CREATION
      let invoice;
      try {
        invoice = await tx.invoice.create({
          data: {
            id: `DEP-${stripeIntentId}`,
            description: 'Workspace Balance Deposit',
            amount: amountAdded,
            status: 'COMPLETED',
            workspaceId: workspaceId,
            // Assuming your schema allows invoices without line items for simple deposits.
            // If it strictly requires items, you can create a dummy "Deposit" package/item.
          }
        });
      } catch (error: any) {
        // ULTIMATE RACE CONDITION GUARD
        if (error.code === 'P2002') {
          console.warn(`[DEPOSIT] Race condition mitigated for ${stripeIntentId}.`);
          const duplicate = await tx.invoice.findUnique({ where: { id: `DEP-${stripeIntentId}` } });
          const workspace = await tx.workspace.findUnique({ where: { id: workspaceId } });
          return { invoice: duplicate, isDuplicate: true, newBalance: workspace?.balance };
        }
        throw error;
      }

      // 3. BUSINESS LOGIC: Value Delivery (Increment Workspace Balance)
      const updatedWorkspace = await tx.workspace.update({
        where: { id: workspaceId },
        data: { balance: { increment: amountAdded } }
      });

      // 4. Audit Logging
      await tx.activityLog.create({
        data: {
          action: 'FUNDS_DEPOSITED',
          userId,
          metadata: { 
            invoiceId: invoice.id, 
            stripeIntentId,
            amountAdded: amountAdded,
            newBalance: updatedWorkspace.balance,
            source: 'FRONTEND_FINALIZE'
          }
        }
      });

      return { 
        invoice, 
        isDuplicate: false, 
        newBalance: updatedWorkspace.balance 
      };
    });
  }
};