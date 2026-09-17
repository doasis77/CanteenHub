import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const { token, password } = z
      .object({ token: z.string(), password: z.string().min(6) })
      .parse(await req.json());

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) return error('Invalid or expired reset token', 400);

    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return success({ message: 'Password updated successfully' });
  } catch {
    return error('Invalid request', 400);
  }
}
