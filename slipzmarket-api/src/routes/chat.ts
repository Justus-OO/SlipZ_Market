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
      sessionId: result.session.id,
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
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

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

    const payload = {
      id: message.id,
      senderRole: 'AGENT',
      text: message.text,
      createdAt: message.createdAt
    };

    // 3. Emit via WebSocket to the open session room
    SocketService.notifyUser(sessionId, 'agent_reply', payload);

    // 4. Emit to the user's global socket room too, in case they aren't joined to session room yet
    if (session.userId) {
      SocketService.emitToUser(session.userId, 'agent_reply', payload);
    }

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

router.patch('/admin/sessions/:sessionId/status', requireAuth, requireAdmin, async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;
    const allowedStatuses = ['CLOSED', 'AGENT_HANDLING', 'AWAITING_AGENT'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid session status' });
    }

    const session = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { status }
    });

    SocketService.notifyAdmins('session_updated', session);
    if (status === 'CLOSED') {
      SocketService.notifyUser(sessionId, 'session_closed', { sessionId });
    }

    return res.json({ success: true, session });
  } catch (error: any) {
    console.error('Failed to update session status:', error);
    return res.status(500).json({ success: false, error: 'Failed to update session status' });
  }
});

router.patch('/admin/sessions/:sessionId/resolve', requireAuth, requireAdmin, async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED' }
    });

    SocketService.notifyAdmins('session_updated', session);
    SocketService.notifyUser(sessionId, 'session_closed', { sessionId });

    return res.json({ success: true, session });
  } catch (error: any) {
    console.error('Failed to resolve session:', error);
    return res.status(500).json({ success: false, error: 'Failed to resolve session' });
  }
});

router.patch('/admin/sessions/:sessionId/internal-notes', requireAuth, requireAdmin, async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { internalNotes } = req.body;

    const session = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { internalNotes }
    });

    return res.json({ success: true, session });
  } catch (error: any) {
    console.error('Failed to save internal notes:', error);
    return res.status(500).json({ success: false, error: 'Failed to save internal notes' });
  }
});

router.get('/history', requireAuth, async (req: any, res: Response) => {
  const userId = req.user.userId;
  
  // Find the active session for this user
  const session = await prisma.chatSession.findFirst({
    where: { userId, status: { not: 'CLOSED' } },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });

  res.json({
    messages: session ? session.messages : [],
    sessionId: session?.id || null,
    status: session?.status || null
  });
});


// PATCH: Star/Unstar a message
router.patch('/admin/messages/:id/star', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { isStarred } = req.body;
    await prisma.chatMessage.update({
      where: { id: req.params.id },
      data: { isStarred }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update star status" });
  }
});

// DELETE: Remove a message
router.delete('/admin/messages/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.chatMessage.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete message" });
  }
});


export default router;