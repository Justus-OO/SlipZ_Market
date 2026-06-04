// src/services/core.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Ensure this file crashes immediately if the secret is missing
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined in the environment variables.');
}

export const CoreService = {
  // ==========================================
  // 1. CRYPTO & AUTH UTILS
  // ==========================================
  hashPassword: async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  },

  verifyPassword: async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
  },

  generateAuthToken: (user: { id: string; workspaceId: string; role: string }) => {
    return jwt.sign(
      { userId: user.id, workspaceId: user.workspaceId, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  },

  generateOTP: (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  // ==========================================
  // 2. STANDARDIZED API RESPONSES
  // ==========================================
  // Use this to ensure every successful response has the exact same structure
  success: (res: Response, statusCode: number, message: string, data: any = {}) => {
    return res.status(statusCode).json({
      success: true,
      message,
      ...data,
    });
  },

  // Use this for client errors (400, 401, 403, 404)
  error: (res: Response, statusCode: number, message: string, details?: any) => {
    return res.status(statusCode).json({
      success: false,
      error: message,
      details,
    });
  },

  // ==========================================
  // 3. THE MAGIC ASYNC WRAPPER
  // ==========================================
  // Wrap all your route functions in this. It completely eliminates the need 
  // for writing `try { ... } catch (error) { ... }` in every single route.
  catchAsync: (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch((error) => {
        console.error('🔥 Unhandled API Error:', error);
        
        // Always return a generic 500 to the client to prevent data leaks
        CoreService.error(res, 500, 'An unexpected internal server error occurred.');
      });
    };
  }
};