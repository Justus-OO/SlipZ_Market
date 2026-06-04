import { Router } from 'express';
import prisma from '../db';
import { requireAuth, requireAdmin } from './middleware/auth.middleware';
import { CoreService } from '../services/core.services';

const router = Router();

// Fetch all templates for the UI
router.get('/templates', requireAuth, requireAdmin, CoreService.catchAsync(async (req, res) => {
  const templates = await prisma.emailTemplate.findMany();
  return CoreService.success(res, 200, 'Templates fetched', { templates });
}));

// Update a specific template
router.post('/templates/update', requireAuth, requireAdmin, CoreService.catchAsync(async (req, res) => {
  const { name, subject, htmlContent } = req.body;

  const template = await prisma.emailTemplate.update({
    where: { name },
    data: { subject, htmlContent }
  });

  return CoreService.success(res, 200, 'Template updated', { template });
}));

export default router;