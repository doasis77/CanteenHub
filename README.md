# Campus Canteen Platform

Production-ready full-stack campus canteen ordering platform with menu browsing, cart, real-time order tracking, loyalty points, staff dashboard, admin panel, and **Expo Go** mobile app.

## Architecture

```
canteen/
├── web/                    # Next.js 14 (App Router) — web app + REST API
│   ├── prisma/             # Prisma schema, seed, Neon migration SQL
│   └── src/
│       ├── app/            # Pages + API routes
│       ├── components/     # UI components
│       ├── lib/            # Auth, Prisma, validators, API client
│       └── store/          # Zustand (auth + cart)
├── mobile/                 # Expo Go React Native app
├── server.js               # Legacy Express API (optional fallback)
└── database/               # Legacy SQL schema
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Web Frontend | Next.js 14, Tailwind CSS, Zustand, React Query |
| Mobile | Expo SDK 52, Expo Router, Expo Go |
| Backend | Next.js API Routes (Express legacy kept) |
| Database | PostgreSQL on **Neon** via Prisma ORM |
| Auth | JWT + refresh tokens, bcrypt, RBAC |
| Real-time | React Query polling (5–15s intervals) |
| Payments | Mock flow (+ Stripe test mode ready) |

### User Roles

- **Student** — browse, order, track, loyalty points
- **Staff** — manage orders & menu availability
- **Admin** — users, analytics, loyalty rules

## Quick Start

### 1. Neon Database

Copy your Neon connection string to `web/.env`:

```bash
cd web
cp .env.example .env
# Edit DATABASE_URL with your Neon connection string
```

### 2. Database Setup

```bash
cd web
npm install
npm run db:setup
```

This runs the extension migration SQL, syncs Prisma schema, and seeds demo data.

### 3. Web App

```bash
cd web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Expo Go Mobile App

```bash
cd mobile
npm install
# Set EXPO_PUBLIC_API_URL in .env to your machine IP, e.g. http://192.168.1.5:3000
npx expo start
```

Scan the QR code with **Expo Go** on your phone.

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Student | student@canteen.edu | password123 |
| Staff | staff@canteen.edu | password123 |
| Admin | admin@canteen.edu | password123 |

## API Endpoints

### Auth
- `POST /api/auth/register` — Register
- `POST /api/auth/login` — Login
- `POST /api/auth/refresh` — Refresh tokens
- `GET /api/auth/me` — Current user
- `GET /api/auth/verify-email?token=...` — Email verification (mock)

### Menu
- `GET /api/menu/categories`
- `GET /api/menu/items?search=&category=&dietary=&specials=true`
- `GET /api/menu/items/:id`
- `POST /api/menu/items` — Staff/Admin
- `PATCH /api/menu/items/:id` — Staff/Admin

### Cart
- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:id`
- `DELETE /api/cart/items/:id`
- `DELETE /api/cart`

### Orders
- `GET /api/orders`
- `POST /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders/:id/cancel`
- `PATCH /api/orders/:id/status` — Staff/Admin
- `POST /api/orders/:id/reorder`

### Loyalty
- `GET /api/loyalty`

### Admin
- `GET /api/admin/users`
- `PATCH /api/admin/users`
- `GET /api/admin/analytics`
- `GET|PUT /api/admin/loyalty-config`

### Other
- `GET /api/notifications`
- `PATCH /api/notifications`
- `GET /api/health`

## Web Pages

| Route | Description |
|-------|-------------|
| `/menu` | Browse & filter menu, today's specials |
| `/cart` | Cart management |
| `/checkout` | Points redemption + mock payment |
| `/orders` | Order history |
| `/orders/[id]` | Live order tracking |
| `/profile` | Points & tier dashboard |
| `/staff` | Staff order queue & menu toggles |
| `/admin` | Analytics, users, loyalty config |

## Environment Variables

See `web/.env.example` and `mobile/.env.example`.

## Deployment

- **Web**: Deploy `web/` to Vercel with `DATABASE_URL` and `JWT_SECRET` env vars
- **Mobile**: Point `EXPO_PUBLIC_API_URL` to your deployed API URL
- **Database**: Neon PostgreSQL (serverless-friendly)

## License

MIT
