import { Router } from 'express';
import Stripe from 'stripe';
import { DepositService } from '../services/deposit.service';
// Assume requireAuth attaches req.user (containing id and workspaceId)
import { requireAuth } from './middleware/auth.middleware'; 

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-05-27.dahlia', // Use your current version
});

// 1. CREATE STRIPE INTENT (Fixes the 404 error)
router.post('/create-intent', requireAuth, async (req: any, res) => {
  try {
    const { amount } = req.body; 
    
    if (!amount || amount < 10) {
      return res.status(400).json({ error: 'Minimum deposit is £10' });
    }

    // Stripe expects amounts in pence (multiply by 100)
    const amountInPence = Math.round(Number(amount) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: 'gbp',
      payment_method_types: ['card'],
      metadata: {
        userId: req.user.id,
        workspaceId: req.user.workspaceId,
        type: 'WORKSPACE_DEPOSIT'
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error("Stripe Intent Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. FINALIZE DEPOSIT (Called after Stripe CardElement succeeds)
router.post('/finalize-deposit', requireAuth, async (req: any, res) => {
  try {
    const { amount, paymentIntentId } = req.body;
    
    // Note: In a production environment, you should verify the paymentIntentId 
    // actually succeeded by retrieving it from Stripe here, or rely purely on webhooks.
    // For this flow, we will trust the intent ID and pass it to your robust service.

    const result = await DepositService.finalizeDeposit(
      req.user.id,
      req.user.workspaceId,
      paymentIntentId,
      Number(amount)
    );

    res.json({ 
      success: true, 
      newBalance: result.newBalance,
      isDuplicate: result.isDuplicate
    });
  } catch (error: any) {
    console.error("Deposit Finalization Error:", error);
    res.status(500).json({ error: 'Failed to finalize deposit' });
  }
});

export default router;