// src/routes/settings.routes.ts
import { Router, Response, Request } from 'express';
import { CoreService } from '../services/core.services'; 
import prisma from '../db';
import { requireAuth, requireAdmin } from './middleware/auth.middleware';

const router = Router();

// 1. GET CURRENT SETTINGS
router.get('/', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  let settings = await prisma.globalSettings.findUnique({ where: { id: 'singleton' } });
  
  if (!settings) {
    settings = await prisma.globalSettings.create({ data: { id: 'singleton' } });
  }

  return CoreService.success(res, 200, 'Settings retrieved', settings);
}));

// 2. UPDATE SETTINGS
router.put('/', requireAuth, requireAdmin, CoreService.catchAsync(async (req: any, res: Response) => {
  const data = req.body;

  const updatedSettings = await prisma.globalSettings.upsert({
    where: { id: 'singleton' },
    update: {
      platformName: data.platformName,
      supportEmail: data.supportEmail,
      primaryColor: data.primaryColor,
      accentColor: data.accentColor,
      backgroundColor: data.backgroundColor,
      fontFamily: data.fontFamily,
      logoUrl: data.logoUrl,
      maintenanceMode: data.maintenanceMode,
      defaultRegion: data.defaultRegion,
      gateway: data.gateway,
      currency: data.currency,
      processingFee: Number(data.processingFee) || 4.50,
      publicKey: data.publicKey,
      secretKey: data.secretKey,
      require2FA: data.require2FA,
      sessionTimeout: data.sessionTimeout,
      
      // 👉 NEW: Localization & Branding mappings
      defaultLanguage: data.defaultLanguage,
      enabledLanguages: data.enabledLanguages,
      timezone: data.timezone,
      dateFormat: data.dateFormat,
      
      // 👉 NEW: Scripts mappings
      googleAnalyticsId: data.googleAnalyticsId,
      customHeadCode: data.customHeadCode,
      
      customVariables: data.customVariables || {}
    },
    create: {
      id: 'singleton',
      platformName: data.platformName,
      supportEmail: data.supportEmail,
      primaryColor: data.primaryColor,
      accentColor: data.accentColor,
      backgroundColor: data.backgroundColor,
      fontFamily: data.fontFamily,
      logoUrl: data.logoUrl,
      maintenanceMode: data.maintenanceMode,
      defaultRegion: data.defaultRegion,
      gateway: data.gateway,
      currency: data.currency,
      processingFee: Number(data.processingFee) || 4.50,
      publicKey: data.publicKey,
      secretKey: data.secretKey,
      require2FA: data.require2FA,
      sessionTimeout: data.sessionTimeout,
      
      // 👉 NEW: Localization & Branding
      defaultLanguage: data.defaultLanguage,
      enabledLanguages: data.enabledLanguages,
      timezone: data.timezone,
      dateFormat: data.dateFormat,
      
      // 👉 NEW: Scripts
      googleAnalyticsId: data.googleAnalyticsId,
      customHeadCode: data.customHeadCode,
      
      customVariables: data.customVariables || {}
    }
  });

  return CoreService.success(res, 200, 'Settings updated', updatedSettings);
}));

// 3. MOCK DATA ENGINE
router.post('/data-engine', requireAuth, requireAdmin, CoreService.catchAsync(async (req: any, res: Response) => {
  const { action } = req.body;

  await prisma.$transaction(async (tx) => {
    switch (action) {
      case 'Reset Lead Packages':
        await tx.cartItem.deleteMany({});
        await tx.package.deleteMany({});
        break;

      case 'Purge Order History':
        await tx.activityLog.deleteMany({});
        await tx.invoice.deleteMany({});
        await tx.billingProfile.deleteMany({});
        await tx.cartItem.deleteMany({});
        break;

      case 'Factory Reset':
        await tx.activityLog.deleteMany({});
        await tx.invoice.deleteMany({});
        await tx.billingProfile.deleteMany({});
        await tx.cartItem.deleteMany({});
        await tx.package.deleteMany({});
        await tx.user.deleteMany({ where: { role: 'USER' } });
        break;

      default:
        throw new Error('Invalid Data Engine Action');
    }
  });

  return CoreService.success(res, 200, `${action} executed successfully`, null);
}));

// 4. EMAIL TEMPLATES (ADMIN)
router.get('/email-templates', requireAuth, requireAdmin, CoreService.catchAsync(async (req: any, res: Response) => {
  const templates = await prisma.emailTemplate.findMany({ orderBy: { name: 'asc' } });
  return CoreService.success(res, 200, 'Email templates fetched', { templates });
}));

router.post('/email-templates', requireAuth, requireAdmin, CoreService.catchAsync(async (req: any, res: Response) => {
  const { name, subject, htmlContent } = req.body;
  const created = await prisma.emailTemplate.create({ data: { name, subject, htmlContent } });
  return CoreService.success(res, 201, 'Template created', { template: created });
}));

router.put('/email-templates/:id', requireAuth, requireAdmin, CoreService.catchAsync(async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, subject, htmlContent } = req.body;
  const updated = await prisma.emailTemplate.update({ where: { id }, data: { name, subject, htmlContent } });
  return CoreService.success(res, 200, 'Template updated', { template: updated });
}));

router.delete('/email-templates/:id', requireAuth, requireAdmin, CoreService.catchAsync(async (req: any, res: Response) => {
  const { id } = req.params;
  await prisma.emailTemplate.delete({ where: { id } });
  return CoreService.success(res, 200, 'Template deleted', {});
}));

export default router;