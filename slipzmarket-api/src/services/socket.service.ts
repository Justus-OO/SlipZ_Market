import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: SocketIOServer;

export const SocketService = {
  init(server: HttpServer) {
    io = new SocketIOServer(server, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:5173'],
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
      console.log(`🔌 New client connected: ${socket.id} (User: ${(socket as any).user.userId})`);

      // 1. Admin room for support staff
      socket.on('join_admin_room', () => {
        // Optionally verify if user is actually an admin
        if ((socket as any).user.role === 'ADMIN') {
          // Changed to match the notifyAdmins broadcast target
          socket.join('admin_room'); 
          console.log(`🛡️ Admin joined support room`);
        }
      });

      // 2. User-specific room for private replies
      socket.on('join_user_session', (sessionId: string) => {
        socket.join(`session_${sessionId}`);
        console.log(`👤 User joined private room: session_${sessionId}`);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });

    return io;
  },

  // NEW: Sends an event to all connected admin dashboards
  notifyAdmins(eventName: string, payload: any) {
    if (io) {
      // Changed to broadcast to 'admin_room' to match the frontend connection
      io.to('admin_room').emit(eventName, payload); 
    } else {
      console.error('Socket.io is not initialized! Cannot notify admins.');
    }
  },

  // Notify a specific user in their private session room
  notifyUser(sessionId: string, eventName: string, payload: any) {
    if (io) {
      io.to(`session_${sessionId}`).emit(eventName, payload);
    } else {
      console.error('Socket.io is not initialized! Cannot notify user.');
    }
  }
};