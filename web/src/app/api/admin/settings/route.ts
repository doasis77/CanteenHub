import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { requireRoles, Permissions } from '@/lib/rbac';
import { z } from 'zod';

const settingsSchema = z.object({
  canteenOpenTime: z.string().optional(),
  canteenCloseTime: z.string().optional(),
  canteenIsOpen: z.boolean().optional(),
  universityEmailDomain: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireRoles(req, Permissions.admin);
  if (auth.error) return auth.error;

  const settings = await prisma.systemSettings.findFirst();
  return success({ settings });
}

export async function PUT(req: NextRequest) {
  const auth = await requireRoles(req, Permissions.admin);
  if (auth.error) return auth.error;

  try {
    const parsed = settingsSchema.safeParse(await req.json());
    if (!parsed.success) return error('Validation error', 400, parsed.error.flatten());

    const existing = await prisma.systemSettings.findFirst();
    const settings = existing
      ? await prisma.systemSettings.update({ where: { id: existing.id }, data: parsed.data })
      : await prisma.systemSettings.create({ data: parsed.data });

    return success({ settings });
  } catch (e) {
    console.error('Settings update error:', e);
    return error('Failed to update settings', 500);
  }
}
