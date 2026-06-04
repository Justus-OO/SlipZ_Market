// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CoreService } from '../../services/core.services';

const JWT_SECRET = process.env.JWT_SECRET as string;

// Middleware to check if user is logged in
export const requireAuth = (req: Request | any, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return CoreService.error(res, 401, 'Access denied. No token provided.');

try {
  const decoded = jwt.verify(token, JWT_SECRET); // Removed the 'a'
  req.user = decoded;
  next();
} catch (err) {
  return CoreService.error(res, 401, 'Invalid or expired token.');
} 
};

// Middleware to check if user is an ADMIN
export const requireAdmin = (req: Request | any, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return CoreService.error(res, 403, 'Forbidden. Admin access required.');
  }
  next();
};