-- CanteenHub Database Schema
-- PostgreSQL Database Setup

-- Create database (run this separately)
-- CREATE DATABASE canteenhub;

-- Connect to the database
-- \c canteenhub;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20),
    loyalty_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User dietary preferences table
CREATE TABLE user_dietary_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vegetarian BOOLEAN DEFAULT FALSE,
    vegan BOOLEAN DEFAULT FALSE,
    gluten_free BOOLEAN DEFAULT FALSE,
    dairy_free BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User allergies table
CREATE TABLE user_allergies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    allergy_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Menu categories table
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Menu items table
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id UUID REFERENCES menu_categories(id),
    image_url VARCHAR(500),
    emoji VARCHAR(10),
    calories INTEGER,
    protein DECIMAL(5,1),
    carbs DECIMAL(5,1),
    fat DECIMAL(5,1),
    customizable BOOLEAN DEFAULT TRUE,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Menu item options table
CREATE TABLE menu_item_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    option_type VARCHAR(50) NOT NULL, -- 'size', 'toppings', 'extras', etc.
    option_name VARCHAR(100) NOT NULL,
    price_modifier DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'
    estimated_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    customizations JSONB, -- Store selected options as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Loyalty transactions table
CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    points_earned INTEGER DEFAULT 0,
    points_redeemed INTEGER DEFAULT 0,
    transaction_type VARCHAR(20) NOT NULL, -- 'earned', 'redeemed', 'expired'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cart items table (for persistent cart)
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    customizations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, menu_item_id)
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(available);

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO menu_categories (name, description) VALUES
('Main Course', 'Hearty main dishes and entrees'),
('Snacks', 'Light bites and appetizers'),
('Beverages', 'Drinks and refreshments'),
('Desserts', 'Sweet treats and desserts');

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category_id, emoji, calories, protein, carbs, fat, customizable) VALUES
('Chicken Burger', 'Juicy grilled chicken breast with fresh lettuce, tomato, and our special sauce', 8.99, 
 (SELECT id FROM menu_categories WHERE name = 'Main Course'), '🍔', 450, 35.0, 25.0, 20.0, TRUE),
('Vegetarian Pizza', 'Fresh vegetables on a crispy crust with mozzarella cheese', 12.99,
 (SELECT id FROM menu_categories WHERE name = 'Main Course'), '🍕', 320, 15.0, 40.0, 12.0, TRUE),
('Caesar Salad', 'Fresh romaine lettuce with parmesan cheese and croutons', 7.99,
 (SELECT id FROM menu_categories WHERE name = 'Main Course'), '🥗', 180, 12.0, 15.0, 8.0, TRUE),
('French Fries', 'Crispy golden fries with sea salt', 4.99,
 (SELECT id FROM menu_categories WHERE name = 'Snacks'), '🍟', 320, 4.0, 40.0, 16.0, TRUE),
('Chicken Wings', 'Spicy buffalo wings with ranch dip', 9.99,
 (SELECT id FROM menu_categories WHERE name = 'Snacks'), '🍗', 280, 25.0, 2.0, 18.0, TRUE),
('Fresh Orange Juice', 'Freshly squeezed orange juice', 3.99,
 (SELECT id FROM menu_categories WHERE name = 'Beverages'), '🍊', 120, 2.0, 28.0, 0.0, FALSE),
('Coffee', 'Freshly brewed coffee', 2.99,
 (SELECT id FROM menu_categories WHERE name = 'Beverages'), '☕', 5, 0.0, 1.0, 0.0, TRUE),
('Chocolate Cake', 'Rich chocolate cake with chocolate frosting', 5.99,
 (SELECT id FROM menu_categories WHERE name = 'Desserts'), '🍰', 420, 6.0, 65.0, 16.0, TRUE),
('Ice Cream', 'Creamy vanilla ice cream', 4.99,
 (SELECT id FROM menu_categories WHERE name = 'Desserts'), '🍦', 250, 4.0, 30.0, 12.0, TRUE),
('Fish and Chips', 'Beer-battered fish with crispy fries', 11.99,
 (SELECT id FROM menu_categories WHERE name = 'Main Course'), '🐟', 580, 28.0, 45.0, 32.0, TRUE);

-- Insert sample menu item options
INSERT INTO menu_item_options (menu_item_id, option_type, option_name, price_modifier) VALUES
-- Chicken Burger options
((SELECT id FROM menu_items WHERE name = 'Chicken Burger'), 'size', 'Regular', 0.00),
((SELECT id FROM menu_items WHERE name = 'Chicken Burger'), 'size', 'Large', 2.00),
((SELECT id FROM menu_items WHERE name = 'Chicken Burger'), 'extras', 'Cheese', 1.00),
((SELECT id FROM menu_items WHERE name = 'Chicken Burger'), 'extras', 'Bacon', 1.50),
((SELECT id FROM menu_items WHERE name = 'Chicken Burger'), 'extras', 'Avocado', 1.50),
-- Pizza options
((SELECT id FROM menu_items WHERE name = 'Vegetarian Pizza'), 'size', 'Small', 0.00),
((SELECT id FROM menu_items WHERE name = 'Vegetarian Pizza'), 'size', 'Medium', 3.00),
((SELECT id FROM menu_items WHERE name = 'Vegetarian Pizza'), 'size', 'Large', 5.00),
((SELECT id FROM menu_items WHERE name = 'Vegetarian Pizza'), 'toppings', 'Mushrooms', 1.00),
((SELECT id FROM menu_items WHERE name = 'Vegetarian Pizza'), 'toppings', 'Bell Peppers', 1.00),
((SELECT id FROM menu_items WHERE name = 'Vegetarian Pizza'), 'toppings', 'Olives', 1.00),
-- Coffee options
((SELECT id FROM menu_items WHERE name = 'Coffee'), 'size', 'Small', 0.00),
((SELECT id FROM menu_items WHERE name = 'Coffee'), 'size', 'Medium', 0.50),
((SELECT id FROM menu_items WHERE name = 'Coffee'), 'size', 'Large', 1.00),
((SELECT id FROM menu_items WHERE name = 'Coffee'), 'type', 'Regular', 0.00),
((SELECT id FROM menu_items WHERE name = 'Coffee'), 'type', 'Decaf', 0.00),
((SELECT id FROM menu_items WHERE name = 'Coffee'), 'type', 'Espresso', 1.00);

-- Create a view for menu items with categories
CREATE VIEW menu_items_with_categories AS
SELECT 
    mi.id,
    mi.name,
    mi.description,
    mi.price,
    mi.emoji,
    mi.calories,
    mi.protein,
    mi.carbs,
    mi.fat,
    mi.customizable,
    mi.available,
    mc.name as category_name,
    mc.id as category_id
FROM menu_items mi
JOIN menu_categories mc ON mi.category_id = mc.id;

-- Create a view for order details
CREATE VIEW order_details AS
SELECT 
    o.id as order_id,
    o.user_id,
    o.total_amount,
    o.status,
    o.estimated_time,
    o.created_at,
    u.full_name as customer_name,
    u.email as customer_email,
    COUNT(oi.id) as item_count
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.user_id, o.total_amount, o.status, o.estimated_time, o.created_at, u.full_name, u.email;
