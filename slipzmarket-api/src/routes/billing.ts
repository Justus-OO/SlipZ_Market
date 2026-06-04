import { Router, Response } from 'express';
import { CoreService } from '../services/core.services';
import prisma from '../db';
import { requireAuth } from './middleware/auth.middleware';

const router = Router();

// SAVE/UPDATE BILLING INFO
router.post('/save', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const { companyName, firstName, lastName, email } = req.body;
  
  const profile = await prisma.billingProfile.upsert({
    where: { userId: req.user.userId },
    update: { companyName, firstName, lastName, email },
    create: { userId: req.user.userId, companyName, firstName, lastName, email }
  });

  return CoreService.success(res, 200, 'Billing profile saved', { profile });
}));

export default router;