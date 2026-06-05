import { MailerService } from '../services/mailer.service.js'; // Adjust path if needed

export const sendVerificationEmail = async (to: string, code: string) => {
  try {
    await MailerService.send({
      to,
      templateName: 'VERIFICATION_CODE', 
      context: { 
        code, 
        name: 'User' 
      }
    });
  } catch (error) {
    console.error('❌ Verification email dispatch failed:', error);
    throw new Error('Email dispatch failed. Please check your SMTP configuration.');
  }
};

// ==========================================
// 🟢 NEW: WELCOME EMAIL DISPATCHER
// ==========================================
export const sendWelcomeEmail = async (to: string, firstName: string) => {
  try {
    // Run asynchronously without blocking the main thread
    await MailerService.send({
      to,
      templateName: 'WELCOME_EMAIL', // Ensure this matches the 'name' in your EmailTemplate DB table
      context: { 
        name: firstName 
      }
    });
  } catch (error) {
    // We log the error but DO NOT throw. 
    // We don't want to rollback a successful user registration just because of an email timeout.
    console.error(`⚠️ Silent failure: Could not send welcome email to ${to}:`, error);
  }
};