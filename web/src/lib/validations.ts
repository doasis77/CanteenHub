import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2).max(100),
  studentId: z.string().min(3).max(50),
  phone: z.string().optional(),
  inviteCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const menuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  categoryId: z.string().uuid().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  emoji: z.string().optional(),
  prepTimeMinutes: z.number().int().positive().optional(),
  isSpecial: z.boolean().optional(),
  dietaryTags: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  available: z.boolean().optional(),
});

export const cartItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  customizations: z.record(z.string(), z.unknown()).optional(),
});

export const createOrderSchema = z.object({
  pointsToRedeem: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
  paymentMethod: z.enum(['online', 'pickup', 'mock', 'stripe']).default('online'),
  pickupType: z.enum(['ASAP', 'SCHEDULED']).default('ASAP'),
  scheduledPickup: z.string().optional(),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
  vegetarian: z.boolean().optional(),
  vegan: z.boolean().optional(),
  glutenFree: z.boolean().optional(),
  dairyFree: z.boolean().optional(),
  allergies: z.array(z.string()).optional(),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(500).optional(),
});

export const rejectOrderSchema = z.object({
  reason: z.string().min(3).max(200),
});

export const staffMenuUpdateSchema = z.object({
  available: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).nullable().optional(),
  isSpecial: z.boolean().optional(),
  prepTimeMinutes: z.number().int().positive().optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum([
    'PLACED',
    'CONFIRMED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'COMPLETED',
    'CANCELLED',
  ]),
});

export const loyaltyConfigSchema = z.object({
  pointsPerDollar: z.number().int().min(1).optional(),
  redeemPointsPerUnit: z.number().int().min(1).optional(),
  redeemValueCents: z.number().int().min(1).optional(),
  cancelWindowMinutes: z.number().int().min(1).optional(),
  maxOrderItems: z.number().int().min(1).optional(),
  taxRate: z.number().min(0).max(1).optional(),
});
