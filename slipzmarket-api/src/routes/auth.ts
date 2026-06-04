import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../db.js';
import type { Prisma } from '../generated/client/client.js';
import { sendVerificationEmail } from '../utils/mailer.js';

const router = Router();

// ==========================================
// ENVIRONMENT & CONFIGURATION
// ==========================================
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL ERROR: JWT_SECRET is not defined.');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ==========================================
// VALIDATION SCHEMAS
// ==========================================
const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  email: z.string().trim().email(),
  companyName: z.string().trim().min(2).max(100),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

// ==========================================
// STEP 1: SEND CODE (NO DATABASE SAVE YET)
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.flatten().fieldErrors });
    }

    const { firstName, lastName, email: rawEmail, companyName, password } = validation.data;
    const email = rawEmail.toLowerCase();

    // Ensure user doesn't already exist
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'A user with this email already exists.' });

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const otpCode = generateOTP();

    // Send the email
    await sendVerificationEmail(email, otpCode);

    // Package all their details into a temporary JWT (Expires in 15 mins)
    const pendingToken = jwt.sign(
      { firstName, lastName, email, companyName, passwordHash, otpCode },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Give the token to the frontend so it can hold onto it
    res.status(200).json({ 
      message: 'Verification code sent. Please check your email.', 
      pendingToken 
    });

  } catch (error) {
    console.error('Registration Step 1 Error:', error);
    res.status(500).json({ error: 'Failed to process registration or send email.' });
  }
});

// ==========================================
// STEP 2: VERIFY CODE & COMPLETE REGISTRATION
// ==========================================
router.post('/verify', async (req, res) => {
  try {
    const { pendingToken, code } = req.body;
    if (!pendingToken || !code) return res.status(400).json({ error: 'Session expired or missing code.' });

    // 1. Decode and verify the temporary token
    let decoded: any;
    try {
      decoded = jwt.verify(pendingToken, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'Verification session expired. Please register again.' });
    }

    // 2. Check if the code matches
    if (decoded.otpCode !== code) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    // 3. Double-check user doesn't exist just in case
    const existingUser = await prisma.user.findUnique({ where: { email: decoded.email } });
    if (existingUser) return res.status(400).json({ error: 'User is already registered.' });

    // 4. NOW WE SAVE TO THE DATABASE
    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Safely upsert the workspace so it never crashes on duplicate names
      const workspace = await tx.workspace.upsert({
        where: { name: decoded.companyName },
        update: {},
        create: { name: decoded.companyName },
      });

      return await tx.user.create({
        data: {
          firstName: decoded.firstName,
          lastName: decoded.lastName,
          email: decoded.email,
          passwordHash: decoded.passwordHash,
          workspaceId: workspace.id,
          role: 'ADMIN',
          isVerified: true, // They are fully verified upon creation!
        },
      });
    });

    // 5. Generate actual login token
    const token = jwt.sign(
      { userId: user.id, workspaceId: user.workspaceId, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ message: 'Registration complete!', token, user: { id: user.id, email: user.email, firstName: user.firstName } });

  } catch (error) {
    console.error('Verification Error:', error);
    res.status(500).json({ error: 'An unexpected error occurred during verification.' });
  }
});

// ==========================================
// RESEND OTP (Stateless Version)
// ==========================================
router.post('/resend-otp', async (req, res) => {
  try {
    const { pendingToken } = req.body;
    if (!pendingToken) return res.status(400).json({ error: 'Session expired. Please register again.' });

    // Decode ignoring expiration so they can request a new code even if 15 mins passed
    const decoded = jwt.verify(pendingToken, JWT_SECRET, { ignoreExpiration: true }) as any;
    const otpCode = generateOTP();

    await sendVerificationEmail(decoded.email, otpCode);

    // Issue a fresh token with the new code
    const newPendingToken = jwt.sign(
      { ...decoded, otpCode },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.status(200).json({ message: 'A new verification code has been sent.', pendingToken: newPendingToken });
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({ error: 'Failed to resend OTP.' });
  }
});

// ==========================================
// STANDARD LOGIN
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ error: 'Invalid credentials.' });

    const { email: rawEmail, password } = validation.data;
    const email = rawEmail.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign(
      { userId: user.id, workspaceId: user.workspaceId, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({ message: 'Logged in successfully', token, user: { id: user.id, email: user.email, firstName: user.firstName } });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// ==========================================
// GOOGLE SSO
// ==========================================
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Google token is required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID, 
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(400).json({ error: 'Invalid Google token' });

    const email = payload.email.toLowerCase();
    const firstName = payload.given_name || 'User';
    const lastName = payload.family_name || '';

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const workspace = await tx.workspace.upsert({
          where: { name: `${firstName}'s Workspace` },
          update: {},
          create: { name: `${firstName}'s Workspace` }
        });

        return await tx.user.create({
          data: {
            firstName,
            lastName,
            email,
            workspaceId: workspace.id,
            role: 'ADMIN',
            isVerified: true, 
          },
        });
      });
    }

    const jwtToken = jwt.sign(
      { userId: user.id, workspaceId: user.workspaceId, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({ message: 'Google authentication successful', token: jwtToken, user: { id: user.id, email: user.email, firstName: user.firstName } });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
});

export default router;