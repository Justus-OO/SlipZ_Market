import { Router, Request, Response } from 'express';
import prisma from '../db.js';
import { requireAuth } from './middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth);

// Get user notification center stream
router.get('/', async (req: Request | any, res: Response) => {
  try {
    const userId = req.user.userId;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notification feed' });
  }
});

// Mark all as read
router.put('/read-all', async (req: Request | any, res: Response) => {
  try {
    const userId = req.user.userId;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    res.status(200).json({ success: true, message: 'All cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read records' });
  }
});

export default router;