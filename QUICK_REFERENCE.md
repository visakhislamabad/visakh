# Quick Reference Guide - Restaurant Management System

## 🔑 Default Test Credentials

After setting up your first admin user in Firebase:
- Email: `admin@restaurant.com` (or whatever you set)
- Password: Your chosen password

## 📱 Common Tasks

### Adding a New Menu Item
1. Login as Admin
2. Click "Menu" in navigation
3. Click "+ Add New Menu Item"
4. Fill in:
   - Item Name (e.g., "Chicken Tikka")
   - Category (BBQ, Curries, etc.)
   - Price (selling price)
   - Tax Rate (percentage)
5. Click "Save"

### Recording a Purchase
1. Go to "Inventory" tab
2. Click "Purchase History" tab
3. Click "+ Record Purchase"
4. Select inventory item from dropdown
5. Enter quantity and cost price
6. Total cost calculates automatically
7. Click "Save Purchase"
- **Note**: This automatically increases your inventory stock!

### Taking an Order (POS)
1. Login as Cashier or Admin
2. Go to POS screen
3. Click menu items to add to cart
4. Use +/- buttons to adjust quantities
5. Enter table number (or check "Takeaway")
6. Apply discount if needed
7. Click "Print KOT" to send to kitchen (optional)
8. Click "Pay & Print Bill" to complete

### Managing Kitchen Orders
1. Login as Chef
2. View all active orders
3. Click "Start Cooking" when you begin
4. Click "Mark Ready" when food is prepared

## 🎯 Understanding the Workflow

### Complete Restaurant Flow:
```
1. ADMIN SETUP
   ├── Add inventory items (raw materials)
   ├── Create menu items (what customers buy)
   └── Create staff user accounts

2. PURCHASING
   └── Record purchases → Inventory automatically increases

3. SALES
   ├── Cashier takes order in POS
   ├── Order sent to kitchen (KOT)
   ├── Kitchen prepares food
   ├── Payment completed
   └── Inventory automatically decreases (if recipe mapped)

4. REPORTING
   └── Admin reviews sales, expenses, and profit
```

## 🔧 Code Explanations for Beginners

### How Components Work

**Example: Menu Management Component**
```typescript
// The component file (.ts) contains the logic
export class MenuManagementComponent {
  menuItems: MenuItem[] = [];  // Array to store menu items
  
  async loadMenuItems() {
    // Get data from database
    this.menuItems = await this.db.getMenuItems();
  }
  
  async saveItem() {
    // Save data to database
    await this.db.createMenuItem(this.currentItem);
  }
}
```

**The HTML template (.html)**
- Uses `*ngFor` to loop through arrays
- Uses `*ngIf` to show/hide elements
- Uses `[(ngModel)]` for two-way data binding
- Uses `(click)` for button clicks

**The CSS file (.css)**
- Styles the component
- Uses classes like `.btn`, `.modal`, etc.

### How Firebase Works

**Authentication (auth.service.ts):**
```typescript
// Login function
async login(email, password) {
  // Firebase handles the authentication
  await signInWithEmailAndPassword(this.auth, email, password);
  // Then we load user data from Firestore
}
```

**Database (database.service.ts):**
```typescript
// Create a menu item
async createMenuItem(item) {
  // Add document to 'menuItems' collection
  const docRef = await addDoc(collection(this.firestore, 'menuItems'), item);
  return docRef.id;
}

// Get all menu items
async getMenuItems() {
  // Get all documents from 'menuItems' collection
  const snapshot = await getDocs(collection(this.firestore, 'menuItems'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

## 📊 Firebase Collections Structure

Your Firestore database will have these collections:

```
📁 users
   └── {userId}
       ├── email: "user@example.com"
       ├── name: "John Doe"
       ├── role: "admin" | "cashier" | "chef"
       └── isActive: true

📁 menuItems
   └── {menuItemId}
       ├── name: "Chicken Kebab"
       ├── category: "BBQ"
       ├── price: 15.99
       ├── taxRate: 5
       └── isActive: true

📁 inventory
   └── {inventoryItemId}
       ├── name: "Chicken"
       ├── currentStock: 50
       ├── unit: "kg"
       └── lowStockThreshold: 5

📁 purchases
   └── {purchaseId}
       ├── supplierName: "ABC Meat Co"
       ├── inventoryItemId: "..."
       ├── quantity: 20
       └── totalCost: 200

📁 orders
   └── {orderId}
       ├── orderNumber: "ORD-1234567890"
       ├── tableNumber: "T-5"
       ├── items: [...]
       ├── totalAmount: 45.50
       └── status: "completed"
```

## 🎨 Customization Tips

### Changing Colors
Edit component CSS files:
```css
/* Change primary color */
.btn-primary {
  background: #YOUR_COLOR;
}

/* Change navigation gradient */
.navbar {
  background: linear-gradient(135deg, #COLOR1 0%, #COLOR2 100%);
}
```

### Adding New Menu Categories
Edit `src/app/models/models.ts`:
```typescript
export type MenuCategory = 'BBQ' | 'Curries' | 'Rice' | 'Bread' | 
                          'Salads' | 'Drinks' | 'Desserts' | 'YOUR_NEW_CATEGORY';
```

### Adding New User Roles
1. Update models: `export type UserRole = 'admin' | 'cashier' | 'chef' | 'your_role';`
2. Update guards if needed
3. Update navigation to show/hide based on role

## ⚠️ Common Mistakes to Avoid

1. **Forgetting to enable Firebase Authentication**
   - Go to Firebase Console > Authentication > Get Started

2. **Not creating user document in Firestore**
   - Authentication user AND Firestore user document both needed

3. **Wrong Firebase config**
   - Copy from Firebase Console exactly
   - Check for typos in apiKey, projectId, etc.

4. **Not updating security rules**
   - Default rules expire after 30 days
   - Update to production rules before going live

5. **Trying to access before login**
   - Route guards prevent this
   - Always login first

## 🚀 Next Steps

After basic setup:
1. Add more menu items
2. Record some test purchases
3. Create test orders in POS
4. Check reports to see data flow
5. Customize styling to match your brand
6. Add your restaurant logo
7. Consider adding receipt printing
8. Add backup/export functionality

## 💡 Learning Resources

**Angular Concepts Used:**
- Components & Templates
- Services & Dependency Injection
- Routing & Navigation
- Forms (Template-driven with ngModel)
- Guards (for route protection)

**Firebase Features:**
- Authentication (Email/Password)
- Firestore (NoSQL Database)
- Real-time listeners (auto-refresh data)

**TypeScript Features:**
- Interfaces (data structure definitions)
- Async/Await (handling promises)
- Types (string, number, boolean, etc.)

---

Need help? Check the SETUP_GUIDE.md for detailed instructions!
