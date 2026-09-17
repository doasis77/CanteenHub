import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { generateEmailVerifyToken } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000)) {
    return error('Too many requests', 429);
  }

  try {
    const { email } = z.object({ email: z.string().email() }).parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = generateEmailVerifyToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetExpires: expires },
      });
      return success({
        message: 'If the email exists, a reset link was sent.',
        mockResetLink: `/reset-password?token=${token}`,
      });
    }

    return success({ message: 'If the email exists, a reset link was sent.' });
  } catch {
    return error('Invalid request', 400);
  }
}
