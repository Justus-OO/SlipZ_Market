import { Router, Request, Response } from 'express';
import { ChatEngineService } from '../services/chat.service';
import prisma from '../db';
import { SocketService } from '../services/socket.service';
import { requireAuth, requireAdmin } from './middleware/auth.middleware';

const router = Router();

// ==========================================
// USER ENDPOINT: Send Message
// ==========================================
router.post('/message', requireAuth, async (req: any, res: Response) => {
  const userId = req.user.userId;
  const workspaceId = req.user.workspaceId;
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, error: 'Message text is required' });
  }

  try {
    const result = await ChatEngineService.handleIncomingMessage(userId, workspaceId, text);
    
    return res.json({
      success: true,
      currentStatus: result.session.status,
      botResponse: result.botResponse, 
      escalatedToHuman: result.escalated
    });
  } catch (error: any) {
    console.error('💬 Chat handling failed:', error.message);
    return res.status(500).json({ success: false, error: 'Internal Chat Server Error' });
  }
});

// ==========================================
// ADMIN ENDPOINT: Reply to User
// ==========================================
router.post('/admin/reply', requireAuth, requireAdmin, async (req: any, res: Response) => {
  const { sessionId, text } = req.body;
  const adminId = req.user.userId;

  if (!sessionId || !text) {
    return res.status(400).json({ success: false, error: 'Session ID and reply text are required' });
  }

  try {
    // 1. Persist the message
    const message = await prisma.chatMessage.create({
      data: {
        sessionId,
        senderId: adminId,
        senderRole: 'AGENT',
        text
      }
    });

    // 2. Update session
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: 'AGENT_HANDLING', updatedAt: new Date() }
    });

    // 3. Emit via WebSocket
    SocketService.notifyUser(sessionId, 'agent_reply', {
      id: message.id,
      senderRole: 'AGENT',
      text: message.text,
      createdAt: message.createdAt
    });

    return res.json({ success: true, message });
  } catch (error: any) {
    console.error('❌ Admin reply failed:', error);
    return res.status(500).json({ success: false, error: 'Failed to send reply' });
  }
});

// ==========================================
// ADMIN ENDPOINT: Fetch Sessions
// ==========================================
router.get('/admin/sessions', requireAuth, requireAdmin, async (req: any, res: Response) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { status: { in: ['AWAITING_AGENT', 'AGENT_HANDLING'] } },
      include: { 
        user: { select: { email: true, firstName: true } } 
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

// Add this to src/routes/chat.ts
router.get('/admin/sessions/:sessionId', requireAuth, requireAdmin, async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});


router.get('/history', requireAuth, async (req: any, res: Response) => {
  const userId = req.user.userId;
  
  // Find the active session for this user
  const session = await prisma.chatSession.findFirst({
    where: { userId, status: { not: 'CLOSED' } },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });

  res.json({ messages: session ? session.messages : [] });
});
export default router;