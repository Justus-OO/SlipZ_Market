import { Router, Request, Response } from 'express';
import prisma from '../db.js';
import { requireAuth } from './middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth);

// GET Workspace details for the logged-in user
router.get('/', async (req: Request | any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { workspace: true }
    });

    if (!user || !user.workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.json({
      success: true,
      data: {
        organization: user.workspace.name,
        balance: user.workspace.balance,
      }
    });
  } catch (error) {
    console.error("Workspace Fetch Error:", error);
    res.status(500).json({ error: 'Failed to fetch workspace data' });
  }
});

// MOCK: Add Funds to Workspace (For Testing)
router.post('/deposit', async (req: Request | any, res: Response) => {
  try {
    const { amount } = req.body;
    const depositAmount = parseFloat(amount);

    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: user?.workspaceId },
      data: { balance: { increment: depositAmount } }
    });

    res.json({ success: true, newBalance: updatedWorkspace.balance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process deposit' });
  }
});

export default router;