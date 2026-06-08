import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import puppeteer from 'puppeteer';

export const ReportService = {
  async generatePDF(templateName: string, data: any): Promise<Buffer> {
    let browser;
    try {
      // 1. Resolve template
      const templatePath = path.join(process.cwd(), 'src', 'templates', `${templateName}.hbs`);
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found at: ${templatePath}`);
      }

      const templateHtml = fs.readFileSync(templatePath, 'utf8');
      const compiledTemplate = handlebars.compile(templateHtml);
      const finalHtml = compiledTemplate(data);

      // 2. Launch Puppeteer with Production-Ready arguments
      // --no-sandbox is essential for many Linux-based cloud environments (Render, Heroku, Docker)
      const launchOptions: any = {
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Prevents crashes in low-memory environments
          '--no-zygote'
        ]
      };

      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }

      browser = await puppeteer.launch(launchOptions);

      const page = await browser.newPage();

      // 3. Set content with a safety timeout
      await page.setContent(finalHtml, { 
        waitUntil: 'networkidle0', 
        timeout: 30000 
      });

      // 4. Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '40px', right: '20px', bottom: '40px', left: '20px' }
      });

      return Buffer.from(pdfBuffer);
      
    } catch (error: any) {
      // Log the specific error for debugging
      console.error('[REPORT_SERVICE_ERROR]', error.message);
      
      // Rethrow a generic error for the API to catch, 
      // but you can now see the real reason in the logs
      throw new Error(`PDF_GENERATION_FAILED: ${error.message}`);
      
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
};