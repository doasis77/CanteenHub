import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { requireRoles, Permissions } from '@/lib/rbac';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const auth = await requireRoles(req, Permissions.admin);
  if (auth.error) return auth.error;

  const invites = await prisma.inviteCode.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return success({ invites });
}

export async function POST(req: NextRequest) {
  const auth = await requireRoles(req, Permissions.admin);
  if (auth.error) return auth.error;

  try {
    const { role, expiresInDays } = z
      .object({
        role: z.enum(['STAFF', 'ADMIN']).default('STAFF'),
        expiresInDays: z.number().int().min(1).max(30).default(7),
      })
      .parse(await req.json());

    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invite = await prisma.inviteCode.create({
      data: {
        code,
        role,
        expiresAt,
        createdBy: auth.user!.id,
      },
    });

    return success({ invite }, 201);
  } catch {
    return error('Failed to create invite', 400);
  }
}
