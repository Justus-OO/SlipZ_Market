import prisma from '../db.js';
import { ChatStatus, Prisma } from '../generated/client/index.js';
import { SocketService } from './socket.service.js';
import { NotificationService } from './notification.service.js'; // 👈 Added Import
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
  systemInstruction: {
    role: "system", 
    parts: [{ text: `You are 'SlipZBot', the highly capable frontline customer support agent for SlipZMarket, a premium B2B data marketplace.

      YOUR TOP PRIORITY: Be helpful. Always try to answer the user's question directly and solve their issue before considering escalation.
      Do not ask to escalate unless the user explicitly requests a human or the issue truly requires account or billing access.
      
      SLIPZMARKET KNOWLEDGE BASE:
      - What we do: We provide verified B2B contact data, market intent signals, and company firmographics.
      - Pricing: We offer a Free Tier (100 credits/mo), Pro Tier ($99/mo), and Enterprise (Custom).
      - Refunds: We do not offer refunds on data already downloaded.
      - Tech Issues: Tell users to clear their cache or try an incognito window first.
      - API: We have a REST API for enterprise clients. Docs are available in their dashboard.

      YOUR BEHAVIOR:
      1. Be polite, professional, and concise.
      2. Focus on helping first and answering clearly.
      3. If a user greets you or asks a general question, answer directly and do not escalate.
      4. Only set "escalateToHuman" to true if:
         - The user explicitly demands a human after you have tried to help.
         - They are angry, threatening, or abusive.
         - They have a sensitive billing or account issue that requires secure account access.
      5. If the user asks for more details, ask a clarifying follow-up question rather than escalating.
      6. Do not escalate for simple questions, greetings, or general help requests.
      
      Always respond with a strict JSON object only, with no markdown, no explanation outside JSON, and no extra keys.
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

    // 4. Update session timestamp so admins see the latest activity immediately
    session = await prisma.chatSession.update({
      where: { id: session.id },
      data: { 
        updatedAt: new Date(),
        reminderSent: false
      },
      include: {
        user: { select: { email: true, firstName: true } },
        messages: true
      }
    });

    const messagePayload = {
      sessionId: session.id,
      workspaceId: session.workspaceId,
      message: {
        id: savedUserMsg.id,
        text: savedUserMsg.text,
        senderRole: savedUserMsg.senderRole,
        createdAt: savedUserMsg.createdAt,
        isStarred: savedUserMsg.isStarred || false
      },
      status: session.status,
      user: session.user
    };

    // 5. Notify admins of a live incoming message right away
    SocketService.notifyAdmins('new_message', messagePayload);

    // 6. If we are already in a human-handled session, notify the assigned agent immediately
    if (session.status !== 'BOT_HANDLING') {
      if (session.agentId) {
        SocketService.notifyUser(session.agentId, 'new_message', messagePayload);

        NotificationService.sendToUser(session.agentId, {
          title: 'New Message 💬',
          message: `${session.user?.firstName || 'A user'} replied to their support ticket.`,
          type: 'MESSAGE',
          link: `/admin/chat/${session.id}`
        });
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

    const knowledgeContext = await this.getKnowledgeContext(text);

    try {
      // 6. Generate AI Response
      const chat = model.startChat({ history });
      if (knowledgeContext) {
        await chat.sendMessage(`Knowledge base context:\n\n${knowledgeContext}`);
      }
      const aiResponse = await chat.sendMessage(text);
      
      const rawText = aiResponse.response.text();
      let responseData;
      try {
        responseData = JSON.parse(rawText.replace(/```json\n?|\n?```/g, ""));
      } catch (parseError) {
        console.error('Invalid AI JSON response:', rawText, parseError);
        responseData = null;
      }

      if (!responseData || typeof responseData.reply !== 'string' || typeof responseData.escalateToHuman !== 'boolean') {
        const fallbackReply = await this.sendBotMessage(
          session.id,
          "I'm here to help. Can you please clarify your question so I can assist you better?"
        );

        return { session, botResponse: fallbackReply, escalated: false };
      }

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
  },

  async getKnowledgeContext(userText: string) {
    const normalized = userText.toLowerCase();
    const categories: string[] = [];

    if (/(price|cost|subscription|tier|plan|billing)/i.test(normalized)) {
      categories.push('PRICING');
    }
    if (/(refund|policy|terms|charge|billing|account|payment)/i.test(normalized)) {
      categories.push('POLICY');
    }
    if (/(error|issue|bug|technical|login|password|checkout|website|slow|failed)/i.test(normalized)) {
      categories.push('TECH_SUPPORT');
    }

    const filters: any[] = [{ question: { contains: userText, mode: 'insensitive' } }];
    if (categories.length) {
      filters.unshift({ category: { in: categories } });
    }

    const queryText = `%${userText}%`;
    const hasCategories = categories.length > 0;

    const knowledgeEntries = await prisma.$queryRawUnsafe(
      `SELECT id, category, question, answer
       FROM "AiKnowledge"
       WHERE question ILIKE $1
       ${hasCategories ? 'OR category = ANY($2)' : ''}
       ORDER BY "updatedAt" DESC
       LIMIT 8`,
      queryText,
      hasCategories ? categories : []
    );

    if (!Array.isArray(knowledgeEntries) || knowledgeEntries.length === 0) {
      return '';
    }

    return knowledgeEntries
      .map((entry: any) => `Category: ${entry.category}\nQ: ${entry.question}\nA: ${entry.answer}`)
      .join('\n\n');
  }
};