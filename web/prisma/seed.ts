import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Campus Canteen database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const emailMigrations: Array<[string, string]> = [
    ['student@canteen.edu', 'student@university.edu'],
    ['staff@canteen.edu', 'staff@university.edu'],
    ['admin@canteen.edu', 'admin@university.edu'],
  ];
  for (const [oldEmail, newEmail] of emailMigrations) {
    await prisma.user.updateMany({ where: { email: oldEmail }, data: { email: newEmail } });
  }

  const student = await prisma.user.upsert({
    where: { email: 'student@university.edu' },
    update: { passwordHash, emailVerified: true, isActive: true },
    create: {
      email: 'student@university.edu',
      passwordHash,
      fullName: 'Alex Johnson',
      studentId: 'STU2024001',
      phone: '+1-555-0101',
      role: 'STUDENT',
      emailVerified: true,
      loyaltyPoints: 250,
      loyaltyTier: 'BRONZE',
      dietaryPreferences: { create: { vegetarian: false, vegan: false } },
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@university.edu' },
    update: { passwordHash, emailVerified: true, isActive: true },
    create: {
      email: 'staff@university.edu',
      passwordHash,
      fullName: 'Maria Chen',
      studentId: 'STF2024001',
      role: 'STAFF',
      emailVerified: true,
      dietaryPreferences: { create: {} },
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@university.edu' },
    update: { passwordHash, emailVerified: true, isActive: true },
    create: {
      email: 'admin@university.edu',
      passwordHash,
      fullName: 'Dr. Sam Williams',
      studentId: 'ADM2024001',
      role: 'ADMIN',
      emailVerified: true,
      dietaryPreferences: { create: {} },
    },
  });

  await prisma.loyaltyConfig.deleteMany();
  await prisma.loyaltyConfig.create({
    data: {
      pointsPerDollar: 1,
      redeemPointsPerUnit: 100,
      redeemValueCents: 500,
      bronzeMultiplier: 1.0,
      silverMultiplier: 1.25,
      goldMultiplier: 1.5,
      silverThreshold: 500,
      goldThreshold: 1500,
      cancelWindowMinutes: 5,
      maxOrderItems: 20,
      taxRate: 0.08,
    },
  });

  const categories = [
    { name: 'Breakfast', description: 'Start your day right', sortOrder: 1 },
    { name: 'Lunch', description: 'Hearty midday meals', sortOrder: 2 },
    { name: 'Snacks', description: 'Quick bites', sortOrder: 3 },
    { name: 'Beverages', description: 'Drinks & refreshments', sortOrder: 4 },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categories) {
    const existing = await prisma.menuCategory.findFirst({ where: { name: cat.name } });
    const c = existing || (await prisma.menuCategory.create({ data: cat }));
    categoryMap[cat.name] = c.id;
  }

  const menuItems = [
    {
      name: 'Avocado Toast',
      description: 'Sourdough with smashed avocado, cherry tomatoes, and microgreens',
      price: 6.99,
      category: 'Breakfast',
      emoji: '🥑',
      prepTimeMinutes: 10,
      isSpecial: true,
      dietaryTags: ['veg', 'vegan'],
      allergens: [],
      calories: 320,
    },
    {
      name: 'Breakfast Burrito',
      description: 'Scrambled eggs, cheese, peppers, and salsa in a warm tortilla',
      price: 7.49,
      category: 'Breakfast',
      emoji: '🌯',
      prepTimeMinutes: 12,
      dietaryTags: ['spicy'],
      allergens: ['dairy', 'gluten'],
      calories: 480,
    },
    {
      name: 'Chicken Burger',
      description: 'Grilled chicken breast with lettuce, tomato, and special sauce',
      price: 8.99,
      category: 'Lunch',
      emoji: '🍔',
      prepTimeMinutes: 15,
      isSpecial: true,
      dietaryTags: [],
      allergens: ['gluten'],
      calories: 450,
    },
    {
      name: 'Vegetarian Pizza',
      description: 'Fresh vegetables on crispy crust with mozzarella',
      price: 12.99,
      category: 'Lunch',
      emoji: '🍕',
      prepTimeMinutes: 20,
      dietaryTags: ['veg'],
      allergens: ['dairy', 'gluten'],
      calories: 320,
    },
    {
      name: 'Caesar Salad',
      description: 'Romaine lettuce with parmesan and croutons',
      price: 7.99,
      category: 'Lunch',
      emoji: '🥗',
      prepTimeMinutes: 8,
      dietaryTags: ['veg'],
      allergens: ['dairy', 'gluten'],
      calories: 180,
    },
    {
      name: 'Fish and Chips',
      description: 'Beer-battered fish with crispy fries',
      price: 11.99,
      category: 'Lunch',
      emoji: '🐟',
      prepTimeMinutes: 18,
      dietaryTags: [],
      allergens: ['gluten', 'fish'],
      calories: 580,
    },
    {
      name: 'French Fries',
      description: 'Crispy golden fries with sea salt',
      price: 4.99,
      category: 'Snacks',
      emoji: '🍟',
      prepTimeMinutes: 8,
      dietaryTags: ['veg', 'vegan'],
      allergens: [],
      calories: 320,
    },
    {
      name: 'Chicken Wings',
      description: 'Spicy buffalo wings with ranch dip',
      price: 9.99,
      category: 'Snacks',
      emoji: '🍗',
      prepTimeMinutes: 15,
      dietaryTags: ['spicy'],
      allergens: ['dairy'],
      calories: 280,
    },
    {
      name: 'Fresh Orange Juice',
      description: 'Freshly squeezed orange juice',
      price: 3.99,
      category: 'Beverages',
      emoji: '🍊',
      prepTimeMinutes: 3,
      dietaryTags: ['veg', 'vegan'],
      allergens: [],
      calories: 120,
    },
    {
      name: 'Iced Latte',
      description: 'Espresso with cold milk over ice',
      price: 4.49,
      category: 'Beverages',
      emoji: '☕',
      prepTimeMinutes: 5,
      isSpecial: true,
      dietaryTags: ['veg'],
      allergens: ['dairy'],
      calories: 150,
    },
    {
      name: 'Chocolate Cake',
      description: 'Rich chocolate cake with frosting',
      price: 5.99,
      category: 'Snacks',
      emoji: '🍰',
      prepTimeMinutes: 2,
      dietaryTags: ['veg'],
      allergens: ['dairy', 'gluten', 'eggs'],
      calories: 420,
    },
    {
      name: 'Vegan Buddha Bowl',
      description: 'Quinoa, roasted veggies, chickpeas, and tahini dressing',
      price: 10.99,
      category: 'Lunch',
      emoji: '🥙',
      prepTimeMinutes: 12,
      dietaryTags: ['veg', 'vegan', 'gluten-free'],
      allergens: ['sesame'],
      calories: 380,
    },
  ];

  for (const item of menuItems) {
    const { category, ...data } = item;
    const existing = await prisma.menuItem.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.menuItem.create({
        data: {
          ...data,
          categoryId: categoryMap[category],
        },
      });
    }
  }

  console.log(`✅ Seeded user: ${student.email}`);
  await prisma.systemSettings.deleteMany();
  await prisma.systemSettings.create({ data: { universityEmailDomain: '@university.edu' } });

  console.log('✅ Demo logins: student@university.edu, staff@university.edu, admin@university.edu');
  console.log('✅ Password for all: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
