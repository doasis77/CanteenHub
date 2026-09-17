import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { success, error } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return error('Unauthorized', 401);
  return success({ user });
}
