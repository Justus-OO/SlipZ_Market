import { Router, Request, Response } from 'express';
import express from 'express';
import { stripe } from '../services/stripe.service';
import { CheckoutService } from '../services/checkout.service';
import { PDFGenerator } from '../services/pdf.service';
import { MailerService } from '../services/mailer.service';
import { FraudPreventionService } from '../services/fraud.service';
import prisma from '../db'; // Need DB access for blacklist checks
import fs from 'fs';
import path from 'path';

const router = Router();

// IMPORTANT: Webhooks require the raw body. Do not use express.json() here.
router.post('/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    return res.status(400).send('Missing Stripe signature');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ====================================================================
  // EVENT 1: SUCCESSFUL PAYMENT (Check Blacklist Before Fulfillment)
  // ====================================================================
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as any;
    const userId = paymentIntent.metadata?.userId;
    
    try {
      console.log(`✅ Webhook received for PaymentIntent: ${paymentIntent.id}`);

      // 🛡️ ANTI-FRAUD CHECK: Ensure user is not blacklisted
      if (userId) {
        const user = await prisma.user.findUnique({ 
          where: { id: userId },
          select: { isBlacklisted: true, email: true }
        });

        if (user?.isBlacklisted) {
          console.warn(`🚨 FRAUD INTERCEPT: Blacklisted user ${user.email} paid. Aborting fulfillment.`);
          
          // Log the blocked attempt
          await prisma.activityLog.create({
            data: {
              action: 'FRAUD_PAYMENT_BLOCKED',
              userId: userId,
              metadata: { intentId: paymentIntent.id, amount: paymentIntent.amount }
            }
          });

          // Acknowledge receipt to Stripe, but do NOT fulfill the order
          return res.json({ received: true, status: 'blacklisted_user_blocked' });
        }
      }

      // 0.5. CALCULATE TOTAL LEADS BOUGHT FROM CART ITEMS
      const cartItems = await prisma.cartItem.findMany({
        where: { userId },
        include: { package: true }
      });
      const totalLeadsBought = cartItems.reduce((sum, item) => sum + (item.package.leadsCount * item.quantity), 0);
      console.log(`📦 Total leads to be credited: ${totalLeadsBought}`);
      
      // 1. Process the order via our upgraded CheckoutService
      const result = await CheckoutService.completeOrder(
        userId,
        paymentIntent.metadata.workspaceId,
        paymentIntent.id,
        Number(paymentIntent.amount) / 100,
        paymentIntent.metadata?.billingDetails,
        totalLeadsBought
      );

      // 2. Prevent duplicate emails (Idempotency)
      if (result.isDuplicate) {
        console.log(`⚠️ Invoice INV-${paymentIntent.id} already processed. Skipping PDF/Email.`);
        return res.json({ received: true, status: 'duplicate_skipped' });
      }

const invoice = (result as any).invoice;
      const receiptData = (result as any).receiptData;
      
      if (receiptData?.email) {
        // const tempDir = path.join(process.cwd(), 'temp');
        // if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        
        // const pdfPath = path.join(tempDir, `INV-${invoice.id}.pdf`);
        
        // await PDFGenerator.generateInvoice(invoice, pdfPath);
        
        await MailerService.send({
          to: receiptData.email,
          templateName: 'INVOICE_CONFIRMATION',
          context: { 
            name: receiptData.name || 'Customer',
            invoiceId: invoice.id, 
            total: invoice.amount.toFixed(2) 
          },
         // attachments: [{ filename: `Receipt-${invoice.id}.pdf`, path: pdfPath }]
        });
        
        //if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
        console.log(`📧 Receipt successfully emailed to ${receiptData.email}`);
      }

    } catch (err: any) {
      console.error('❌ Webhook processing failed:', err.message);
      return res.status(500).send('Database or Email processing failed');
    }
  }

else if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as any;
    const userId = paymentIntent.metadata?.userId;

    try {
      if (userId) {
        // 1. Log the failure
        await prisma.activityLog.create({
          data: {
            action: 'PAYMENT_FAILED',
            userId: userId,
            metadata: {
              intentId: paymentIntent.id,
              reason: paymentIntent.last_payment_error?.message || 'Unknown error'
            }
          }
        });

        // 2. 🛡️ TRIGGER THE AUTO-BAN ENGINE
        await FraudPreventionService.evaluateFailedPayments(userId);
      }
    } catch (err) {
      console.error('Failed to process payment failure logic:', err);
    }
  }

  // ====================================================================
  // EVENT 3: CHARGE DISPUTE (Auto-Blacklist Fraudsters)
  // ====================================================================
  else if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as any;
    // Disputes are linked to PaymentIntents via the charge object
    const paymentIntentId = dispute.payment_intent;

    try {
      // Find the user who made this disputed payment
      const invoice = await prisma.invoice.findFirst({
        where: { id: `INV-${paymentIntentId}` },
        include: { workspace: { include: { users: true } } }
      });

      const fraudsterId = invoice?.workspace?.users[0]?.id;

      if (fraudsterId) {
        // Instantly ban the user
        await prisma.user.update({
          where: { id: fraudsterId },
          data: { isBlacklisted: true }
        });

        console.error(`🚨 FRAUD ALERT: User ${fraudsterId} initiated a chargeback. Account Blacklisted.`);
      }
    } catch (err) {
      console.error('Failed to process dispute auto-blacklist:', err);
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

export default router;