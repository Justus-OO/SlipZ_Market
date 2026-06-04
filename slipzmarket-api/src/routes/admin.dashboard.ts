import { Router } from 'express';
import { DashboardService } from '../services/admin.dashboard.service';
import { MailerService } from '../services/mailer.service';
import prisma from '../db';
// import { requireAuth, requireAdmin } from '../middleware/auth'; 

const router = Router();

// ==========================================
// GET: Main Dashboard Data Payload
// ==========================================
router.get('/', /* requireAuth, requireAdmin, */ async (req, res) => {
  try {
    const timeRange = (req.query.range as string) || '7D';
    const dashboardData = await DashboardService.getOverviewData(timeRange);
    
    res.status(200).json({ success: true, data: dashboardData });
  } catch (error: any) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard data' });
  }
});

// ==========================================
// POST: Global Announcement (Email Blast)
// ==========================================
router.post('/announcement', /* requireAuth, requireAdmin, */ async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Announcement message is required' });
    }

    // 1. Fetch all active users who have not been blacklisted
    const activeUsers = await prisma.user.findMany({
      where: { isBlacklisted: false },
      select: { email: true, firstName: true }
    });

    // 2. Fire off emails asynchronously (do not await in a loop to avoid blocking the response)
    console.log(`[BROADCAST]: Sending announcement to ${activeUsers.length} users.`);
    
    activeUsers.forEach(user => {
      MailerService.send({
        to: user.email,
        templateName: 'default', // Using your fallback/default template
        context: {
          firstName: user.firstName || 'User',
          message: message // If you update your default template to render {{message}}
        }
      }).catch(err => console.error(`Failed to send announcement to ${user.email}`, err));
    });

    // 3. Log the action in the global ActivityLog
    await prisma.activityLog.create({
      data: {
        action: 'GLOBAL_ANNOUNCEMENT',
        userId: 'system_admin', // Replace with req.user.id once auth is uncommented
        metadata: { targetCount: activeUsers.length, messagePreview: message.substring(0, 50) }
      }
    });
    
    res.status(200).json({ success: true, message: `Announcement broadcasted to ${activeUsers.length} users` });
  } catch (error) {
    console.error('Broadcast Error:', error);
    res.status(500).json({ success: false, message: 'Broadcast failed' });
  }
});

// ==========================================
// POST: Suspend User
// ==========================================
router.post('/users/:id/suspend', /* requireAuth, requireAdmin, */ async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists first
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update the isBlacklisted flag defined in your schema
    await prisma.user.update({ 
      where: { id }, 
      data: { isBlacklisted: true } 
    });

    // Log the suspension action
    await prisma.activityLog.create({
      data: {
        action: 'USER_SUSPENDED',
        userId: 'system_admin', // Replace with req.user.id once auth is uncommented
        metadata: { suspendedUserId: id, targetEmail: user.email }
      }
    });
    
    res.status(200).json({ success: true, message: 'User account has been suspended' });
  } catch (error) {
    console.error('Suspension Error:', error);
    res.status(500).json({ success: false, message: 'Failed to suspend user' });
  }
});

export default router;