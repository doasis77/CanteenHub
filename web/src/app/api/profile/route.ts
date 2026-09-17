import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, error } from '@/lib/api-response';
import { requireAuth } from '@/lib/rbac';
import { profileUpdateSchema } from '@/lib/validations';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: auth.user!.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      studentId: true,
      phone: true,
      photoUrl: true,
      role: true,
      loyaltyPoints: true,
      loyaltyTier: true,
      emailVerified: true,
      dietaryPreferences: true,
      allergies: true,
    },
  });

  return success({ user });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) return error('Validation error', 400, parsed.error.flatten());

    const { fullName, phone, photoUrl, vegetarian, vegan, glutenFree, dairyFree, allergies } =
      parsed.data;

    const user = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: auth.user!.id },
        data: {
          ...(fullName ? { fullName } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(photoUrl !== undefined ? { photoUrl: photoUrl || null } : {}),
        },
      });

      if (
        vegetarian !== undefined ||
        vegan !== undefined ||
        glutenFree !== undefined ||
        dairyFree !== undefined
      ) {
        await tx.userDietaryPreference.upsert({
          where: { userId: auth.user!.id },
          create: {
            userId: auth.user!.id,
            vegetarian: vegetarian ?? false,
            vegan: vegan ?? false,
            glutenFree: glutenFree ?? false,
            dairyFree: dairyFree ?? false,
          },
          update: {
            ...(vegetarian !== undefined ? { vegetarian } : {}),
            ...(vegan !== undefined ? { vegan } : {}),
            ...(glutenFree !== undefined ? { glutenFree } : {}),
            ...(dairyFree !== undefined ? { dairyFree } : {}),
          },
        });
      }

      if (allergies !== undefined) {
        await tx.userAllergy.deleteMany({ where: { userId: auth.user!.id } });
        if (allergies.length) {
          await tx.userAllergy.createMany({
            data: allergies.map((allergyName) => ({ userId: auth.user!.id, allergyName })),
          });
        }
      }

      return tx.user.findUnique({
        where: { id: auth.user!.id },
        include: { dietaryPreferences: true, allergies: true },
      });
    });

    return success({ user });
  } catch (e) {
    console.error('Profile update error:', e);
    return error('Failed to update profile', 500);
  }
}
