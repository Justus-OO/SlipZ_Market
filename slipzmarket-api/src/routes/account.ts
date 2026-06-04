import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { requireAuth } from './middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth);

// 1. GET FULL PROFILE & PREFERENCES
router.get('/profile', async (req: Request | any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true, firstName: true, lastName: true, email: true, role: true,
        timezone: true, currency: true, twoFactorEnabled: true,
        loginAlerts: true, exportAlerts: true, marketingEmails: true,
        updatedAt: true
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Billing prefill for frontend
router.get('/billing-prefill', async (req: Request | any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { firstName: true, lastName: true, email: true }
    });

    const billing = await prisma.billingProfile.findUnique({
      where: { userId: req.user.userId }
    });

    res.json({
      success: true,
      data: {
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        companyName: billing?.companyName || ''
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch billing info' });
  }
});

// Save/update billing profile (optional)
router.post('/billing-profile', async (req: Request | any, res: Response) => {
  try {
    const { companyName, firstName, lastName, email } = req.body || {};

    const billing = await prisma.billingProfile.upsert({
      where: { userId: req.user.userId },
      update: { companyName: companyName || '', firstName: firstName || '', lastName: lastName || '', email: email || '' },
      create: { userId: req.user.userId, companyName: companyName || '', firstName: firstName || '', lastName: lastName || '', email: email || '' }
    });

    res.json({ success: true, data: billing });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save billing profile' });
  }
});

// 2. UPDATE PERSONAL INFO & PREFERENCES
router.put('/profile', async (req: Request | any, res: Response) => {
  try {
    const { firstName, lastName, timezone, currency } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { firstName, lastName, timezone, currency },
      select: { firstName: true, lastName: true, timezone: true, currency: true }
    });
    
    res.json({ success: true, message: 'Profile updated', data: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// 3. TOGGLE NOTIFICATIONS & SECURITY SETTINGS
router.put('/settings', async (req: Request | any, res: Response) => {
  try {
    const validKeys = ['loginAlerts', 'exportAlerts', 'marketingEmails', 'twoFactorEnabled'];
    const updateData: any = {};

    for (const key of Object.keys(req.body)) {
      if (validKeys.includes(key)) {
        updateData[key] = Boolean(req.body[key]);
      }
    }

    await prisma.user.update({
      where: { id: req.user.userId },
      data: updateData
    });

    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// 4. CHANGE PASSWORD
router.put('/security/password', async (req: Request | any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new passwords are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // FIX: Check if the user has a password at all (SSO users won't)
    if (!user.passwordHash) {
      return res.status(400).json({ error: 'Account uses Google Sign-In. Password cannot be changed here.' });
    }

    // Verify old password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) return res.status(401).json({ error: 'Incorrect current password' });

    // Hash new password and save
    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { passwordHash: newHash }
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// 5. DELETE ACCOUNT
router.delete('/', async (req: Request | any, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.user.userId } });
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;