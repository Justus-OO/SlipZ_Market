import { Router, Request, Response } from 'express';
import { CoreService } from '../services/core.services'; // Ensure singular 'core.service'
import prisma from '../db';
import { requireAuth } from './middleware/auth.middleware';

const router = Router();

// GET CART ITEMS
router.get('/', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const items = await prisma.cartItem.findMany({
    where: { userId: req.user.userId },
    include: { package: true } // Automatically fetches the new includesEmail/includesPhone flags
  });
  return CoreService.success(res, 200, 'Cart retrieved', { items });
}));

// ADD TO CART
router.post('/add', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const { packageId, quantity = 1 } = req.body;
  const userId = req.user.userId;

  if (!packageId) {
    return CoreService.error(res, 400, 'packageId is required');
  }

  const existing = await prisma.cartItem.findFirst({ where: { userId, packageId } });
  
  if (existing) {
    const updated = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + Number(quantity) },
      // 👈 NEW: Include package details so the frontend gets the flags instantly
      include: { package: true } 
    });
    return CoreService.success(res, 200, 'Cart updated', { cart: updated });
  }

  const item = await prisma.cartItem.create({ 
    data: { userId, packageId, quantity: Number(quantity) },
    // 👈 NEW: Include package details so the frontend gets the flags instantly
    include: { package: true }
  });
  
  return CoreService.success(res, 201, 'Added to cart', { cart: item });
}));

// UPDATE CART ITEM QUANTITY
router.patch('/:id', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const { id } = req.params;
  const { quantity } = req.body;
  const userId = req.user.userId;

  if (typeof quantity !== 'number' || quantity < 1) {
    return CoreService.error(res, 400, 'quantity must be a positive number');
  }

  const updated = await prisma.cartItem.updateMany({
    where: { id, userId },
    data: { quantity }
  });

  if (updated.count === 0) {
    return CoreService.error(res, 404, 'Cart item not found');
  }

  const item = await prisma.cartItem.findUnique({
    where: { id },
    include: { package: true } // Flags are fetched here
  });

  return CoreService.success(res, 200, 'Quantity updated', { cart: item });
}));

// REMOVE ITEM FROM CART
router.delete('/:id', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.userId;

  // Ensure user owns the cart item before deleting
  await prisma.cartItem.deleteMany({
    where: { id, userId }
  });
  
  return CoreService.success(res, 200, 'Item removed');
}));

// CLEAR CART
router.delete('/', requireAuth, CoreService.catchAsync(async (req: any, res: Response) => {
  await prisma.cartItem.deleteMany({ where: { userId: req.user.userId } });
  return CoreService.success(res, 200, 'Cart cleared');
}));

export default router;