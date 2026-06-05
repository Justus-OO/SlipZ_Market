import prisma from '../db.js';
import { SocketService } from './socket.service.js';

export interface NotificationPayload {
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'MESSAGE';
  link?: string;
}

export const NotificationService = {
  /**
   * Core Engine: Saves notification to Postgres and relays via Socket.io room
   */
  async sendToUser(userId: string, payload: NotificationPayload) {
    try {
      // 1. Persist to DB using your new model
      const notification = await prisma.notification.create({
        data: {
          userId,
          title: payload.title,
          message: payload.message,
          type: payload.type || 'INFO',
          link: payload.link || null,
        },
      });

      // 2. Broadcast immediately over Socket room allocated to this specific userId
      SocketService.emitToUser(userId, 'new_notification', notification);

      return notification;
    } catch (error) {
      console.error('[NOTIFICATION SERVICE ERROR]:', error);
      // Fail silently for business logic flows so core transactions don't rollback
    }
  },

  /**
   * Fetches unread notifications count for badge indicators
   */
  async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
};

export default NotificationService;
