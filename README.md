# CanteenHub - Responsive Canteen Ordering Platform

A comprehensive web application for campus canteen ordering with real-time tracking, loyalty points, and user management. Built with HTML, CSS, JavaScript frontend and Node.js/PostgreSQL backend.

## Features

### ✅ User Management
- **Secure Registration/Login** with JWT authentication
- **User Profiles** with personal information management
- **Dietary Preferences** (Vegetarian, Vegan, Gluten-Free, Dairy-Free)
- **Allergy Management** with dynamic tag system

### ✅ Menu System
- **Comprehensive Menu** with categories and nutritional information
- **Menu Filtering** by category (Main Course, Snacks, Beverages, Desserts)
- **Search Functionality** across menu items
- **Customizable Options** for menu items

### ✅ Ordering System
- **Shopping Cart** with persistent storage
- **Real-time Cart Updates** with quantity controls
- **Order Management** with status tracking
- **Order History** with filtering options

### ✅ Real-time Tracking
- **Order Status Tracking** (Pending → Confirmed → Preparing → Ready → Completed)
- **Visual Progress Indicators** with animations
- **Estimated Delivery Times**
- **Order Cancellation** (for pending/confirmed orders)

### ✅ Loyalty Program
- **Points System** (1 point per dollar spent)
- **Loyalty Tiers** (Bronze, Silver, Gold, Platinum)
- **Transaction History** with detailed records
- **Points Redemption** system

### ✅ Responsive Design
- **Mobile-First** approach with responsive breakpoints
- **Touch-Friendly** interface for mobile devices
- **Modern UI/UX** with smooth animations
- **Accessibility Features** with semantic HTML

## Technology Stack

### Frontend
- **HTML5** with semantic structure
- **CSS3** with Flexbox and Grid layouts
- **Vanilla JavaScript** (ES6+) for functionality
- **Font Awesome** for icons

### Backend
- **Node.js** with Express.js framework
- **PostgreSQL** database with comprehensive schema
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Joi** for input validation

## Database Schema

The application uses PostgreSQL with the following main tables:

- **users** - User accounts and profiles
- **user_dietary_preferences** - Dietary restrictions
- **user_allergies** - User allergy information
- **menu_categories** - Menu category definitions
- **menu_items** - Menu items with nutritional info
- **menu_item_options** - Customization options
- **orders** - Order records
- **order_items** - Individual order items
- **cart_items** - Persistent shopping cart
- **loyalty_transactions** - Points earning/redeeming history

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb canteenhub

# Run the migration script
npm run migrate
```

### 2. Backend Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit .env file with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=canteenhub
# DB_USER=your_username
# DB_PASSWORD=your_password
# JWT_SECRET=your_super_secret_jwt_key_here

# Start the development server
npm run dev
```

The backend API will be available at `http://localhost:3000`

### 3. Frontend Setup

```bash
# Open index.html in a web browser
# Or serve it using a local server:

# Using Python
python -m http.server 8000

# Using Node.js http-server
npx http-server

# Using Live Server (VS Code extension)
# Right-click on index.html and select "Open with Live Server"
```

The frontend will be available at `http://localhost:8000` (or your chosen port)

### 4. API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Token verification

#### Menu
- `GET /api/menu/items` - Get all menu items
- `GET /api/menu/items/:id` - Get menu item by ID
- `GET /api/menu/categories` - Get menu categories
- `GET /api/menu/search` - Search menu items

#### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:id` - Update cart item
- `DELETE /api/cart/items/:id` - Remove cart item
- `DELETE /api/cart` - Clear cart

#### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id/cancel` - Cancel order

#### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/password` - Update password
- `PUT /api/users/dietary-preferences` - Update dietary preferences
- `POST /api/users/allergies` - Add allergy
- `DELETE /api/users/allergies/:id` - Remove allergy

#### Loyalty
- `GET /api/loyalty/balance` - Get loyalty balance
- `GET /api/loyalty/transactions` - Get transaction history
- `POST /api/loyalty/redeem` - Redeem points
- `GET /api/loyalty/rewards` - Get loyalty tiers
- `GET /api/loyalty/stats` - Get loyalty statistics

## Usage

### For Students/Staff
1. **Register/Login** to create an account
2. **Browse Menu** by category or search for items
3. **Add Items** to cart with quantity controls
4. **Customize Orders** based on dietary preferences
5. **Place Orders** and track them in real-time
6. **Earn Loyalty Points** with each purchase
7. **Manage Profile** and dietary preferences

### For Administrators
- Monitor orders through the database
- Update menu items and availability
- Manage user accounts and loyalty points
- View order analytics and statistics

## Development

### Project Structure
```
canteenhub/
├── database/
│   ├── schema.sql          # Database schema
│   └── migrate.js          # Migration script
├── config/
│   └── database.js         # Database configuration
├── middleware/
│   └── auth.js             # Authentication middleware
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── menu.js             # Menu management routes
│   ├── cart.js             # Cart management routes
│   ├── orders.js           # Order management routes
│   ├── users.js            # User management routes
│   └── loyalty.js          # Loyalty system routes
├── index.html              # Main HTML file
├── styles.css              # CSS styles
├── script.js               # Frontend JavaScript
├── api.js                  # API client
├── server.js               # Express server
├── package.json            # Dependencies
└── README.md               # This file
```

### Adding New Features
1. **Database**: Update `database/schema.sql` with new tables/columns
2. **Backend**: Add new routes in `routes/` directory
3. **Frontend**: Update `script.js` and `api.js` for new functionality
4. **UI**: Modify `index.html` and `styles.css` for new components

### Testing
```bash
# Run backend tests
npm test

# Test API endpoints
curl http://localhost:3000/health
```

## Security Features

- **JWT Authentication** with token expiration
- **Password Hashing** using bcryptjs
- **Input Validation** with Joi schemas
- **Rate Limiting** to prevent abuse
- **CORS Protection** for cross-origin requests
- **SQL Injection Prevention** with parameterized queries

## Performance Optimizations

- **Database Indexing** on frequently queried columns
- **Connection Pooling** for database connections
- **Efficient Queries** with proper JOINs and filtering
- **Frontend Caching** of menu data and user preferences
- **Responsive Images** and optimized assets

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## Future Enhancements

- **Real-time Notifications** using WebSockets
- **Payment Integration** with Stripe/PayPal
- **Mobile App** using React Native
- **Admin Dashboard** for canteen management
- **Analytics Dashboard** for business insights
- **Multi-language Support** for international students
- **QR Code Ordering** for contactless service

