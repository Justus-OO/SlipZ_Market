import prisma from '../db';

export const FraudPreventionService = {
  async evaluateFailedPayments(userId: string) {
    // 1. Calculate the timestamp for exactly 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // 2. Count how many failed payments this user has in that window
    const failedCount = await prisma.activityLog.count({
      where: {
        userId: userId,
        action: 'PAYMENT_FAILED',
        createdAt: {
          gte: oneHourAgo
        }
      }
    });

    // 3. The Strike-Out Rule: 5 failures = Auto-Ban
    if (failedCount >= 5) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      
      // If they aren't already blacklisted, ban them now
      if (user && !user.isBlacklisted) {
        await prisma.user.update({
          where: { id: userId },
          data: { isBlacklisted: true }
        });

        // Log the exact reason for the ban so your admins have a paper trail
        await prisma.activityLog.create({
          data: {
            action: 'AUTO_BLACKLISTED',
            userId: userId,
            metadata: { 
              reason: 'Card Testing Abuse',
              details: `${failedCount} failed payment attempts in 1 hour.`
            }
          }
        });

        console.error(`🚨 DEFENSE ENGAGED: User ${user.email} permanently blacklisted for card testing.`);
      }
    }
  }
};