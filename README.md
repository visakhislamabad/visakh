# 🍽️ Restaurant Management System (RMS)

A comprehensive web-based application built with **Angular 20** and **Firebase** to manage complete restaurant operations including inventory, menu management, point-of-sale (POS), kitchen display, and financial reporting.

## 🌟 Overview

This system is designed for restaurants to streamline their daily operations with role-based access for Admins, Cashiers, and Kitchen Staff. It provides a modern, intuitive interface with real-time data synchronization powered by Firebase.

## ✨ Key Features

- **👤 Role-Based Access Control** - Admin, Cashier, and Chef roles with appropriate permissions
- **📊 Admin Dashboard** - Real-time overview of sales, orders, expenses, and inventory alerts
- **🍔 Menu Management** - Create and manage restaurant menu items with categories and pricing
- **📦 Inventory & Purchasing** - Track raw materials, record purchases, and monitor stock levels
- **💰 Point of Sale (POS)** - Intuitive interface for taking orders and processing payments
- **👨‍🍳 Kitchen Display System** - Real-time order tracking for kitchen staff
- **👥 User Management** - Admin can create and manage staff accounts
- **📈 Reports & Analytics** - Sales reports, expense tracking, profit/loss analysis, and item performance

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- Firebase account

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Firebase**
   - Follow the detailed instructions in [CHECKLIST.md](CHECKLIST.md)
   - Or refer to [SETUP_GUIDE.md](SETUP_GUIDE.md) for complete setup

3. **Start Development Server**
   ```bash
   npm start
   ```
   Navigate to `http://localhost:4200/`

## 📖 Documentation

- **[CHECKLIST.md](CHECKLIST.md)** - Step-by-step setup checklist (START HERE!)
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Comprehensive setup and usage guide
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick reference for common tasks
- **[SAMPLE_DATA.md](SAMPLE_DATA.md)** - Example data for testing

## 🎯 User Roles & Access

| Role | Dashboard | Menu | Inventory | POS | Kitchen | Users | Reports |
|------|-----------|------|-----------|-----|---------|-------|---------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cashier | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Chef | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

## 🏗️ Project Structure

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
│   ├── guards/            # Route guards
│   ├── app.routes.ts      # Route configuration
│   └── app.config.ts      # App configuration
└── environments/          # Environment configs
```

## 🛠️ Technology Stack

- **Frontend**: Angular 20 (standalone components)
- **Backend**: Firebase (Authentication + Firestore)
- **Styling**: Custom CSS (no framework dependencies)
- **Language**: TypeScript
- **State Management**: Angular Services

## 📱 Screenshots & Features

### Login Screen
Secure authentication with email/password

### Admin Dashboard
- Total sales and orders today
- Expense tracking
- Low stock alerts
- Sales vs Expenses graph (last 7 days)
- Recent activity log

### Menu Management
- Add/Edit/Delete menu items
- Category-based organization
- Price and tax management
- Active/Inactive status

### Inventory Management
- Track raw materials
- Record purchases (auto-updates stock)
- Low stock alerts
- Supplier management

### Point of Sale
- Quick order entry
- Table number or takeaway option
- Cart management with quantity controls
- Discount application
- KOT printing for kitchen
- Payment processing

### Kitchen Display System
- Real-time order updates
- Time elapsed tracking
- Start cooking / Mark ready workflow
- Auto-refresh every 10 seconds

### Reports & Analytics
- Sales report by date range
- Expense tracking
- Profit/Loss calculation
- Best-selling items analysis

## 🔐 Security

- Firebase Authentication for secure login
- Firestore security rules for data protection
- Route guards for role-based access control
- Environment-based configuration

## 📝 Code Examples for Beginners

### Creating a Menu Item
```typescript
const newItem: MenuItem = {
  name: "Chicken Tikka",
  category: "BBQ",
  price: 15.99,
  taxRate: 5,
  isActive: true
};
await this.db.createMenuItem(newItem);
```

### Taking an Order
```typescript
const order: Order = {
  orderNumber: "ORD-123",
  tableNumber: "T-5",
  items: [...cartItems],
  totalAmount: 45.50,
  status: "completed"
};
await this.db.createOrder(order);
```

## 🎓 Learning Opportunities

This project demonstrates:
- Angular standalone components (latest approach)
- Firebase Authentication & Firestore integration
- TypeScript interfaces and types
- Async/await patterns
- Route guards and navigation
- Template-driven forms
- Component communication
- Real-time data updates

## 🔧 Customization

### Change Primary Colors
Edit component CSS files:
```css
.btn-primary {
  background: #YOUR_COLOR;
}
```

### Add New Menu Categories
Edit `src/app/models/models.ts`:
```typescript
export type MenuCategory = 'BBQ' | 'Curries' | 'Your_Category';
```

## 🐛 Troubleshooting

Common issues and solutions are documented in [SETUP_GUIDE.md](SETUP_GUIDE.md#-troubleshooting)

## 📦 Building for Production

```bash
npm run build
```

Build artifacts will be in the `dist/` directory.

## 🤝 Support

If you encounter issues:
1. Check the [CHECKLIST.md](CHECKLIST.md) for setup verification
2. Review [SETUP_GUIDE.md](SETUP_GUIDE.md) troubleshooting section
3. Check Firebase Console for authentication/database issues
4. Review browser console for JavaScript errors

## 📄 License

This project is for educational purposes.

## 🙏 Acknowledgments

Built with Angular 20 and Firebase for modern restaurant management.

---

**Ready to get started? Follow the [CHECKLIST.md](CHECKLIST.md) for step-by-step setup!** 🚀

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
