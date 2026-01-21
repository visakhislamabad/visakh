# Restaurant Management System (RMS)

A comprehensive web-based application built with Angular 20 and Firebase to manage restaurant operations including inventory, menu management, point-of-sale (POS), and staff roles.

## 🚀 Features

### User Roles
- **Admin**: Full access to all screens, financial data, and settings
- **Cashier**: Access to POS (Sales), Order Status, and End-of-Day closing
- **Kitchen Staff**: Access to Kitchen Display System only

### Core Modules
1. **Login Screen** - Secure authentication for different user roles
2. **Admin Dashboard** - Overview of sales, orders, expenses, and low stock alerts
3. **Menu Management** - Create and manage restaurant menu items
4. **Inventory & Purchasing** - Track raw materials and record purchases
5. **Point of Sale (POS)** - Take orders and process payments
6. **Kitchen Display System** - Real-time order tracking for kitchen staff
7. **User Management** - Admin can create and manage staff accounts
8. **Reports & Accounts** - Financial reports, profit/loss, and item performance

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- A Firebase account

## 🔧 Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Firebase Setup

#### Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" and follow the setup wizard
3. Once created, click on the Web icon (</>) to add a web app
4. Register your app with a nickname (e.g., "Restaurant-HMS")
5. Copy the Firebase configuration object

#### Enable Firebase Services

**Enable Authentication:**
1. In Firebase Console, go to "Authentication"
2. Click "Get Started"
3. Select "Email/Password" as sign-in method
4. Enable it and save

**Create Firestore Database:**
1. In Firebase Console, go to "Firestore Database"
2. Click "Create Database"
3. Choose "Start in test mode" (for development)
4. Select a location close to you
5. Click "Enable"

**Update Security Rules (Important!):**
Go to Firestore Database > Rules and update with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    
    // All other collections
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Configure Environment

Update the Firebase configuration in both environment files:
- `src/environments/environment.ts` (for development)
- `src/environments/environment.prod.ts` (for production)

Replace the placeholder values with your actual Firebase config:

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  }
};
```

### 4. Create First Admin User

Since this is a new project, you need to create your first admin user manually:

1. Go to Firebase Console > Authentication > Users
2. Click "Add User"
3. Enter:
   - Email: `admin@restaurant.com`
   - Password: Choose a secure password (min 6 characters)
4. Click "Add User"
5. Copy the User UID
6. Go to Firestore Database
7. Create a new collection called `users`
8. Add a document with the User UID as the document ID
9. Add these fields:
   ```
   email: "admin@restaurant.com"
   name: "Admin User"
   role: "admin"
   username: "admin"
   isActive: true
   ```

## 🏃 Running the Application

### Development Server
```bash
npm start
```
Navigate to `http://localhost:4200/`

### Build for Production
```bash
npm run build
```
The build artifacts will be stored in the `dist/` directory.

## 📖 How to Use

### Initial Setup Workflow

1. **Login as Admin**
   - Use the admin credentials you created
   - You'll be redirected to the Dashboard

2. **Set Up Inventory Items**
   - Go to "Inventory" tab
   - Click "Add Item"
   - Add raw materials (e.g., Rice, Chicken, Oil, Vegetables)
   - Set quantities and low stock thresholds

3. **Create Menu Items**
   - Go to "Menu" tab
   - Click "Add New Menu Item"
   - Create items you want to sell (e.g., Chicken Kebab, Rice Plate)
   - Set prices and tax rates

4. **Add Staff Users**
   - Go to "Users" tab
   - Click "Add User"
   - Create cashier and chef accounts

5. **Record Purchases**
   - Go to "Inventory" > "Purchase History"
   - Click "Record Purchase"
   - Add supplier details and purchased items
   - This automatically updates inventory stock

### Daily Operations

**For Cashiers:**
1. Login with cashier credentials
2. Use the POS screen to take orders
3. Add items to cart
4. Enter table number or select takeaway
5. Apply discounts if needed
6. Click "Print KOT" to send order to kitchen
7. Click "Pay & Print Bill" to complete the sale

**For Kitchen Staff:**
1. Login with chef credentials
2. View active orders on Kitchen Display
3. Click "Start Cooking" when beginning an order
4. Click "Mark Ready" when food is prepared

**For Admins:**
1. Monitor dashboard for business overview
2. Check low stock alerts
3. View sales vs expenses chart
4. Access reports for financial analysis

### Generating Reports

1. Go to "Reports" tab
2. Select date range
3. View:
   - Sales Report: All completed orders
   - Expense Report: All purchases
   - Profit/Loss: Revenue minus expenses
   - Item Performance: Best selling items

## 🎨 Understanding the Code

### Project Structure
```
src/
├── app/
│   ├── components/          # All UI components
│   │   ├── login/          # Login screen
│   │   ├── dashboard/      # Admin dashboard
│   │   ├── menu-management/
│   │   ├── inventory/
│   │   ├── pos/           # Point of Sale
│   │   ├── kitchen/       # Kitchen Display
│   │   ├── user-management/
│   │   └── reports/
│   ├── models/            # TypeScript interfaces
│   ├── services/          # Firebase services
│   │   ├── auth.service.ts      # Authentication
│   │   └── database.service.ts  # Firestore operations
│   ├── guards/            # Route guards for security
│   ├── app.routes.ts      # Route configuration
│   └── app.config.ts      # App configuration
├── environments/          # Environment configs
└── styles.css            # Global styles
```

### Key Concepts

**Services:**
- `AuthService`: Handles login/logout and user authentication
- `DatabaseService`: All database operations (CRUD for menu, inventory, orders, etc.)

**Guards:**
- `authGuard`: Ensures user is logged in
- `adminGuard`: Ensures user has admin role

**Models:**
- All TypeScript interfaces are in `models/models.ts`
- Defines structure for User, MenuItem, Order, Inventory, etc.

## 🔐 Security Notes

- Always use strong passwords for production
- Update Firestore security rules before deploying
- Never commit Firebase config with real credentials to public repositories
- Consider using environment variables for sensitive data

## 🐛 Troubleshooting

**Issue: Can't login**
- Verify Firebase Authentication is enabled
- Check if user exists in Firebase Console
- Ensure Firestore has user document with correct role

**Issue: "Permission denied" errors**
- Check Firestore security rules
- Ensure user is authenticated
- Verify user has correct role in Firestore

**Issue: Data not loading**
- Check browser console for errors
- Verify Firebase configuration is correct
- Ensure Firestore collections exist

## 📝 License

This project is for educational purposes.

## 🤝 Support

For issues or questions, please check:
1. Firebase Console for authentication/database issues
2. Browser console for JavaScript errors
3. Network tab for API call failures

---

**Happy Restaurant Managing! 🍽️**
