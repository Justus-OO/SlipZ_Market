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

  // NEW: Centralized token verification matching the generator
  verifyAuthToken: (token: string): any => {
    return jwt.verify(token, JWT_SECRET);
  },

  generateOTP: (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  // ==========================================
  // 2. STANDARDIZED API RESPONSES
  // ==========================================
  success: (res: Response, statusCode: number, message: string, data: any = {}) => {
    return res.status(statusCode).json({
      success: true,
      message,
      ...data,
    });
  },

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
  catchAsync: (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch((error) => {
        console.error('🔥 Unhandled API Error:', error);
        
        // Handle specific known errors (like Prisma unique constraints) gracefully
        if (error.code === 'P2002') {
          return CoreService.error(res, 409, 'A record with this data already exists.');
        }

        // Always return a generic 500 to the client to prevent data leaks
        CoreService.error(res, 500, 'An unexpected internal server error occurred.');
      });
    };
  },

  // ==========================================
  // 4. PAGINATION ENGINE (NEW)
  // ==========================================
  // Calculates Prisma's 'take' and 'skip' safely from query strings
  getPagination: (pageQuery: any, limitQuery: any, maxLimit = 100) => {
    const page = Math.max(1, parseInt(pageQuery as string, 10) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(limitQuery as string, 10) || 10));
    const skip = (page - 1) * limit;

    return { take: limit, skip, page, limit };
  },

  // Standardizes paginated responses for the frontend tables
  paginateResponse: (data: any[], total: number, page: number, limit: number) => {
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    };
  },

  // ==========================================
  // 5. DATA SANITIZATION (NEW)
  // ==========================================
  normalizeEmail: (email: string): string => {
    return email.trim().toLowerCase();
  }
};