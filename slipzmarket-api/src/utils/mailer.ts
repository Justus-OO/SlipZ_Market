import nodemailer from 'nodemailer';

// Initialize the transporter for Titan Email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true, // MUST be true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendVerificationEmail = async (to: string, code: string) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('\n⚠️ WARNING: SMTP credentials missing. Email not sent.');
      console.log(`[MOCK] To: ${to} | Code: ${code}\n`);
      return;
    }

    const info = await transporter.sendMail({
      // CRITICAL: The 'from' email MUST exactly match process.env.SMTP_USER for Titan
      from: `"SlipZMarket Security" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Your SlipZMarket Verification Code',
      html: `
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px; color: #2a1b1b;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #d8cdcd; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
            
            <div style="background-color: #800000; padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px;">SlipZMarket B2B</h1>
            </div>

            <div style="padding: 32px 32px 40px 32px; text-align: center;">
              <h2 style="margin-top: 0; color: #2a1b1b; font-size: 22px;">Verify your email address</h2>
              <p style="color: #7a6b6b; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
                Thanks for setting up your workspace! Please enter the 6-digit code below to verify your account and access the dashboard.
              </p>
              
              <div style="background-color: #f5f2f2; border: 1px solid #e8e2e2; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h1 style="font-size: 42px; letter-spacing: 12px; color: #800000; margin: 0; font-family: monospace;">${code}</h1>
              </div>
              
              <p style="color: #7a6b6b; font-size: 13px; margin: 0;">This code will expire in <strong>15 minutes</strong>.</p>
            </div>
          </div>
        </div>
      `,
    });

    console.log(`✅ Verification email successfully sent to ${to} [ID: ${info.messageId}]`);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw new Error('Email dispatch failed. Please check your SMTP configuration.');
  }
};