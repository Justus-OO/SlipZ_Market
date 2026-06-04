// src/jobs/inactivity.job.ts
import cron from 'node-cron';
import prisma from '../db';
// Assume you have an email service set up (e.g., using Nodemailer, SendGrid, or Resend)
import { MailerService } from '../services/mailer.service'; 

export const startInactivityJob = () => {
  // Run this check every 1 minute
  cron.schedule('* * * * *', async () => {
    
    // 1. Calculate the time 10 minutes ago
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    try {
      // 2. Find sessions that need a reminder
      // We are looking for sessions where:
      // - Status is AWAITING_AGENT or AGENT_HANDLING
      // - The LAST message was sent BY THE AGENT
      // - The session hasn't been updated in over 10 minutes
      // - We haven't already sent them a reminder (you'll need a flag in your DB for this)
      
      const staleSessions = await prisma.chatSession.findMany({
        where: {
          status: { in: ['AWAITING_AGENT', 'AGENT_HANDLING'] },
          updatedAt: { lt: tenMinutesAgo },
          reminderSent: false // Assuming you add this boolean to your Prisma schema
        },
        include: {
          user: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      // 3. Process each stale session
      for (const session of staleSessions) {
        const lastMessage = session.messages[0];

        // If the last message was from the admin, the user is the one who is inactive
        if (lastMessage && lastMessage.senderRole === 'AGENT') {
          
          // Send the email
await MailerService.send({
  to: session.user.email,
  templateName: 'inactivity-reminder', // Make sure you create this template in your email system!
  context: {
    firstName: session.user.firstName || 'there'
  }
});

          // Mark the session so we don't spam them every minute
          await prisma.chatSession.update({
            where: { id: session.id },
            data: { reminderSent: true }
          });

          console.log(`Sent inactivity reminder to ${session.user.email}`);
        }
      }
    } catch (error) {
      console.error("Error in inactivity job:", error);
    }
  });
};