import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  // Use the exact string the compiler requested
  apiVersion: '2026-05-27.dahlia', 
});