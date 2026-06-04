// src/jobs/inactivity.job.ts
import cron from 'node-cron';
import prisma from '../db';
// Assume you have an email service set up (e.g., using Nodemailer, SendGrid, or Resend)
import { MailerService } from '../services/mailer.service'; 

export const startInactivityJob = () => {
  // Use 10,000ms (10 seconds)
  setInterval(async () => {
    console.log("Checking for stale sessions...");
    
    // Set your threshold to 10 seconds for local testing
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000); 

    try {
      const staleSessions = await prisma.chatSession.findMany({
        where: {
          status: { in: ['AWAITING_AGENT', 'AGENT_HANDLING'] },
          updatedAt: { lt: tenSecondsAgo }, // Now checks 10s ago
          reminderSent: false 
        },
        include: { user: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } }
      });

      for (const session of staleSessions) {
        const lastMessage = session.messages[0];
        if (lastMessage && lastMessage.senderRole === 'AGENT') {
          await MailerService.send({
            to: session.user.email,
            templateName: 'inactivity-reminder',
            context: { firstName: session.user.firstName || 'there' }
          });

          await prisma.chatSession.update({
            where: { id: session.id },
            data: { reminderSent: true }
          });
        }
      }
    } catch (error) {
      console.error("Error in inactivity job:", error);
    }
  }, 10000); // 10 seconds interval
};