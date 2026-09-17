-- Role-spec feature columns (safe to re-run)

ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS stock_quantity INT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT FALSE;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_type TEXT DEFAULT 'ASAP';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_pickup TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'online';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS review TEXT;

ALTER TABLE loyalty_config ADD COLUMN IF NOT EXISTS points_expiration_days INT DEFAULT 365;
ALTER TABLE loyalty_config ADD COLUMN IF NOT EXISTS max_cart_value DECIMAL(10,2) DEFAULT 200.00;
ALTER TABLE loyalty_config ADD COLUMN IF NOT EXISTS double_points_enabled BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canteen_open_time TEXT DEFAULT '07:00',
  canteen_close_time TEXT DEFAULT '21:00',
  canteen_is_open BOOLEAN DEFAULT TRUE,
  university_email_domain TEXT DEFAULT '@university.edu',
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (id)
SELECT uuid_generate_v4()
WHERE NOT EXISTS (SELECT 1 FROM system_settings LIMIT 1);
