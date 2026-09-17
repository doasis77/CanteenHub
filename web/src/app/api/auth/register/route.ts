import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import {
  hashPassword,
  signAccessToken,
  createRefreshToken,
  generateEmailVerifyToken,
} from '@/lib/auth';
import { asUserRole } from '@/lib/db-types';
import { registerSchema } from '@/lib/validations';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getSystemSettings, isUniversityEmail } from '@/lib/settings';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`register:${ip}`, 10, 15 * 60 * 1000)) {
    return error('Too many registration attempts', 429);
  }

  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return error('Validation error', 400, parsed.error.flatten());
    }

    const { email, password, fullName, studentId, phone, inviteCode } = parsed.data;

    const settings = await getSystemSettings();
    if (!isUniversityEmail(email, settings.universityEmailDomain)) {
      return error(`Registration requires a ${settings.universityEmailDomain} email address`, 400);
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { studentId }] },
    });
    if (existing) {
      return error('Email or student ID already registered', 409);
    }

    let assignedRole = 'STUDENT';
    let inviteRecord: { id: string; role: string } | null = null;

    if (inviteCode?.trim()) {
      const invite = await prisma.inviteCode.findFirst({
        where: {
          code: inviteCode.trim().toUpperCase(),
          usedBy: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!invite) {
        return error('Invalid or expired invite code', 400);
      }
      assignedRole = invite.role;
      inviteRecord = invite;
    }

    const passwordHash = await hashPassword(password);
    const emailVerifyToken = generateEmailVerifyToken();

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          studentId,
          phone,
          role: assignedRole,
          emailVerifyToken,
          dietaryPreferences: { create: {} },
        },
      });

      if (inviteRecord) {
        await tx.inviteCode.update({
          where: { id: inviteRecord.id },
          data: { usedBy: created.id, usedAt: new Date() },
        });
      }

      return created;
    });

    const accessToken = signAccessToken({
      userId: user.id,
      role: asUserRole(user.role),
      email: user.email,
    });
    const refreshToken = await createRefreshToken(user.id);

    return success(
      {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          studentId: user.studentId,
          role: asUserRole(user.role),
          loyaltyPoints: user.loyaltyPoints,
          emailVerified: user.emailVerified,
        },
        accessToken,
        refreshToken,
        emailVerification: {
          sent: true,
          mockLink: `/api/auth/verify-email?token=${emailVerifyToken}`,
        },
      },
      201
    );
  } catch (e) {
    console.error('Register error:', e);
    return error('Registration failed', 500);
  }
}
