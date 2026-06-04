// src/services/mailer.service.ts
import nodemailer from 'nodemailer';
import { TemplateService } from './template.service';
import { SettingsService } from './settings.service';

const getTransporter = async () => {
  // Use the new Retriever
  const settings = await SettingsService.get();

  const vars = (settings?.customVariables as any) || {};

  return nodemailer.createTransport({
    host: vars.SMTP_HOST || process.env.SMTP_HOST,
    port: Number(vars.SMTP_PORT || process.env.SMTP_PORT || 465),
    secure: true,
    auth: {
      user: vars.SMTP_USER || process.env.SMTP_USER,
      pass: vars.SMTP_PASS || process.env.SMTP_PASS,
    },
  });
};

export const MailerService = {
  async send({ to, templateName, context, attachments = [] }: any) {
    const { subject, html } = await TemplateService.render(templateName, context);
    const transporter = await getTransporter();
    
    return await transporter.sendMail({
      from: `"SlipZMarket" <${process.env.SMTP_USER}>`,
      to, subject, html, attachments,
    });
  }
};