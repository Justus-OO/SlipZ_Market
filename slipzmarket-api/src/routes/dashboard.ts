import { Router, Request, Response } from 'express';
import prisma from '../db.js';
import { requireAuth } from './middleware/auth.middleware.js'; // Adjust path if needed

const router = Router();

// Apply your existing auth guard to all dashboard routes
router.use(requireAuth);

// ==========================================
// 1. GET DASHBOARD STATS (Credits & Plan)
// ==========================================
router.get('/stats', async (req: Request | any, res: Response) => {
  try {
    const userId = req.user.userId;

    const userStats = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        exportCreditsUsed: true,
        exportCreditsTotal: true,
        planTier: true,
      }
    });

    if (!userStats) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ success: true, data: userStats });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ==========================================
// 2. GET USER'S SAVED LISTS
// ==========================================
router.get('/lists', async (req: Request | any, res: Response) => {
  try {
    const userId = req.user.userId;

    // Fetch lists belonging to this specific user, newest first
    const lists = await prisma.list.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Format the dates so they look clean on the frontend
    const formattedLists = lists.map(list => ({
      id: list.id,
      name: list.name,
      count: list.contactCount,
      type: list.dataType,
      status: list.status,
      date: new Date(list.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    }));

    res.status(200).json({ success: true, data: formattedLists });
  } catch (error) {
    console.error('Lists fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

// ==========================================
// 3. CREATE A NEW FOLDER
// ==========================================
router.post('/folders', async (req: Request | any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        userId: userId
      }
    });

    res.status(201).json({ success: true, message: 'Folder created', data: folder });
  } catch (error) {
    console.error('Folder creation error:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// ==========================================
// 4. MOCK: GENERATE A TEST LIST
// ==========================================
router.post('/lists/mock', async (req: Request | any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { name, count, type } = req.body;

    const newList = await prisma.list.create({
      data: {
        name: name || `Test List ${Math.floor(Math.random() * 1000)}`,
        contactCount: count || Math.floor(Math.random() * 5000),
        dataType: type || 'Email & Phone',
        status: 'Ready to Export',
        userId: userId
      }
    });

    res.status(201).json({ success: true, data: newList });
  } catch (error) {
    console.error('List creation error:', error);
    res.status(500).json({ error: 'Failed to create mock list' });
  }
});

// ==========================================
// 5. CREATE A NEW LIST FROM PROSPECTS
// ==========================================
router.post('/lists', async (req: Request | any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { name, contactCount, dataType } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'List name is required' });
    }

    if (!contactCount || contactCount <= 0) {
      return res.status(400).json({ error: 'Cannot save an empty list' });
    }

    // --- Validate user has enough remaining credits to save this many leads ---
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { exportCreditsTotal: true, exportCreditsUsed: true }
    });

    const remaining = (userRecord?.exportCreditsTotal || 0) - (userRecord?.exportCreditsUsed || 0);
    if (contactCount > remaining) {
      return res.status(400).json({ error: `Insufficient credits. You have ${remaining} credits remaining.` });
    }

    const newList = await prisma.list.create({
      data: {
        name: name.trim(),
        contactCount: contactCount,
        dataType: dataType || 'Email & Phone',
        status: 'Ready to Export',
        userId: userId
      }
    });

    // Deduct credits from the user's bucket (increment used by contactCount)
    await prisma.user.update({
      where: { id: userId },
      data: { exportCreditsUsed: { increment: contactCount } }
    });

    res.status(201).json({ success: true, data: newList });
  } catch (error) {
    console.error('List creation error:', error);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// ==========================================
// 6. GET EXPORT HISTORY
// ==========================================
router.get('/export-history', async (req: Request | any, res: Response) => {
  try {
    const userId = req.user.userId;
    
    const logs = await prisma.exportLog.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch export history' });
  }
});

// ==========================================
// 6. BULK EXPORT LISTS TO CSV
// ==========================================
router.post('/lists/export', async (req: Request | any, res: Response) => {
  const { listIds } = req.body; 
  const userId = req.user.userId;

  if (!listIds || !Array.isArray(listIds) || listIds.length === 0) {
    return res.status(400).json({ error: 'No lists selected for export' });
  }

  try {
    const lists = await prisma.list.findMany({
      where: {
        id: { in: listIds },
        userId: userId
      }
    });

    if (lists.length === 0) {
      return res.status(404).json({ error: 'Selected lists not found' });
    }

    await prisma.list.updateMany({
      where: { id: { in: listIds }, userId: userId },
      data: { status: 'Exported' }
    });

    let totalRecords = 0;
    const logPromises = lists.map(list => {
      totalRecords += list.contactCount;
      return prisma.exportLog.create({
        data: {
          userId: userId,
          listName: list.name,
          recordCount: list.contactCount
        }
      });
    });
    await Promise.all(logPromises);

    // Generate Mock CSV Payload data string
    let csvContent = "First Name,Last Name,Email,Phone,Company,Job Title,Country\n";
    
    lists.forEach(list => {
      for (let i = 1; i <= list.contactCount; i++) {
        csvContent += `John,Doe_${list.name.replace(/\s+/g, '')}_${i},john.doe.${i}@example.com,+15550199,Enterprise Corp,Manager,United States\n`;
      }
    });

    res.status(200).json({ 
      success: true, 
      csvData: csvContent, 
      filename: `slipz_export_${Date.now()}.csv` 
    });

  } catch (error) {
    console.error('Export processing error:', error);
    res.status(500).json({ error: 'Export processing failed' });
  }
});

export default router;