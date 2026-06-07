import prisma from '../db.js';
import { MailerService } from './mailer.service.js';
import * as NotificationModule from './notification.service.js';

const NotificationService = (NotificationModule as any).NotificationService
  || (NotificationModule as any).default?.NotificationService
  || (NotificationModule as any).default
  || (NotificationModule as any);

export const CheckoutService = {
async completeOrder(
    userId: string, 
    workspaceId: string, 
    stripeIntentId: string, 
    stripeAmountPaid: number,
    billingDetails?: { companyName: string; firstName: string; lastName: string; email: string; } 
  ) {
    
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true } });
    const targetEmail = billingDetails?.email?.trim() || user?.email;
    const targetName = billingDetails?.firstName?.trim() || user?.firstName || 'User';
    const shouldUpsertBilling = billingDetails && typeof billingDetails === 'object' && billingDetails.email?.trim();

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
        const cartItems = await tx.cartItem.findMany({ 
          where: { userId },
          include: { package: true } 
        });
        
        if (cartItems.length === 0) {
          throw new Error('ORDER_ABORTED: Cart is empty or was already cleared.');
        }

        const totalLeadsBought = cartItems.reduce((acc, item) => acc + (item.package.leadsCount * item.quantity), 0);
        const calculatedTotal = cartItems.reduce((acc, item) => acc + (Number(item.package.price) * item.quantity), 0);
        
        if (Math.abs(calculatedTotal - stripeAmountPaid) > 0.01) { 
          throw new Error(`ORDER_ABORTED: Price mismatch. Cart Total: £${calculatedTotal}, Paid: £${stripeAmountPaid}`);
        }

        if (shouldUpsertBilling) {
          await tx.billingProfile.upsert({
            where: { userId },
            update: billingDetails,
            create: { userId, ...billingDetails }
          });
        }

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
          if (error.code === 'P2002') {
            const duplicate = await tx.invoice.findUnique({ where: { id: `INV-${stripeIntentId}` } });
            return { invoice: duplicate, isDuplicate: true, receiptData: { totalLeadsUnlocked: 0 } };
          }
          throw error;
        }

        // --- NEW: INCREMENT USER CREDITS ---
        await tx.user.update({
          where: { id: userId },
          data: {
            exportCreditsTotal: { increment: totalLeadsBought }
          }
        });

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

          if (freshLeads.length < requiredLeadsCount) {
            throw new Error(`INSUFFICIENT_DATA: Available: ${freshLeads.length}. Required: ${requiredLeadsCount}`);
          }

          const unlockData = freshLeads.map(lead => ({
            workspaceId,
            leadId: lead.id,
            invoiceId: invoice.id
          }));

          await tx.unlockedLead.createMany({ data: unlockData });
          totalLeadsUnlocked += freshLeads.length;
        }

        await tx.cartItem.deleteMany({ where: { userId } });

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

      // --- POST-TRANSACTION SUCCESS ---
      if (!result.isDuplicate && result.invoice) {
        NotificationService?.sendToUser?.(userId, {
          title: 'Purchase Successful! 🎉',
          message: `Successfully unlocked ${result.receiptData.totalLeadsUnlocked} premium leads.`,
          type: 'SUCCESS',
          link: '/dashboard/history'
        });

        if (targetEmail) {
          MailerService.send({
            to: targetEmail,
            templateName: 'order-success',
            context: { name: targetName, invoiceId: result.invoice.id, leadsUnlocked: result.receiptData.totalLeadsUnlocked }
          }).catch(err => console.error(err));
        }
      }
      return result;

    } catch (error: any) {
      if (!error.message.includes('Cart is empty')) {
        const cleanErrorMessage = error.message.replace('ORDER_ABORTED: ', '').replace('INSUFFICIENT_DATA: ', '');
        NotificationService?.sendToUser?.(userId, { title: 'Checkout Failed ❌', message: cleanErrorMessage, type: 'ERROR' });
      }
      throw error;
    }
  }
};