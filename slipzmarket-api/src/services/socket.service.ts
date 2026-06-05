import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: SocketIOServer;

export const SocketService = {
  init(server: HttpServer) {
    io = new SocketIOServer(server, {
      cors: {
        // Ensure these match your actual frontend URLs (including Render domains if deployed)
        origin: [
          'http://localhost:3000', 
          'http://localhost:5173',
          'https://slipz-market-1.onrender.com',
          'https://slipz-market-2.onrender.com'
        ],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // MIDDLEWARE: Validate connection using the token passed from frontend
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("Unauthorized: No token provided"));
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        (socket as any).user = decoded; // Attach user info to socket
        next();
      } catch (err) {
        next(new Error("Unauthorized: Invalid token"));
      }
    });

    io.on('connection', (socket) => {
      const userId = (socket as any).user.userId;
      const userRole = (socket as any).user.role;
      
      console.log(`🔌 New client connected: ${socket.id} (User: ${userId})`);

      // ==========================================
      // 🟢 1. GLOBAL USER ROOM (Crucial for Notifications)
      // Every user auto-joins a room based on their ID.
      // This allows NotificationService to target them anywhere in the app.
      // ==========================================
      socket.join(`user_${userId}`);
      console.log(`📡 User ${userId} joined their global notification room: user_${userId}`);

      // ==========================================
      // 2. ADMIN SUPPORT ROOM
      // ==========================================
      socket.on('join_admin_room', () => {
        if (userRole === 'ADMIN') {
          socket.join('admin_room'); 
          console.log(`🛡️ Admin ${userId} joined support room`);
        }
      });

      // ==========================================
      // 3. PRIVATE CHAT SESSION ROOM
      // ==========================================
      socket.on('join_user_session', (sessionId: string) => {
        socket.join(`session_${sessionId}`);
        console.log(`👤 User joined private chat room: session_${sessionId}`);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id} (User: ${userId})`);
      });
    });

    return io;
  },

  // ==========================================
  // 🟢 NEW: Emit directly to a specific user (Used by NotificationService)
  // ==========================================
  emitToUser(userId: string, eventName: string, payload: any) {
    if (io) {
      io.to(`user_${userId}`).emit(eventName, payload);
    } else {
      console.error('Socket.io is not initialized! Cannot emit to user.');
    }
  },

  // Sends an event to all connected admin dashboards (Used by Chat/Support)
  notifyAdmins(eventName: string, payload: any) {
    if (io) {
      io.to('admin_room').emit(eventName, payload); 
    } else {
      console.error('Socket.io is not initialized! Cannot notify admins.');
    }
  },

  // Notify a specific user in their private chat session room
  notifyUser(sessionId: string, eventName: string, payload: any) {
    if (io) {
      io.to(`session_${sessionId}`).emit(eventName, payload);
    } else {
      console.error('Socket.io is not initialized! Cannot notify chat session.');
    }
  }
};