import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { verifyPassword, signAccessToken, createRefreshToken } from '@/lib/auth';
import { asUserRole } from '@/lib/db-types';
import { loginSchema } from '@/lib/validations';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`login:${ip}`, 20, 15 * 60 * 1000)) {
    return error('Too many login attempts', 429);
  }

  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return error('Validation error', 400, parsed.error.flatten());
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return error('Invalid email or password', 401);
    }

    const accessToken = signAccessToken({
      userId: user.id,
      role: asUserRole(user.role),
      email: user.email,
    });
    const refreshToken = await createRefreshToken(user.id);

    return success({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        studentId: user.studentId,
        role: asUserRole(user.role),
        loyaltyPoints: user.loyaltyPoints,
        loyaltyTier: user.loyaltyTier,
        emailVerified: user.emailVerified,
      },
      accessToken,
      refreshToken,
    });
  } catch (e) {
    console.error('Login error:', e);
    return error('Login failed', 500);
  }
}
