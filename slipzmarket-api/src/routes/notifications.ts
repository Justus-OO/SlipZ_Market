import { Router, Request, Response } from 'express';
import prisma from '../db.js';
import { requireAuth } from './middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth);

// ==========================================
// 1. GET USER NOTIFICATION STREAM
// ==========================================
router.get('/', async (req: Request | any, res: Response) => {
  try {
    const userId = req.user.userId;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false }
    });

    res.status(200).json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    console.error('[NOTIFICATIONS GET ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch notification feed' });
  }
});

// ==========================================
// 2. MARK ALL AS READ
// ==========================================
router.put('/read-all', async (req: Request | any, res: Response) => {
  try {
    const userId = req.user.userId;
    
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('[NOTIFICATIONS READ-ALL ERROR]', error);
    res.status(500).json({ error: 'Failed to update records' });
  }
});

// ==========================================
// 3. TOGGLE SINGLE NOTIFICATION (Read/Unread)
// ==========================================
router.put('/:id/toggle-read', async (req: Request | any, res: Response) => {
  try {
    const userId = req.user.userId;
    const notificationId = req.params.id;
    const { isRead } = req.body; // Expect frontend to send { "isRead": true } or false

    if (typeof isRead !== 'boolean') {
      return res.status(400).json({ error: 'isRead boolean status is required' });
    }

    // Using updateMany ensures we only update if the ID belongs to this specific user
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Notification not found or unauthorized' });
    }

    res.status(200).json({ success: true, message: `Notification marked as ${isRead ? 'read' : 'unread'}` });
  } catch (error) {
    console.error('[NOTIFICATION TOGGLE ERROR]', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// ==========================================
// 4. DELETE A SINGLE NOTIFICATION
// ==========================================
router.delete('/:id', async (req: Request | any, res: Response) => {
  try {
    const userId = req.user.userId;
    const notificationId = req.params.id;

    const result = await prisma.notification.deleteMany({
      where: { id: notificationId, userId }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Notification not found or unauthorized' });
    }

    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('[NOTIFICATION DELETE ERROR]', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// ==========================================
// 5. BULK DELETE ACTIONS (Clear All or Clear Read)
// ==========================================
router.delete('/', async (req: Request | any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { type } = req.query; // e.g., ?type=read

    const deleteFilter: any = { userId };

    // If the frontend passes ?type=read, only delete the read ones
    if (type === 'read') {
      deleteFilter.isRead = true;
    }

    const result = await prisma.notification.deleteMany({
      where: deleteFilter
    });

    res.status(200).json({ 
      success: true, 
      message: `Cleared ${result.count} notification(s)` 
    });
  } catch (error) {
    console.error('[NOTIFICATIONS BULK DELETE ERROR]', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

export default router;