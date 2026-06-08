import prisma from '../db.js';

const emailTemplates = [
  {
    id: '0084150c-4bec-4b8f-a472-f33224fd1eb7',
    name: 'INVOICE_CONFIRMATION',
    subject: 'Your SlipZMarket Invoice {{invoiceId}}',
    htmlContent: `<div style="font-family: sans-serif; color: #2a1b1b; padding: 20px;"><h1>Payment Confirmed</h1><p>Hi {{name}},</p><p>Thank you for your purchase of <strong>£{{total}}</strong>.</p></div>`,
    updatedAt: new Date('2026-06-03T21:25:00.430Z'),
  },
  {
    id: '0f583cfd-9484-40e8-b49e-df74cf43f603',
    name: 'PASSWORD_RESET',
    subject: 'Reset your SlipZMarket Password',
    htmlContent: `<div style="font-family: sans-serif; padding: 20px;"><h1>Reset your password</h1><p>Click the link below:</p><a href="{{resetUrl}}">Reset Password</a></div>`,
    updatedAt: new Date('2026-06-03T21:25:00.430Z'),
  },
  {
    id: '11b8b213-249b-4a10-b0d5-68d5d4401f78',
    name: 'VERIFICATION_CODE',
    subject: 'Your SlipZMarket Verification Code',
    htmlContent: `<div style="font-family: sans-serif; background-color: #f9fafb; padding: 40px; color: #2a1b1b;"><div style="max-width: 500px; margin: 0 auto; background: white; padding: 32px; border: 1px solid #d8cdcd; border-radius: 12px;"><h1 style="color: #800000; text-align: center;">Welcome!</h1><p>Your verification code is:</p><div style="font-size: 32px; font-weight: bold; text-align: center; margin: 20px 0; background: #f5f2f2; padding: 10px;">{{code}}</div></div></div>`,
    updatedAt: new Date('2026-06-03T21:25:00.430Z'),
  },
  {
    id: '2146c60a-9467-413f-bb13-21f1b497db4e',
    name: 'inactivity-reminder',
    subject: 'We missed you at SlipZMarket!',
    htmlContent: `<h1>Hi {{firstName}},</h1><p>It looks like you haven't finished your chat with our agent. We are still here to help!</p><p>Best,<br/>The SlipZMarket Team</p>`,
    updatedAt: new Date('2026-06-04T21:56:19.187Z'),
  },
  {
    id: '3a9b94c3-338f-43c9-a373-18526e2ccbe6',
    name: 'ADMIN_VERIFICATION_CODE',
    subject: 'Security Verification Code',
    htmlContent: `<div style="font-family: sans-serif; padding: 20px;">
    <h2 style="color: #800000;">Security Verification</h2>
    <p>Hello {{userName}},</p>
    <p>To authorize the changes to your SlipZMarket settings, please use the following code:</p>
    <div style="font-size: 24px; font-weight: bold; padding: 10px; background: #f5efe6; width: fit-content; border-radius: 8px;">
      {{code}}
    </div>
    <p>This code will expire in 5 minutes.</p>
  </div>`,
    updatedAt: new Date('2026-06-08T12:15:09.198Z'),
  },
  {
    id: '56d0d98c-330c-45aa-a40b-c65bd6eb45a2',
    name: 'order-failed',
    subject: 'Important: Issue with your SlipZMarket Order',
    htmlContent: `<div style="font-family: sans-serif; color: #3b2a23; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ffcccc; rounded-2xl;">
        <h1 style="color: #cc0000; font-size: 24px;">Order Processing Issue</h1>
        <p>Hi {{name}},</p>
        <p>We encountered an issue while processing your recent transaction with SlipZMarket.</p>
        <div style="background: #fff0f0; padding: 15px; border-left: 4px solid #ff4444; border-radius: 4px; margin: 20px 0;">
            <strong style="color: #cc0000;">Reason for Failure:</strong> {{errorMessage}}
        </div>
        <p>If your card was charged, a refund will be initiated automatically. Please check your payment details or contact support to assist in completing your order.</p>
        <br/>
        <p>Best regards,<br/><strong>The SlipZMarket Team</strong></p>
    </div>`,
    updatedAt: new Date('2026-06-04T22:05:36.414Z'),
  },
  {
    id: 'bf55b9a4-2430-4bd4-8215-522f0090dfcd',
    name: 'order-success',
    subject: 'Receipt for Invoice {{invoiceId}}',
    htmlContent: `<div style="font-family: sans-serif; color: #3b2a23; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #d6c9b8; rounded-2xl;">
        <h1 style="color: #3b2a23; font-size: 24px;">Thank you, {{name}}!</h1>
        <p>Your payment of <strong style="color: #3b2a23;">£{{amount}}</strong> was successful.</p>
        <p>You have unlocked <strong>{{leadsUnlocked}}</strong> new leads. You can download your datasets directly from your workspace dashboard.</p>
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e6dfd5; color: #8b6f5a; font-size: 12px;">
            <p>Invoice Reference: {{invoiceId}}</p>
        </div>
        <br/>
        <p>Best regards,<br/><strong>The SlipZMarket Team</strong></p>
    </div>`,
    updatedAt: new Date('2026-06-04T22:05:36.414Z'),
  },
];

const globalSettingsData = {
  id: 'singleton',
  platformName: 'SlipZMarket B2B',
  supportEmail: 'slupz@gmail.com',
  defaultRegion: 'UK & Europe',
  gateway: 'Stripe',
  currency: 'USD ($)',
  processingFee: '0.10',
  publicKey: '',
  secretKey: '',
  defaultLanguage: 'en-US',
  enabledLanguages: ['en-US', 'en-GB', 'es-ES', 'fr-FR'],
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  primaryColor: '#3b2a23',
  accentColor: '#8b6f5a',
  backgroundColor: '#f5efe6',
  fontFamily: 'Inter, system-ui, sans-serif',
  logoUrl: '',
  googleAnalyticsId: '',
  customHeadCode: '',
  require2FA: true,
  sessionTimeout: '60',
  customVariables: {},
};

async function seedEmailTemplates() {
  for (const template of emailTemplates) {
    // Check by id first (we have explicit ids), then by name to avoid unique constraint errors
    const existsById = await prisma.emailTemplate.findUnique({ where: { id: template.id } });
    if (existsById) {
      console.log(`Skipped existing template by id: ${template.id}`);
      continue;
    }

    const existsByName = await prisma.emailTemplate.findUnique({ where: { name: template.name } });
    if (existsByName) {
      console.log(`Skipped existing template by name: ${template.name}`);
      continue;
    }

    try {
      await prisma.emailTemplate.create({ data: template });
      console.log(`Created template: ${template.name}`);
    } catch (err) {
      console.error(`Failed to create template ${template.name}:`, err);
    }
  }
}

async function seedGlobalSettings() {
  const existing = await prisma.globalSettings.findUnique({
    where: { id: globalSettingsData.id },
  });

  if (existing) {
    console.log('Global settings already exist, skipping creation.');
    return;
  }

  await prisma.globalSettings.create({ data: globalSettingsData });
  console.log('Created global settings singleton entry.');
}

async function main() {
  try {
    await seedEmailTemplates();
    await seedGlobalSettings();
    console.log('Seed complete.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
