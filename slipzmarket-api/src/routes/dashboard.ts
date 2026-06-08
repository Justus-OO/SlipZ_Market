import { Router, Request, Response } from 'express';
import prisma from '../db.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { v4 as uuidv4 } from 'uuid';

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

// 5. CREATE A NEW LIST & ALLOCATE LEADS
router.post('/lists', async (req: Request | any, res: Response) => {
  try {
    const { userId, workspaceId } = req.user;
    const { name, contactCount, dataType, selectedLeadIds, listId } = req.body;

    if (!Array.isArray(selectedLeadIds) || selectedLeadIds.length === 0) {
      return res.status(400).json({ error: 'No leads selected for saving.' });
    }

    const validLeadIds = selectedLeadIds
      .map((leadId: any) => (typeof leadId === 'string' ? leadId.trim() : String(leadId).trim()))
      .filter((leadId: string) => leadId.length > 0);
    const uniqueLeadIds = Array.from(new Set(validLeadIds));

    if (uniqueLeadIds.length === 0) {
      return res.status(400).json({ error: 'No valid lead IDs provided.' });
    }

    const amountToSave = uniqueLeadIds.length;
    if (!contactCount || contactCount <= 0) {
      return res.status(400).json({ error: 'Invalid prospect count.' });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Credit Check
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { exportCreditsTotal: true, exportCreditsUsed: true }
        });
        const remaining = (user?.exportCreditsTotal || 0) - (user?.exportCreditsUsed || 0);
        
        if (amountToSave > remaining) {
          throw new Error('INSUFFICIENT_CREDITS');
        }

        // 2. Create a system invoice record for this saved-list allocation.
        const systemInvoice = await tx.invoice.create({
          data: {
            id: uuidv4(),
            description: listId ? 'Saved list allocation' : `Saved list allocation for ${name?.trim()}`,
            amount: 0,
            status: 'COMPLETED',
            userId,
            workspaceId
          }
        });

        // 3. Allocate Leads to Workspace
        const uniqueLeadIds = Array.from(new Set(validLeadIds));
        await tx.unlockedLead.createMany({
          data: uniqueLeadIds.map((leadId: string) => ({
            workspaceId,
            leadId,
            invoiceId: systemInvoice.id
          })),
          skipDuplicates: true
        });

        let savedList;

        if (listId) {
          const existingList = await tx.list.findFirst({
            where: {
              id: listId,
              userId
            }
          });

          if (!existingList) {
            throw new Error('List not found');
          }

          savedList = await tx.list.update({
            where: { id: listId },
            data: { contactCount: existingList.contactCount + amountToSave }
          });
        } else {
          if (!name) {
            throw new Error('List name is required');
          }

          savedList = await tx.list.create({
            data: {
              name: name.trim(),
              contactCount: amountToSave,
              dataType,
              status: 'Ready to Export',
              userId
            }
          });
        }

        // 3. Deduct Credits
        await tx.user.update({
          where: { id: userId },
          data: { exportCreditsUsed: { increment: amountToSave } }
        });

        return savedList;
      },
      {
        timeout: 30000 // 30 second timeout
      }
    );

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.error('🔴 Dashboard save list error:', error.message || error);
    console.error('🔴 Full error object:', error);
    if (error.message === 'INSUFFICIENT_CREDITS') {
      return res.status(403).json({ error: 'Insufficient credits to save this list.' });
    }
    if (error.message === 'List not found') {
      return res.status(404).json({ error: 'Selected list does not exist.' });
    }
    res.status(400).json({ error: error.message || 'Failed to save list.', details: error });
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

// 6. BULK EXPORT LISTS TO CSV
router.post('/lists/export', async (req: Request | any, res: Response) => {
  const { listIds } = req.body; 
  const { userId, workspaceId } = req.user;

  try {
    // 1. Fetch leads that belong to these lists (via UnlockedLead)
    // Note: Ensure your UI passes the list names or filter criteria
    const unlockedLeads = await prisma.unlockedLead.findMany({
      where: { workspaceId },
      include: { lead: true }
    });

    // 2. Generate CSV from UnlockedLead records
    let csvContent = "First Name,Last Name,Email,Phone,Company,Job Title,Country\n";
    unlockedLeads.forEach(item => {
      csvContent += `${item.lead.firstName},${item.lead.lastName},${item.lead.email},${item.lead.phone},${item.lead.companyName},${item.lead.jobTitle},${item.lead.country}\n`;
    });

    // 3. Log the history
    await prisma.exportLog.createMany({
      data: listIds.map((id: string) => ({
        userId,
        listName: 'Bulk Export',
        recordCount: unlockedLeads.length
      }))
    });

    res.status(200).json({ success: true, csvData: csvContent });
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

export default router;