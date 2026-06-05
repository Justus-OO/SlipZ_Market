import prisma from '../db.js';
import { ChatStatus } from '../generated/client/index.js';
import { SocketService } from './socket.service.js';
import { NotificationService } from './notification.service.js'; // 👈 Added Import
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
  systemInstruction: {
    role: "user", 
    parts: [{ text: `You are 'SlipZBot', the highly capable frontline customer support agent for SlipZMarket, a premium B2B data marketplace.

      YOUR GOAL: Solve the user's problem autonomously. Do NOT escalate to a human unless absolutely necessary.
      
      SLIPZMARKET KNOWLEDGE BASE:
      - What we do: We provide verified B2B contact data, market intent signals, and company firmographics.
      - Pricing: We offer a Free Tier (100 credits/mo), Pro Tier ($99/mo), and Enterprise (Custom).
      - Refunds: We do not offer refunds on data already downloaded.
      - Tech Issues: Tell users to clear their cache or try an incognito window first. 
      - API: We have a REST API for enterprise clients. Docs are available in their dashboard.

      YOUR BEHAVIOR:
      1. Be polite, professional, and concise. 
      2. If a user asks a general question, answer it directly using the knowledge base.
      3. If a user says "hello" or asks a generic question, DO NOT escalate.
      4. ONLY set "escalateToHuman" to true IF:
         - They explicitly demand a human repeatedly.
         - They are angry or threatening.
         - They have a complex custom billing issue that requires account access.
      
      Respond with a strict JSON object (no markdown):
      {
        "reply": "Your message to the user",
        "escalateToHuman": boolean
      }` 
    }]
  },
  generationConfig: { responseMimeType: "application/json" } 
});

export const ChatEngineService = {
  async handleIncomingMessage(userId: string, workspaceId: string, text: string) {
    
    // 1. Fetch Session
    let session = await prisma.chatSession.findFirst({
      where: { userId, workspaceId, status: { not: ChatStatus.CLOSED } },
      include: { 
        messages: { orderBy: { createdAt: 'asc' } },
        user: { select: { email: true, firstName: true } }
      }
    });

    // 2. Create if not exists
    if (!session) {
      session = await prisma.chatSession.create({
        data: { userId, workspaceId, status: ChatStatus.BOT_HANDLING },
        include: { messages: true, user: { select: { email: true, firstName: true } } }
      });
    }

    // 3. Save User Message
    const savedUserMsg = await prisma.chatMessage.create({
      data: { sessionId: session.id, senderId: userId, senderRole: 'USER', text }
    });

    // 4. Check if human is already handling
    if (session.status !== 'BOT_HANDLING') {
      
      // A. Reset inactivity trackers because the user just replied
      if (session.reminderSent) {
        await prisma.chatSession.update({
          where: { id: session.id },
          data: { 
            reminderSent: false, 
            updatedAt: new Date() 
          }
        });
      }

      // B. Construct a clean, predictable payload for the frontend
      const messagePayload = {
        sessionId: session.id,
        workspaceId: session.workspaceId,
        message: {
          id: savedUserMsg.id,
          text: savedUserMsg.text,
          senderRole: savedUserMsg.senderRole,
          createdAt: savedUserMsg.createdAt,
          isStarred: savedUserMsg.isStarred || false
        }
      };

      // C. Smart Routing & Notifications
      if (session.agentId) {
        // Send live chat socket event
        SocketService.notifyUser(session.agentId, 'new_message', messagePayload);
        
        // 🟢 Fire persistent notification to the assigned agent so they don't miss the reply
        NotificationService.sendToUser(session.agentId, {
          title: 'New Message 💬',
          message: `${session.user?.firstName || 'A user'} replied to their support ticket.`,
          type: 'MESSAGE',
          link: `/admin/chat/${session.id}` // Adjust path based on your admin UI
        });
      } else {
        SocketService.notifyAdmins('new_message', messagePayload);
      }

      return { 
        session, 
        botResponse: null, 
        escalated: true 
      };
    }

    // 5. Filter history for AI context
    const history = session.messages
      .filter(msg => msg.senderRole === 'USER' || msg.senderRole === 'BOT')
      .map(msg => ({
        role: msg.senderRole === 'USER' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

    try {
      // 6. Generate AI Response
      const chat = model.startChat({ history });
      const aiResponse = await chat.sendMessage(text);
      
      const rawText = aiResponse.response.text();
      const responseData = JSON.parse(rawText.replace(/```json\n?|\n?```/g, ""));
      
      const savedReply = await this.sendBotMessage(session.id, responseData.reply);

      // 7. Handle Escalation Decision
      if (responseData.escalateToHuman) {
        await prisma.chatSession.update({
          where: { id: session.id },
          data: { status: ChatStatus.AWAITING_AGENT }
        });
        
        await this.sendBotMessage(session.id, "I want to make sure you get the best help possible. I am connecting you with a human support agent now.");
        
        SocketService.notifyAdmins('new_escalation', {
          sessionId: session.id,
          user: session.user,
          status: 'AWAITING_AGENT'
        });

        // 🟢 Create a persistent notification ticket for the user
        NotificationService.sendToUser(userId, {
          title: 'Support Escalation 🎫',
          message: 'Your chat has been successfully escalated. A human agent will review your history and join shortly.',
          type: 'INFO',
          link: `/dashboard/support` // Adjust to your user chat interface
        });
        
        return { session, botResponse: savedReply, escalated: true };
      }

      return { session, botResponse: savedReply, escalated: false };

    } catch (error) {
      console.error("Gemini API Error:", error);
      const fallback = await this.sendBotMessage(session.id, "I am experiencing a slight technical hiccup. Connecting you to a human agent.");
      
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { status: ChatStatus.AWAITING_AGENT }
      });

      // 🟢 Persistent failover notification
      NotificationService.sendToUser(userId, {
        title: 'Support Escalation 🎫',
        message: 'We experienced a system interruption, but an agent has been notified and will assist you shortly.',
        type: 'WARNING',
        link: `/dashboard/support`
      });
      
      return { session, botResponse: fallback, escalated: true };
    }
  },

  async sendBotMessage(sessionId: string, text: string) {
    return await prisma.chatMessage.create({
      data: { sessionId, senderId: 'SYSTEM_BOT', senderRole: 'BOT', text }
    });
  }
};