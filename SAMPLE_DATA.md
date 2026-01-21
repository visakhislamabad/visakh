# Sample Data for Testing

This file shows example data you can add to your Firebase Firestore to test the application.

## Sample Menu Items

### BBQ Category
```json
{
  "name": "Chicken Kebab",
  "category": "BBQ",
  "price": 12.99,
  "taxRate": 5,
  "isActive": true,
  "description": "Grilled chicken skewers with spices"
}

{
  "name": "Lamb Chops",
  "category": "BBQ",
  "price": 18.99,
  "taxRate": 5,
  "isActive": true,
  "description": "Tender lamb chops marinated and grilled"
}
```

### Curries Category
```json
{
  "name": "Butter Chicken",
  "category": "Curries",
  "price": 14.99,
  "taxRate": 5,
  "isActive": true,
  "description": "Creamy tomato-based chicken curry"
}

{
  "name": "Vegetable Korma",
  "category": "Curries",
  "price": 10.99,
  "taxRate": 5,
  "isActive": true,
  "description": "Mixed vegetables in creamy curry sauce"
}
```

### Rice Category
```json
{
  "name": "Biryani",
  "category": "Rice",
  "price": 13.99,
  "taxRate": 5,
  "isActive": true,
  "description": "Aromatic rice with meat and spices"
}

{
  "name": "Plain Rice",
  "category": "Rice",
  "price": 3.99,
  "taxRate": 5,
  "isActive": true,
  "description": "Steamed basmati rice"
}
```

### Drinks
```json
{
  "name": "Mango Lassi",
  "category": "Drinks",
  "price": 4.99,
  "taxRate": 5,
  "isActive": true,
  "description": "Sweet yogurt drink with mango"
}

{
  "name": "Soft Drink",
  "category": "Drinks",
  "price": 2.99,
  "taxRate": 5,
  "isActive": true,
  "description": "Coke, Sprite, Fanta"
}
```

## Sample Inventory Items

```json
{
  "name": "Chicken Breast",
  "category": "Meat",
  "currentStock": 50,
  "unit": "kg",
  "lowStockThreshold": 10
}

{
  "name": "Basmati Rice",
  "category": "Rice",
  "currentStock": 100,
  "unit": "kg",
  "lowStockThreshold": 20
}

{
  "name": "Tomatoes",
  "category": "Vegetables",
  "currentStock": 30,
  "unit": "kg",
  "lowStockThreshold": 5
}

{
  "name": "Cooking Oil",
  "category": "Oil",
  "currentStock": 25,
  "unit": "l",
  "lowStockThreshold": 5
}

{
  "name": "Garam Masala",
  "category": "Spices",
  "currentStock": 5,
  "unit": "kg",
  "lowStockThreshold": 1
}

{
  "name": "Onions",
  "category": "Vegetables",
  "currentStock": 40,
  "unit": "kg",
  "lowStockThreshold": 10
}
```

## Sample Suppliers

```json
{
  "name": "Fresh Meat Suppliers",
  "contact": "+1-555-0123",
  "email": "orders@freshmeat.com",
  "address": "123 Market St, Food District"
}

{
  "name": "Veggie Wholesale Co",
  "contact": "+1-555-0456",
  "email": "sales@veggiewholesale.com",
  "address": "456 Farm Road, Agricultural Zone"
}

{
  "name": "Spice Masters Inc",
  "contact": "+1-555-0789",
  "email": "info@spicemasters.com",
  "address": "789 Spice Lane, Trade Center"
}
```

## Sample Users

### Admin User
```
(Create in Firebase Authentication first, then add document to Firestore)
Email: admin@restaurant.com
Password: Admin@123

Firestore Document:
{
  "email": "admin@restaurant.com",
  "name": "Admin User",
  "role": "admin",
  "username": "admin",
  "isActive": true
}
```

### Cashier User
```
Email: cashier@restaurant.com
Password: Cashier@123

Firestore Document:
{
  "email": "cashier@restaurant.com",
  "name": "John Cashier",
  "role": "cashier",
  "username": "cashier1",
  "pinCode": "1234",
  "isActive": true
}
```

### Chef User
```
Email: chef@restaurant.com
Password: Chef@123

Firestore Document:
{
  "email": "chef@restaurant.com",
  "name": "Chef Mike",
  "role": "chef",
  "username": "chef1",
  "isActive": true
}
```

## How to Add This Data

### Method 1: Using the Application (Recommended)
1. Login as admin
2. Go to Menu Management → Add each menu item
3. Go to Inventory → Add each inventory item
4. Go to User Management → Add cashier and chef users

### Method 2: Directly in Firebase Console (Faster for Testing)
1. Go to Firebase Console → Firestore Database
2. Click "Start Collection"
3. Collection ID: `menuItems`
4. Click "Add Document"
5. Let Firebase auto-generate ID
6. Add fields manually or import JSON

## Testing the Complete Workflow

After adding sample data:

### Test 1: Check Dashboard
- Login as admin
- Dashboard should show 0 sales, 0 orders initially
- Should see your inventory items

### Test 2: Make a Purchase
1. Go to Inventory → Purchase History
2. Click "Record Purchase"
3. Enter:
   - Supplier: "Fresh Meat Suppliers"
   - Item: Select "Chicken Breast"
   - Quantity: 20
   - Cost Price: 5.00
   - Total will be: 100.00
4. Save
5. Check Current Stock tab - Chicken should increase by 20kg
6. Dashboard expenses should show $100

### Test 3: Create an Order (POS)
1. Login as cashier or stay as admin
2. Go to POS
3. Click "Chicken Kebab" (adds to cart)
4. Click "Biryani" (adds to cart)
5. Click "Mango Lassi" (adds to cart)
6. Enter Table Number: "T-5"
7. Click "Pay & Print Bill"
8. Total should be: $12.99 + $13.99 + $4.99 + tax
9. Dashboard should update with this sale

### Test 4: Kitchen Display
1. Open new browser window
2. Login as chef
3. Should see the order from Test 3
4. Click "Start Cooking"
5. Wait a moment
6. Click "Mark Ready"

### Test 5: Generate Report
1. Login as admin
2. Go to Reports
3. Select date range (today to today)
4. View:
   - Sales Report: Should show 1 order
   - Expense Report: Should show purchase from Test 2
   - Profit/Loss: Revenue - $100 expense
   - Item Performance: Should show which items sold

## Expected Results

After all tests:
- **Dashboard**:
  - Total Sales Today: ~$35-40 (depending on tax)
  - Total Orders: 1
  - Expenses Today: $100
  - Profit Today: Negative (more expenses than sales)

- **Inventory**:
  - Chicken stock: 70kg (50 initial + 20 purchased)
  - Other items unchanged

- **Reports**:
  - 1 completed order
  - 1 purchase record
  - Chicken Kebab, Biryani, Mango Lassi in top items

## Tips for Real Use

1. **Start Simple**: Add 5-10 menu items initially
2. **Real Inventory**: Add items you actually purchase
3. **Accurate Pricing**: Use your real prices
4. **Test Thoroughly**: Make test orders before going live
5. **Train Staff**: Show cashiers and chefs how to use their screens
6. **Regular Backups**: Export Firestore data regularly
7. **Monitor Low Stock**: Check dashboard daily for alerts

---

This sample data should help you understand how everything connects!
