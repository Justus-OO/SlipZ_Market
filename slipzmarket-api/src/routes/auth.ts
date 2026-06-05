import { Router } from 'express';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../db.js';
import jwt from 'jsonwebtoken';
import { requireAuth } from './middleware/auth.middleware';
import type { Prisma } from '../generated/client/client';
import { sendVerificationEmail } from '../utils/mailer';
import { CoreService } from '../services/core.services';
import crypto from 'crypto';

const router = Router();

// ==========================================
// ENVIRONMENT & CONFIGURATION
// ==========================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID) throw new Error('FATAL ERROR: GOOGLE_CLIENT_ID is not defined.');
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ==========================================
// VALIDATION SCHEMAS (Strict Mode)
// ==========================================
const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  email: z.string().trim().email(),
  companyName: z.string().trim().min(2).max(100),
  // Pro-grade password enforcement
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[\W_]/, 'Must contain at least one special character'),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

// ==========================================
// STEP 1: SEND CODE (Stateless)
// ==========================================
router.post('/register', CoreService.catchAsync(async (req, res) => {
  const validation = registerSchema.safeParse(req.body);
  if (!validation.success) {
    return CoreService.error(res, 400, 'Validation failed', validation.error.flatten().fieldErrors);
  }

  const { firstName, lastName, companyName, password } = validation.data;
  const email = CoreService.normalizeEmail(validation.data.email);

  // Ensure user doesn't already exist
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return CoreService.error(res, 400, 'A user with this email already exists.');

  const passwordHash = await CoreService.hashPassword(password);
  const otpCode = CoreService.generateOTP();

  await sendVerificationEmail(email, otpCode);

  // Package details into a short-lived token
  const pendingToken = jwt.sign(
    { firstName, lastName, email, companyName, passwordHash, otpCode },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );

  return CoreService.success(res, 200, 'Verification code sent. Please check your email.', { pendingToken });
}));

// ==========================================
// STEP 2: VERIFY CODE & COMPLETE REGISTRATION
// ==========================================
router.post('/verify', CoreService.catchAsync(async (req, res) => {
  const { pendingToken, code } = req.body;
  if (!pendingToken || !code) return CoreService.error(res, 400, 'Session expired or missing code.');

  let decoded: any;
  try {
    decoded = CoreService.verifyAuthToken(pendingToken);
  } catch (err) {
    return CoreService.error(res, 400, 'Verification session expired. Please register again.');
  }

  if (decoded.otpCode !== code) {
    return CoreService.error(res, 400, 'Invalid verification code.');
  }

  const existingUser = await prisma.user.findUnique({ where: { email: decoded.email } });
  if (existingUser) return CoreService.error(res, 400, 'User is already registered.');

  const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    
    // STRICT 1-ADMIN RULE: Check if an admin already exists globally
    const adminExists = await tx.user.findFirst({ where: { role: 'ADMIN' } });
    const assignedRole = adminExists ? 'USER' : 'ADMIN';

    // FIX: Secure workspace creation (Prevent Hijacking)
    // Append a short hash to guarantee uniqueness if the DB requires unique names
    const safeWorkspaceName = `${decoded.companyName}#${crypto.randomBytes(2).toString('hex')}`;
    
    const workspace = await tx.workspace.create({
      data: { name: safeWorkspaceName },
    });

    return await tx.user.create({
      data: {
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        email: decoded.email,
        passwordHash: decoded.passwordHash,
        workspaceId: workspace.id,
        role: assignedRole,
        isVerified: true, 
      },
    });
  });

  const token = CoreService.generateAuthToken({ id: user.id, workspaceId: user.workspaceId, role: user.role });

  return CoreService.success(res, 201, 'Registration complete!', { 
    token, 
    user: { id: user.id, email: user.email, firstName: user.firstName, role: user.role } 
  });
}));

// ==========================================
// RESEND OTP 
// ==========================================
router.post('/resend-otp', CoreService.catchAsync(async (req, res) => {
  const { pendingToken } = req.body;
  if (!pendingToken) return CoreService.error(res, 400, 'Session expired. Please register again.');

  const decoded = jwt.verify(pendingToken, process.env.JWT_SECRET!, { ignoreExpiration: true }) as any;
  const otpCode = CoreService.generateOTP();

  await sendVerificationEmail(decoded.email, otpCode);

  const newPendingToken = jwt.sign(
    { ...decoded, otpCode },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );

  return CoreService.success(res, 200, 'A new verification code has been sent.', { pendingToken: newPendingToken });
}));

// ==========================================
// STANDARD LOGIN
// ==========================================
router.post('/login', CoreService.catchAsync(async (req, res) => {
  // DEBUG: log incoming request structure (do NOT print raw passwords)
  try {
    const keys = Object.keys(req.body || {});
    const passwordPresent = typeof req.body?.password === 'string' && req.body.password.length > 0;
    // eslint-disable-next-line no-console
    console.log('[AUTH] /login attempt — keys:', keys.join(','), 'email:', req.body?.email, 'passwordPresent:', passwordPresent);
  } catch (logErr) {
    // eslint-disable-next-line no-console
    console.warn('[AUTH] /login debug log failed', logErr);
  }

  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) return CoreService.error(res, 400, 'Invalid credentials.');

  const email = CoreService.normalizeEmail(validation.data.email);
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user || !user.passwordHash) {
    return CoreService.error(res, 401, 'Invalid email or password.');
  }

  const isMatch = await CoreService.verifyPassword(validation.data.password, user.passwordHash);
  if (!isMatch) return CoreService.error(res, 401, 'Invalid email or password.');

  const token = CoreService.generateAuthToken({ id: user.id, workspaceId: user.workspaceId, role: user.role });

  return CoreService.success(res, 200, 'Logged in successfully', { 
    token, 
    user: { id: user.id, email: user.email, firstName: user.firstName, role: user.role } 
  });
}));

// ==========================================
// GOOGLE SSO
// ==========================================
router.post('/google', CoreService.catchAsync(async (req, res) => {
  const { token } = req.body;
  if (!token) return CoreService.error(res, 400, 'Google token is required');

  const ticket = await googleClient.verifyIdToken({
    idToken: token,
    audience: GOOGLE_CLIENT_ID, 
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) return CoreService.error(res, 400, 'Invalid Google token');

  const email = CoreService.normalizeEmail(payload.email);
  const firstName = payload.given_name || 'User';
  const lastName = payload.family_name || '';

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      
      // STRICT 1-ADMIN RULE
      const adminExists = await tx.user.findFirst({ where: { role: 'ADMIN' } });
      const assignedRole = adminExists ? 'USER' : 'ADMIN';

      // FIX: Secure workspace creation
      const safeWorkspaceName = `${firstName}'s Workspace#${crypto.randomBytes(2).toString('hex')}`;

      const workspace = await tx.workspace.create({
        data: { name: safeWorkspaceName }
      });

      return await tx.user.create({
        data: {
          firstName,
          lastName,
          email,
          workspaceId: workspace.id,
          role: assignedRole,
          isVerified: true, 
        },
      });
    });
  }

  const jwtToken = CoreService.generateAuthToken({ id: user.id, workspaceId: user.workspaceId, role: user.role });

  return CoreService.success(res, 200, 'Google authentication successful', { 
    token: jwtToken, 
    user: { id: user.id, email: user.email, firstName: user.firstName, role: user.role } 
  });
}));

export default router;