import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return error('Verification token required', 400);

  const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
  if (!user) return error('Invalid verification token', 400);

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerifyToken: null },
  });

  return success({ message: 'Email verified successfully', email: user.email });
}
