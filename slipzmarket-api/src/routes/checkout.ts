import { Router, Response } from 'express';
import { CoreService } from '../services/core.services';
import { CheckoutService } from '../services/checkout.service';
import { stripe } from '../services/stripe.service';
import prisma from '../db';
import { requireAuth } from './middleware/auth.middleware';

const router = Router();

// 1. INTENT CREATION: Only create the intent for Stripe Card payments
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
    currency: 'gbp', // Updated to GBP based on your frontend UI
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

// 2. STRIPE FINALIZATION: Complete order after successful card charge
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

  const invoice = await CheckoutService.completeOrder(
    userId, 
    req.user.workspaceId, 
    paymentIntent.id, 
    Number(paymentIntent.amount) / 100,
    billingDetails
  );

  return CoreService.success(res, 201, 'Order finalized', { invoice });
}));

// 3. BALANCE CHECKOUT: Process payment directly from Workspace Balance
router.post('/process-balance', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const { billingDetails } = req.body;
  const userId = req.user.userId;
  const workspaceId = req.user.workspaceId;

  // A. Calculate Cart Total
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: { package: true }
  });

  if (cartItems.length === 0) return CoreService.error(res, 400, 'Cart is empty');

  const amount = cartItems.reduce((acc, i) => acc + (Number(i.package.price) * i.quantity), 0);

  // B. Verify Sufficient Balance
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId }
  });

  if (!workspace || Number(workspace.balance) < amount) {
    return CoreService.error(res, 400, 'Insufficient workspace funds');
  }

  // C. Generate a unique transaction ID for the balance payment
  const balanceTxId = `BAL-${Date.now().toString().slice(-8)}`;

  // D. Deduct the balance first
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { balance: { decrement: amount } }
  });

  try {
    // E. Execute the core checkout logic
    const invoice = await CheckoutService.completeOrder(
      userId, 
      workspaceId, 
      balanceTxId, 
      amount,
      billingDetails 
    );
    
    return CoreService.success(res, 201, 'Order finalized using balance', { invoice });
    
  } catch (error) {
    // F. ROLLBACK: If cart clearing or invoice generation fails, refund the balance instantly
    console.error(`[CHECKOUT ERROR] Rolling back balance deduction for ${workspaceId}`);
    
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { balance: { increment: amount } }
    });
    
    throw error; // Let your global error handler catch this
  }
}));

export default router;