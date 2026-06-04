import prisma from '../db';

export const CheckoutService = {
  async completeOrder(
    userId: string, 
    workspaceId: string, 
    stripeIntentId: string, 
    stripeAmountPaid: number,
    billingDetails?: { companyName: string; firstName: string; lastName: string; email: string; } 
  ) {
    
    // 1. FAST IDEMPOTENCY CHECK
    const existingInvoice = await prisma.invoice.findUnique({ 
      where: { id: `INV-${stripeIntentId}` },
      include: { workspace: { include: { users: true } } } 
    });
    
    if (existingInvoice) {
      console.log(`[CHECKOUT] Invoice INV-${stripeIntentId} already exists. Skipping.`);
      return { invoice: existingInvoice, isDuplicate: true };
    }

    return await prisma.$transaction(async (tx) => {
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
          return { invoice: duplicate, isDuplicate: true };
        }
        throw error;
      }

      // 6. BUSINESS LOGIC: Dynamic Data Allocation (Unlocking Leads)
      let totalLeadsUnlocked = 0;

      for (const item of cartItems) {
        const requiredLeadsCount = item.package.leadsCount * item.quantity;

        // A. Find lead IDs this workspace already owns to prevent duplicates
        const alreadyOwned = await tx.unlockedLead.findMany({
          where: { workspaceId },
          select: { leadId: true }
        });
        const ownedIds = alreadyOwned.map(ol => ol.leadId);

        // B. Fetch fresh, unowned leads from the master pool
        const freshLeads = await tx.masterLead.findMany({
          where: {
            id: { notIn: ownedIds },
            // Optional: Map package category to industry if needed
            // industry: item.package.category 
          },
          take: requiredLeadsCount,
          select: { id: true }
        });

        // C. Inventory Check: Abort transaction if we run out of fresh data
        if (freshLeads.length < requiredLeadsCount) {
          throw new Error(`INSUFFICIENT_DATA: We do not have enough fresh leads for ${item.package.brand}. Required: ${requiredLeadsCount}, Available: ${freshLeads.length}`);
        }

        // D. Create the UnlockedLead records binding the data to this workspace & invoice
        const unlockData = freshLeads.map(lead => ({
          workspaceId,
          leadId: lead.id,
          invoiceId: invoice.id
        }));

        await tx.unlockedLead.createMany({
          data: unlockData
        });

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
            invoiceId: invoice.id, 
            stripeIntentId,
            leadsUnlocked: totalLeadsUnlocked, // Log actual data volume unlocked
            amountPaid: stripeAmountPaid,
            source: billingDetails ? 'FRONTEND_FINALIZE' : 'STRIPE_WEBHOOK'
          }
        }
      });

      // 9. Fetch fallback email for Webhook receipts
      let fallbackEmail = billingDetails?.email;
      let fallbackName = billingDetails?.firstName;
      
      if (!fallbackEmail) {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true } });
        fallbackEmail = user?.email;
        fallbackName = user?.firstName || 'User';
      }

      return { 
        invoice, 
        isDuplicate: false, 
        receiptData: { email: fallbackEmail, name: fallbackName, totalLeadsUnlocked } 
      };
    });
  }
};