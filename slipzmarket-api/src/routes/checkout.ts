import { Router, Response } from 'express';
import { CoreService } from '../services/core.services';
import { CheckoutService } from '../services/checkout.service';
import { stripe } from '../services/stripe.service';
import { PDFGenerator } from '../services/pdf.service';
import prisma from '../db';
import { requireAuth } from './middleware/auth.middleware';

const router = Router();

// 1. INTENT CREATION
router.post('/create-payment-intent', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const userId = req.user.userId;

  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: { package: true }
  });

  if (cartItems.length === 0) return CoreService.error(res, 400, 'Cart is empty');

  const amount = cartItems.reduce((acc, i) => acc + (Number(i.package.price) * i.quantity), 0);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'gbp',
    payment_method_types: ['card'],
    metadata: { 
      userId,
      workspaceId: req.user.workspaceId 
    }
  });

  return CoreService.success(res, 200, 'Intent created', { 
    clientSecret: paymentIntent.client_secret 
  });
}));

// 2. STRIPE FINALIZATION: Updated to pass totalLeadsBought
router.post('/finalize', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const { intentId, billingDetails } = req.body; 
  const userId = req.user.userId;

  const paymentIntent = await stripe.paymentIntents.retrieve(intentId);
  
  if (paymentIntent.status !== 'succeeded') {
    return CoreService.error(res, 400, 'Payment not confirmed');
  }

  if (paymentIntent.metadata.userId !== userId) {
    return CoreService.error(res, 403, 'Unauthorized');
  }

  // Calculate leads bought from cart to sync credits
  const cartItems = await prisma.cartItem.findMany({ where: { userId }, include: { package: true } });
  const totalLeadsBought = cartItems.reduce((acc, i) => acc + (i.package.leadsCount * i.quantity), 0);

  const invoice = await CheckoutService.completeOrder(
    userId, 
    req.user.workspaceId, 
    paymentIntent.id, 
    Number(paymentIntent.amount) / 100,
    billingDetails,
    totalLeadsBought // 👈 Syncing credits
  );

  return CoreService.success(res, 201, 'Order finalized', { invoice });
}));

// 3. BALANCE CHECKOUT: Process payment directly from Workspace Balance
router.post('/process-balance', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const billingDetails = req.body.billingDetails || {};
  const userId = req.user.userId;
  const workspaceId = req.user.workspaceId;

  // A. Calculate Cart Total & Leads
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: { package: true }
  });

  if (cartItems.length === 0) return CoreService.error(res, 400, 'Cart is empty');

  const amount = cartItems.reduce((acc, i) => acc + (Number(i.package.price) * i.quantity), 0);
  const totalLeadsBought = cartItems.reduce((acc, i) => acc + (i.package.leadsCount * i.quantity), 0);

  // B. Verify Sufficient Balance
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });

  if (!workspace || Number(workspace.balance) < amount) {
    return CoreService.error(res, 400, 'Insufficient workspace funds');
  }

  // C. Generate a unique transaction ID
  const balanceTxId = `BAL-${Date.now().toString().slice(-8)}`;

  // D. Deduct the balance first
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { balance: { decrement: amount } }
  });

  try {
    // E. Execute core checkout logic
    const invoiceResult = await CheckoutService.completeOrder(
      userId,
      workspaceId,
      balanceTxId,
      amount,
      billingDetails,
      totalLeadsBought // 👈 Syncing credits
    );

    return CoreService.success(res, 201, 'Order finalized using balance', { 
      invoice: invoiceResult.invoice || invoiceResult 
    });
  } catch (error: any) {
    console.error('[BALANCE CHECKOUT ERROR]', error);

    // F. ROLLBACK: Refund the balance
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { balance: { increment: amount } }
    });

    return CoreService.error(res, 500, error.message || 'Balance checkout failed.');
  }
}));

router.get('/admin/invoices/download/:id', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const invoiceId = req.params.id;
  
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: { include: { package: true } } }
  });

  if (!invoice) return CoreService.error(res, 404, 'Invoice not found');

  PDFGenerator.streamInvoiceToResponse(invoice, res);
}));

export default router;