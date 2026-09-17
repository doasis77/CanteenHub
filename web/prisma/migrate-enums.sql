-- Convert legacy VARCHAR/TEXT columns to Prisma PostgreSQL enums

-- Ensure enum types exist
DO $$ BEGIN CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'STAFF', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARNED', 'REDEEMED', 'EXPIRED', 'BONUS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "NotificationType" AS ENUM ('ORDER_UPDATE', 'LOYALTY', 'PROMOTION', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Normalize legacy string values before casting
UPDATE orders SET status = 'PLACED' WHERE LOWER(status) = 'pending' OR status = 'PLACED' OR status IS NULL;
UPDATE orders SET status = 'CONFIRMED' WHERE LOWER(status) = 'confirmed';
UPDATE orders SET status = 'PREPARING' WHERE LOWER(status) = 'preparing';
UPDATE orders SET status = 'READY_FOR_PICKUP' WHERE LOWER(status) = 'ready' OR status = 'ready_for_pickup';
UPDATE orders SET status = 'COMPLETED' WHERE LOWER(status) = 'completed';
UPDATE orders SET status = 'CANCELLED' WHERE LOWER(status) = 'cancelled';
UPDATE orders SET status = 'PLACED' WHERE status NOT IN ('PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED');

UPDATE loyalty_transactions SET transaction_type = 'EARNED' WHERE UPPER(transaction_type) = 'EARNED' OR LOWER(transaction_type) = 'earned';
UPDATE loyalty_transactions SET transaction_type = 'REDEEMED' WHERE UPPER(transaction_type) = 'REDEEMED' OR LOWER(transaction_type) = 'redeemed';
UPDATE loyalty_transactions SET transaction_type = 'EXPIRED' WHERE UPPER(transaction_type) = 'EXPIRED' OR LOWER(transaction_type) = 'expired';
UPDATE loyalty_transactions SET transaction_type = 'BONUS' WHERE UPPER(transaction_type) = 'BONUS';

UPDATE users SET role = 'STUDENT' WHERE role IS NULL OR role NOT IN ('STUDENT', 'STAFF', 'ADMIN');

-- users.role
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
ALTER TABLE users
  ALTER COLUMN role TYPE "UserRole"
  USING role::"UserRole";
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'STUDENT'::"UserRole";

-- orders.status
ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE orders
  ALTER COLUMN status TYPE "OrderStatus"
  USING status::"OrderStatus";
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'PLACED'::"OrderStatus";

-- loyalty_transactions.transaction_type
ALTER TABLE loyalty_transactions
  ALTER COLUMN transaction_type TYPE "LoyaltyTransactionType"
  USING transaction_type::"LoyaltyTransactionType";

-- payment_records.status (if table exists)
DO $$ BEGIN
  ALTER TABLE payment_records ALTER COLUMN status DROP DEFAULT;
  ALTER TABLE payment_records
    ALTER COLUMN status TYPE "PaymentStatus"
    USING status::"PaymentStatus";
  ALTER TABLE payment_records ALTER COLUMN status SET DEFAULT 'PENDING'::"PaymentStatus";
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- notifications.type (if table exists)
DO $$ BEGIN
  ALTER TABLE notifications ALTER COLUMN type DROP DEFAULT;
  ALTER TABLE notifications
    ALTER COLUMN type TYPE "NotificationType"
    USING type::"NotificationType";
  ALTER TABLE notifications ALTER COLUMN type SET DEFAULT 'SYSTEM'::"NotificationType";
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
