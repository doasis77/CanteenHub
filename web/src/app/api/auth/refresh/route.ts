import { success, error } from '@/lib/api-response';
import { rotateRefreshToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { refreshToken } = await req.json();
    if (!refreshToken) return error('Refresh token required', 400);

    const result = await rotateRefreshToken(refreshToken);
    if (!result) return error('Invalid or expired refresh token', 401);

    const { accessToken, refreshToken: newRefresh, user } = result;
    return success({
      accessToken,
      refreshToken: newRefresh,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        loyaltyPoints: user.loyaltyPoints,
        loyaltyTier: user.loyaltyTier,
      },
    });
  } catch (e) {
    console.error('Refresh error:', e);
    return error('Token refresh failed', 500);
  }
}
