# 🚀 AgStore Backend API

Express.js backend server for the AgStore e-commerce and delivery platform. Provides RESTful APIs, real-time communication, and comprehensive admin management.

## 🛠️ Tech Stack

- **Framework**: Express.js with ES6 modules
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with refresh token rotation
- **Real-time**: Socket.IO for live updates
- **Payments**: Razorpay integration
- **Maps**: Google Maps API for geocoding and directions
- **Admin Panel**: AdminJS for backend management
- **Security**: Rate limiting, CORS, input validation
- **Session Management**: MongoDB session store

## ✨ Features

### Core APIs
- **Authentication**: Login, registration, token refresh
- **User Management**: Customer and delivery partner profiles
- **Product Management**: CRUD operations for products and categories
- **Order Management**: Order creation, tracking, and status updates
- **Payment Processing**: Razorpay integration with webhook verification
- **Address Management**: Google Maps geocoding integration
- **Branch Management**: Multi-location store management

### Real-time Features
- **Order Tracking**: Live order status updates
- **Delivery Tracking**: Real-time delivery partner location
- **Notifications**: Socket.IO based push notifications
- **Admin Dashboard**: Live metrics and updates

### Admin Features
- **AdminJS Dashboard**: Web-based admin interface
- **User Management**: Customer and delivery partner administration
- **Order Monitoring**: Real-time order tracking and management
- **Analytics**: Sales reports and performance metrics
- **Content Management**: Product and category management

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Google Maps API key
- Razorpay account and API keys

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
# Database
MONGO_URI=mongodb://localhost:27017/agstore

# JWT Secrets (use strong, random strings)
ACCESS_TOKEN_SECRET=your-super-secret-access-token-key
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret
COOKIE_SECRET=your-cookie-secret-key
COOKIE_PASSWORD=your-cookie-password

# Payment Gateway
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Google Maps API
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081,https://yourdomain.com

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 3. Start Development Server
```bash
npm start
```

The server will start on `http://localhost:3000` with:
- API endpoints available at `/`
- AdminJS dashboard at `/admin`
- Socket.IO server for real-time communication

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── config.js     # Environment variables
│   │   ├── connect.js    # Database connection
│   │   └── setup.js      # AdminJS setup
│   ├── controllers/      # Route controllers
│   │   ├── auth/         # Authentication controllers
│   │   ├── order/        # Order management
│   │   └── payment.js    # Payment processing
│   ├── middleware/       # Custom middleware
│   │   └── auth.js       # JWT authentication
│   ├── models/           # Mongoose models
│   │   ├── user.js       # User models
│   │   ├── product.js    # Product model
│   │   └── order.js      # Order model
│   ├── routes/           # API routes
│   │   └── index.js      # Route registration
│   ├── services/         # Business logic services
│   │   └── googleMapsService.js
│   └── utils/            # Utility functions
├── app.js               # Main application file
├── package.json         # Dependencies and scripts
├── render.yaml          # Render deployment config
└── .gitignore          # Git ignore rules
```

## 🔌 API Endpoints

### Authentication
```
POST   /auth/login              # User login
POST   /auth/register           # User registration
POST   /auth/refresh-token      # Refresh access token
POST   /auth/logout             # User logout
GET    /auth/verify             # Verify token
GET    /auth/user               # Get current user
```

### Products
```
GET    /products               # Get all products
GET    /products/:id           # Get product by ID
GET    /products/category/:cat # Get products by category
POST   /products               # Create product (admin)
PUT    /products/:id           # Update product (admin)
DELETE /products/:id           # Delete product (admin)
```

### Orders
```
POST   /orders                 # Create new order
GET    /orders/user/:userId    # Get user orders
GET    /orders/:id             # Get order by ID
PUT    /orders/:id/status      # Update order status
GET    /orders/:id/track       # Track order
GET    /orders/active          # Get active orders
```

### Payments
```
POST   /payment/create-order   # Create Razorpay order
POST   /payment/verify         # Verify payment
POST   /payment/webhook        # Razorpay webhook
```

### Addresses
```
GET    /addresses              # Get user addresses
POST   /addresses              # Add new address
PUT    /addresses/:id          # Update address
DELETE /addresses/:id          # Delete address
POST   /addresses/geocode      # Geocode address
```

### Branches
```
GET    /branches               # Get all branches
GET    /branches/:id           # Get branch by ID
POST   /branches               # Create branch (admin)
PUT    /branches/:id           # Update branch (admin)
```

## 🔐 Authentication & Security

### JWT Implementation
- **Access Tokens**: Short-lived (15 minutes) for API access
- **Refresh Tokens**: Long-lived (7 days) for token renewal
- **Automatic Refresh**: Client-side automatic token refresh
- **Secure Storage**: HttpOnly cookies for refresh tokens

### Security Features
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS**: Configurable cross-origin resource sharing
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: MongoDB with Mongoose ODM
- **XSS Protection**: Input sanitization and secure headers
- **Environment Variables**: All secrets stored securely

### Middleware
- **Authentication**: JWT token verification
- **Authorization**: Role-based access control
- **Logging**: Request/response logging
- **Error Handling**: Centralized error management

## 🌐 Real-time Communication

### Socket.IO Events

#### Order Events
```javascript
// Join order room for updates
socket.emit('joinRoom', orderId);

// Order status updates
socket.on('orderStatusUpdated', (data) => {
  // Handle order status change
});

// Location updates
socket.on('orderLocationUpdated', (data) => {
  // Handle delivery partner location
});
```

#### Branch Events
```javascript
// Join branch room (delivery partners)
socket.emit('joinBranchRoom', branchId);

// New order notifications
socket.on('newOrderAssigned', (data) => {
  // Handle new order assignment
});
```

## 💳 Payment Integration

### Razorpay Setup
1. Create Razorpay account
2. Get API keys from dashboard
3. Configure webhook URL for payment verification
4. Set environment variables

### Payment Flow
1. **Create Order**: Generate Razorpay order ID
2. **Process Payment**: Handle payment on client
3. **Verify Payment**: Webhook verification on server
4. **Update Order**: Mark order as paid and process

## 🗺️ Google Maps Integration

### Features
- **Geocoding**: Convert addresses to coordinates
- **Reverse Geocoding**: Convert coordinates to addresses
- **Directions**: Get route information between points
- **Distance Calculation**: Calculate delivery distances

### Rate Limiting
- Built-in rate limiting for Google Maps API calls
- Configurable request limits
- Error handling for quota exceeded

## 🔧 Database Models

### User Models
- **Customer**: Customer information and preferences
- **DeliveryPartner**: Delivery partner profiles
- **Admin**: Administrative users

### Product Models
- **Product**: Product information and pricing
- **Category**: Product categories and hierarchy

### Order Models
- **Order**: Order information and status
- **Address**: Delivery addresses with geocoding

## 📊 Admin Dashboard

Access the AdminJS dashboard at `/admin` with admin credentials.

### Features
- **User Management**: View and manage all users
- **Order Monitoring**: Real-time order tracking
- **Product Management**: CRUD operations for products
- **Analytics**: Sales and performance metrics
- **System Monitoring**: Server health and statistics

### Default Admin Setup
Create an admin user in MongoDB:
```javascript
{
  email: "admin@agstore.com",
  password: "your-secure-password",
  role: "Admin",
  isActivated: true
}
```

## 🚀 Deployment

### Render Deployment
The project includes a `render.yaml` file for easy deployment:

1. **Push to GitHub**: Commit your code to a GitHub repository
2. **Connect to Render**: Link your GitHub repo to Render
3. **Environment Variables**: Set all required environment variables in Render dashboard
4. **Deploy**: Render will automatically deploy using the configuration

### Environment Variables for Production
```env
NODE_ENV=production
MONGO_URI=your-mongodb-atlas-connection-string
ACCESS_TOKEN_SECRET=your-production-access-secret
REFRESH_TOKEN_SECRET=your-production-refresh-secret
RAZORPAY_KEY_ID=your-production-razorpay-key
RAZORPAY_KEY_SECRET=your-production-razorpay-secret
GOOGLE_MAPS_API_KEY=your-production-google-maps-key
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Manual Deployment
```bash
# Build for production
npm install --production

# Start production server
NODE_ENV=production node app.js
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### API Testing
Use tools like Postman or Insomnia to test API endpoints:
1. Import the API collection
2. Set environment variables
3. Test authentication flow
4. Test CRUD operations

## 📈 Performance Optimization

### Database Optimization
- **Indexing**: Optimized MongoDB indexes for queries
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Optimized Mongoose queries

### Caching
- **Session Caching**: MongoDB session store
- **API Response Caching**: Configurable response caching
- **Static Asset Caching**: Efficient static file serving

### Monitoring
- **Request Logging**: Comprehensive request/response logging
- **Error Tracking**: Centralized error handling and logging
- **Performance Metrics**: Response time and throughput monitoring

## 🐛 Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check MongoDB connection
mongosh "your-connection-string"
```

#### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

#### Environment Variables
```bash
# Check if .env file is loaded
console.log(process.env.MONGO_URI);
```

### Debug Mode
```bash
# Start with debug logging
DEBUG=* npm start
```

## 📚 Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [AdminJS Documentation](https://adminjs.co/)
- [Razorpay Documentation](https://razorpay.com/docs/)

## 🤝 Contributing

1. Follow existing code structure and patterns
2. Add proper error handling and validation
3. Include tests for new features
4. Update API documentation
5. Follow security best practices

## 📄 License

This project is part of the AgStore platform and follows the same MIT License.

---

**AgStore Backend API - Powering E-commerce Excellence** 🚀