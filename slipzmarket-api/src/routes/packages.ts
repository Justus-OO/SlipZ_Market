// src/routes/packages.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { z } from 'zod';
import { CoreService } from '../services/core.services';
import prisma from '../db';
import { requireAuth, requireAdmin } from './middleware/auth.middleware';

const router = Router();

// Configure multer to store uploaded files in memory (perfect for serverless/cloud)
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// VALIDATION SCHEMAS
// ==========================================
const packageSchema = z.object({
  id: z.string().trim().min(3, 'Package ID is required'),
  brand: z.string().trim().min(2, 'Brand name is required'),
  category: z.string().trim().min(2, 'Category is required'),
  
  // Use preprocess to force strings into numbers if they come from CSVs
  leadsCount: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().positive('Leads count must be a positive integer')
  ),
  
  price: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().positive('Price must be positive')
  ),
  
  deliverability: z.string().trim().min(2, 'Deliverability string is required'),
});

// ==========================================
// PUBLIC ROUTES (All Users)
// ==========================================

// GET ALL PACKAGES
router.get('/', CoreService.catchAsync(async (_req: Request, res: Response) => {
  const packages = await prisma.package.findMany({
    orderBy: { leadsCount: 'asc' }
  });

  const formattedPackages = packages.map(pkg => ({
    id: pkg.id,
    brand: pkg.brand,
    category: pkg.category,
    leadsCount: pkg.leadsCount,
    price: Number(pkg.price),
    unitPrice: Number(pkg.price) / pkg.leadsCount,
    deliverability: pkg.deliverability,
    lastUpdated: new Date(pkg.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    type: 'CSV/Excel'
  }));

  return CoreService.success(res, 200, 'Packages retrieved successfully', { packages: formattedPackages });
}));

// GET SINGLE PACKAGE BY ID
router.get('/:id', CoreService.catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string; 
  const pkg = await prisma.package.findUnique({ where: { id } });
  
  if (!pkg) return CoreService.error(res, 404, 'Package not found');
  return CoreService.success(res, 200, 'Package retrieved', { package: pkg });
}));

// ==========================================
// ADMIN ONLY ROUTES
// ==========================================

// CREATE SINGLE PACKAGE
router.post('/', requireAuth, requireAdmin, CoreService.catchAsync(async (req: Request, res: Response) => {
  const validation = packageSchema.safeParse(req.body);
  if (!validation.success) {
    return CoreService.error(res, 400, 'Validation failed', validation.error.flatten().fieldErrors);
  }

  const existing = await prisma.package.findUnique({ where: { id: validation.data.id } });
  if (existing) return CoreService.error(res, 400, 'A package with this ID already exists.');

const newPackage = await prisma.package.create({ 
    data: {
      ...validation.data,
      // Force these to be numbers to satisfy Prisma's strict requirements
      leadsCount: Number(validation.data.leadsCount || 0),
      price: Number(validation.data.price || 0)
    } 
  });
  return CoreService.success(res, 201, 'Package created successfully', { package: newPackage });
}));

// UPDATE SINGLE PACKAGE
router.put('/:id', requireAuth, requireAdmin, CoreService.catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const validation = packageSchema.partial().safeParse(req.body); 
  if (!validation.success) {
    return CoreService.error(res, 400, 'Validation failed', validation.error.flatten().fieldErrors);
  }

  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing) return CoreService.error(res, 404, 'Package not found');

  const updatedPackage = await prisma.package.update({
    where: { id },
    data: validation.data
  });

  return CoreService.success(res, 200, 'Package updated successfully', { package: updatedPackage });
}));

// DELETE SINGLE PACKAGE
router.delete('/:id', requireAuth, requireAdmin, CoreService.catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing) return CoreService.error(res, 404, 'Package not found');

  await prisma.package.delete({ where: { id } });
  return CoreService.success(res, 200, 'Package deleted successfully');
}));

// ==========================================
// CSV BULK IMPORT METADATA (ADMIN ONLY)
// ==========================================
router.post('/import', requireAuth, requireAdmin, upload.single('file'), CoreService.catchAsync(async (req: Request | any, res: Response) => {
  if (!req.file) return CoreService.error(res, 400, 'No CSV file uploaded.');

  const results: any[] = [];
  const errors: string[] = [];

  const stream = Readable.from(req.file.buffer.toString());

  stream
    .pipe(csvParser())
    .on('data', (data) => {
      const row = {
        id: data["ID"]?.trim(),
        brand: data["Brand"]?.trim(),
        category: data["Category"]?.trim(),
        leadsCount: parseInt(data["Contacts"], 10),
        price: parseFloat(data["Price"]),
        deliverability: data["Deliverability"]?.trim()
      };

      if (row.id && !isNaN(row.leadsCount) && !isNaN(row.price)) {
        results.push(row);
      } else {
        errors.push(`Skipping invalid row: ${JSON.stringify(data)}`);
      }
    })
    .on('end', async () => {
      console.log('📦 CSV Processing Finished. Total rows parsed:', results.length);
      if (results.length === 0) return CoreService.error(res, 400, 'CSV file is empty or formatted incorrectly.');

      try {
        const insertData = await prisma.package.createMany({
          data: results,
          skipDuplicates: true, 
        });

        return CoreService.success(res, 201, 'CSV Import Complete', {
          rowsProcessed: results.length,
          rowsInserted: insertData.count,
          errors: errors.length > 0 ? errors : null
        });
      } catch (dbError: any) {
        console.error("❌ CRITICAL Bulk Insert Error:", dbError);
        return CoreService.error(res, 500, `Database error: ${dbError.message || 'Unknown database error'}`);
      }
    });
}));

// ==========================================
// 👉 NEW: UPLOAD RAW LEADS DATASET TO A PACKAGE
// ==========================================
router.post('/:id/upload-leads', requireAuth, requireAdmin, upload.single('file'), CoreService.catchAsync(async (req: Request | any, res: Response) => {
  const { id } = req.params; // The target Package ID
  
  if (!req.file) return CoreService.error(res, 400, 'No CSV file uploaded.');

  // 1. Verify the package actually exists
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) return CoreService.error(res, 404, 'Package not found. Cannot attach leads.');

  const results: any[] = [];
  const errors: string[] = [];

  // 2. Parse the CSV file
  const stream = Readable.from(req.file.buffer.toString());

  stream
    .pipe(csvParser())
    .on('data', (data) => {
      // Create a unified payload, catching common CSV header variations
      const row = {
        firstName: data['firstName']?.trim() || data['First Name']?.trim() || data['first_name']?.trim(),
        lastName: data['lastName']?.trim() || data['Last Name']?.trim() || data['last_name']?.trim(),
        email: data['email']?.trim() || data['Email']?.trim() || data['Email Address']?.trim(),
        phone: data['phone']?.trim() || data['Phone']?.trim() || data['Phone Number']?.trim() || null,
        jobTitle: data['jobTitle']?.trim() || data['Job Title']?.trim() || 'Professional',
        companyName: data['companyName']?.trim() || data['Company']?.trim() || data['Company Name']?.trim() || 'Unknown',
        
        // Smart fallback: If the CSV doesn't have an industry column, inherit it from the Package Category
        industry: data['industry']?.trim() || data['Industry']?.trim() || pkg.category,
        country: data['country']?.trim() || data['Country']?.trim() || 'Unknown',
        
        // If your MasterLead schema has a packageId field, uncomment the line below:
        // packageId: id 
      };

      // Email is the minimum required field to save a lead
      if (row.email) {
        results.push(row);
      } else {
        errors.push(`Missing email address. Row skipped.`);
      }
    })
    .on('end', async () => {
      if (results.length === 0) return CoreService.error(res, 400, 'CSV is empty or missing email columns.');

      try {
        // 3. Bulk insert directly into MasterLead
        const insertData = await prisma.masterLead.createMany({
          data: results,
          skipDuplicates: true, // CRITICAL: Prevents Prisma from crashing on duplicate unique emails
        });

        console.log(`✅ Leads uploaded to package ${id}. Count:`, insertData.count);

        return CoreService.success(res, 201, 'Leads successfully uploaded to database', {
          rowsProcessed: results.length,
          rowsInserted: insertData.count,
          errors: errors.length > 0 ? errors : null
        });
      } catch (dbError: any) {
        console.error("❌ MasterLead Insert Error:", dbError);
        return CoreService.error(res, 500, `Database error inserting leads: ${dbError.message}`);
      }
    });
}));

export default router;