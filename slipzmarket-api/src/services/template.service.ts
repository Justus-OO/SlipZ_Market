// src/services/template.service.ts
import handlebars from 'handlebars';
import prisma from '../db'; // Ensure this matches your actual db path

// Optional: Register useful global helpers for your templates
handlebars.registerHelper('formatCurrency', (value) => {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value || 0);
});

handlebars.registerHelper('currentYear', () => {
  return new Date().getFullYear();
});

// In-memory cache to prevent hitting the DB for every single email
const templateCache = new Map<string, { 
  subject: HandlebarsTemplateDelegate; 
  html: HandlebarsTemplateDelegate; 
}>();

export const TemplateService = {
  async render(templateName: string, context: any) {
    try {
      // 1. Check if we already compiled this template (massive performance boost)
      let compiled = templateCache.get(templateName);

      if (!compiled) {
        // 2. Fetch template from DB if not cached
        // Note: Using findFirst instead of findUnique in case 'name' isn't explicitly marked @unique in Prisma
        const template = await prisma.emailTemplate.findFirst({
          where: { name: templateName }
        });

        if (!template) {
          console.warn(`⚠️ Template '${templateName}' not found in database. Using fallback.`);
          return this.getFallbackTemplate(templateName, context);
        }

        // 3. Compile BOTH subject and HTML with Handlebars 
        compiled = {
          subject: handlebars.compile(template.subject),
          html: handlebars.compile(template.htmlContent)
        };

        // 4. Save to cache
        templateCache.set(templateName, compiled);
      }

      // 5. Render with the provided context variables
      return {
        subject: compiled.subject(context),
        html: compiled.html(context)
      };
    } catch (error) {
      console.error(`❌ Error rendering template '${templateName}':`, error);
      throw new Error('Template rendering failed');
    }
  },

  /**
   * Call this when an Admin updates an email template in the settings UI.
   * This forces the server to fetch the fresh version from the database on the next send.
   */
  clearCache(templateName?: string) {
    if (templateName) {
      templateCache.delete(templateName);
      console.log(`🧹 Cleared cache for template: ${templateName}`);
    } else {
      templateCache.clear();
      console.log(`🧹 Cleared all email template caches`);
    }
  },

  /**
   * Safety net so your app doesn't crash if a DB template is missing.
   */
  getFallbackTemplate(templateName: string, context: any) {
    const fallbacks: Record<string, { subject: string, html: string }> = {
      'inactivity-reminder': {
        subject: `We missed you, ${context.firstName || 'there'}!`,
        html: `<p>Hi ${context.firstName || 'there'},</p><p>You left a chat session open with our support team. We are still here to help!</p><p>Best,<br/>The SlipZMarket Team</p>`
      },
      'default': {
        subject: 'Notification from SlipZMarket',
        html: '<p>You have a new notification regarding your account.</p>'
      }
    };

    const fallback = fallbacks[templateName] || fallbacks['default'];
    return {
      subject: fallback.subject,
      html: fallback.html
    };
  }
};