-- Extend existing CanteenHub schema for Campus Canteen Platform
-- Safe to run multiple times on Neon PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'STAFF', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARNED', 'REDEEMED', 'EXPIRED', 'BONUS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('ORDER_UPDATE', 'LOYALTY', 'PROMOTION', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users extensions
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'STUDENT';
ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'BRONZE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token TEXT;

-- Menu extensions
ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS prep_time_minutes INT DEFAULT 15;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_special BOOLEAN DEFAULT FALSE;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS dietary_tags TEXT[] DEFAULT '{}';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}';

-- Orders extensions
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_redeemed INT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_deadline TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_name TEXT;

-- New tables
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  points_per_dollar INT DEFAULT 1,
  redeem_points_per_unit INT DEFAULT 100,
  redeem_value_cents INT DEFAULT 500,
  bronze_multiplier DECIMAL(3,2) DEFAULT 1.0,
  silver_multiplier DECIMAL(3,2) DEFAULT 1.25,
  gold_multiplier DECIMAL(3,2) DEFAULT 1.5,
  silver_threshold INT DEFAULT 500,
  gold_threshold INT DEFAULT 1500,
  cancel_window_minutes INT DEFAULT 5,
  max_order_items INT DEFAULT 20,
  tax_rate DECIMAL(5,4) DEFAULT 0.08,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'PENDING',
  stripe_payment_id TEXT,
  payment_method TEXT DEFAULT 'mock',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  type TEXT DEFAULT 'SYSTEM',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Migrate legacy order statuses to new enum values
UPDATE orders SET status = 'PLACED' WHERE status = 'pending';
UPDATE orders SET status = 'CONFIRMED' WHERE status = 'confirmed';
UPDATE orders SET status = 'PREPARING' WHERE status = 'preparing';
UPDATE orders SET status = 'READY_FOR_PICKUP' WHERE status = 'ready';
UPDATE orders SET status = 'COMPLETED' WHERE status = 'completed';
UPDATE orders SET status = 'CANCELLED' WHERE status = 'cancelled';

UPDATE loyalty_transactions SET transaction_type = 'EARNED' WHERE transaction_type = 'earned';
UPDATE loyalty_transactions SET transaction_type = 'REDEEMED' WHERE transaction_type = 'redeemed';
UPDATE loyalty_transactions SET transaction_type = 'EXPIRED' WHERE transaction_type = 'expired';
