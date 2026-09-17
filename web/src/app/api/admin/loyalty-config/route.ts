import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { getAuthUser, requireRole } from '@/lib/auth';
import { loyaltyConfigSchema } from '@/lib/validations';
import { getLoyaltyConfig } from '@/lib/loyalty';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !requireRole(user.role, ['ADMIN'])) return error('Forbidden', 403);

  try {
    const config = await getLoyaltyConfig();
    return success({ config });
  } catch {
    return error('Failed to fetch config', 500);
  }
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !requireRole(user.role, ['ADMIN'])) return error('Forbidden', 403);

  try {
    const body = await req.json();
    const parsed = loyaltyConfigSchema.safeParse(body);
    if (!parsed.success) return error('Validation error', 400, parsed.error.flatten());

    const existing = await getLoyaltyConfig();
    const config = await prisma.loyaltyConfig.update({
      where: { id: existing.id },
      data: parsed.data,
    });
    return success({ config });
  } catch (e) {
    console.error('Update loyalty config error:', e);
    return error('Failed to update config', 500);
  }
}
