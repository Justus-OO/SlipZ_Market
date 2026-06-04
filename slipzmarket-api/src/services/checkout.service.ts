import prisma from '../db';
import { MailerService } from './mailer.service'; // Adjust path if necessary

export const CheckoutService = {
  async completeOrder(
    userId: string, 
    workspaceId: string, 
    stripeIntentId: string, 
    stripeAmountPaid: number,
    billingDetails?: { companyName: string; firstName: string; lastName: string; email: string; } 
  ) {
    
    // Fetch user upfront so we have their email in case the transaction fails
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true } });
    const targetEmail = billingDetails?.email || user?.email;
    const targetName = billingDetails?.firstName || user?.firstName || 'User';

    // 1. FAST IDEMPOTENCY CHECK
    const existingInvoice = await prisma.invoice.findUnique({ 
      where: { id: `INV-${stripeIntentId}` },
      include: { workspace: { include: { users: true } } } 
    });
    
    if (existingInvoice) {
      console.log(`[CHECKOUT] Invoice INV-${stripeIntentId} already exists. Skipping.`);
      return { invoice: existingInvoice, isDuplicate: true };
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 2. Fetch cart items
        const cartItems = await tx.cartItem.findMany({ 
          where: { userId },
          include: { package: true } 
        });
        
        if (cartItems.length === 0) {
          throw new Error('ORDER_ABORTED: Cart is empty or was already cleared.');
        }

        // 3. PRICE INTEGRITY VERIFICATION (Anti-Tamper Check)
        const calculatedTotal = cartItems.reduce((acc, item) => acc + (Number(item.package.price) * item.quantity), 0);
        if (Math.abs(calculatedTotal - stripeAmountPaid) > 0.01) { 
          throw new Error(`ORDER_ABORTED: Price mismatch. Cart Total: £${calculatedTotal}, Paid: £${stripeAmountPaid}`);
        }

        // 4. Upsert Billing Profile
        if (billingDetails) {
          await tx.billingProfile.upsert({
            where: { userId },
            update: billingDetails,
            create: { userId, ...billingDetails }
          });
        }

        // 5. ATOMIC INVOICE CREATION
        let invoice;
        try {
          invoice = await tx.invoice.create({
            data: {
              id: `INV-${stripeIntentId}`,
              description: 'SlipZMarket Data Package Purchase',
              amount: stripeAmountPaid,
              status: 'COMPLETED',
              workspaceId: workspaceId,
              items: {
                create: cartItems.map(item => ({
                  packageId: item.packageId,
                  quantity: item.quantity,
                  priceAtPurchase: item.package.price
                }))
              }
            }
          });
        } catch (error: any) {
          // ULTIMATE RACE CONDITION GUARD
          if (error.code === 'P2002') {
            console.warn(`[CHECKOUT] Race condition mitigated for ${stripeIntentId}.`);
            const duplicate = await tx.invoice.findUnique({ where: { id: `INV-${stripeIntentId}` } });
            return { invoice: duplicate, isDuplicate: true, receiptData: { totalLeadsUnlocked: 0 } };
          }
          throw error; // Rethrow to trigger rollback
        }

        // 6. BUSINESS LOGIC: Dynamic Data Allocation (Unlocking Leads)
        let totalLeadsUnlocked = 0;

        for (const item of cartItems) {
          const requiredLeadsCount = item.package.leadsCount * item.quantity;

          const alreadyOwned = await tx.unlockedLead.findMany({
            where: { workspaceId },
            select: { leadId: true }
          });
          const ownedIds = alreadyOwned.map(ol => ol.leadId);

          const freshLeads = await tx.masterLead.findMany({
            where: { id: { notIn: ownedIds } },
            take: requiredLeadsCount,
            select: { id: true }
          });

          // C. Inventory Check: Abort transaction if we run out of fresh data
          if (freshLeads.length < requiredLeadsCount) {
            throw new Error(`INSUFFICIENT_DATA: We do not have enough fresh leads for ${item.package.brand}. Required: ${requiredLeadsCount}, Available: ${freshLeads.length}`);
          }

          // D. Create the UnlockedLead records binding the data to this workspace
          const unlockData = freshLeads.map(lead => ({
            workspaceId,
            leadId: lead.id,
            invoiceId: invoice.id
          }));

          await tx.unlockedLead.createMany({ data: unlockData });
          totalLeadsUnlocked += freshLeads.length;
        }

        // 7. Clear Cart
        await tx.cartItem.deleteMany({ where: { userId } });

        // 8. Audit Logging
        await tx.activityLog.create({
          data: {
            action: 'PAYMENT_CONFIRMED',
            userId,
            metadata: { 
              invoiceId: invoice?.id, 
              stripeIntentId,
              leadsUnlocked: totalLeadsUnlocked,
              amountPaid: stripeAmountPaid,
              source: billingDetails ? 'FRONTEND_FINALIZE' : 'STRIPE_WEBHOOK'
            }
          }
        });

        return { 
          invoice, 
          isDuplicate: false, 
          receiptData: { email: targetEmail, name: targetName, totalLeadsUnlocked } 
        };
      });

      // --- 🟢 SUCCESS EMAIL TRIGGER ---
      // We send this outside the transaction so network delays don't hold the DB locks open
      if (!result.isDuplicate && targetEmail && result.invoice) {
        // Run in background (do not await) so response is fast
        MailerService.send({
          to: targetEmail,
          templateName: 'order-success',
          context: {
            name: targetName,
            invoiceId: result.invoice.id,
            amount: stripeAmountPaid,
            leadsUnlocked: result.receiptData.totalLeadsUnlocked
          }
        }).catch(err => console.error("Failed to send success email:", err));
      }

      return result;

    } catch (error: any) {
      // --- 🔴 FAILURE EMAIL TRIGGER ---
      // If the transaction threw an error (price mismatch, insufficient data, etc.)
      
      // We ignore empty cart errors since that implies they already checked out or abandoned
      if (targetEmail && !error.message.includes('Cart is empty')) {
        MailerService.send({
          to: targetEmail,
          templateName: 'order-failed',
          context: {
            name: targetName,
            errorMessage: error.message.replace('ORDER_ABORTED: ', '').replace('INSUFFICIENT_DATA: ', '')
          }
        }).catch(err => console.error("Failed to send failure email:", err));
      }

      // Rethrow the error so the calling controller/webhook knows it failed
      throw error;
    }
  }
};