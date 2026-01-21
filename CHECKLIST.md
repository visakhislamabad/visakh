# Setup Checklist - Restaurant Management System

Follow this checklist to get your Restaurant Management System up and running!

## ✅ Pre-Setup Checklist

- [ ] Node.js installed (v18+)
- [ ] npm installed (v9+)
- [ ] Firebase account created
- [ ] Code editor (VS Code recommended)
- [ ] Modern web browser (Chrome/Firefox/Edge)

## ✅ Firebase Setup Checklist

### Step 1: Create Firebase Project
- [ ] Go to https://console.firebase.google.com/
- [ ] Click "Add Project"
- [ ] Enter project name (e.g., "my-restaurant-hms")
- [ ] Accept terms and click Continue
- [ ] Disable Google Analytics (or enable if you want)
- [ ] Wait for project creation
- [ ] Click "Continue" when done

### Step 2: Add Web App
- [ ] Click the Web icon `</>` 
- [ ] Enter app nickname (e.g., "Restaurant Web App")
- [ ] DO NOT check "Firebase Hosting" (not needed)
- [ ] Click "Register app"
- [ ] **COPY the firebaseConfig object** - you'll need this!
- [ ] Click "Continue to Console"

### Step 3: Enable Authentication
- [ ] In left sidebar, click "Authentication"
- [ ] Click "Get Started"
- [ ] Click "Email/Password"
- [ ] Toggle "Email/Password" to ENABLED
- [ ] Click "Save"

### Step 4: Create Firestore Database
- [ ] In left sidebar, click "Firestore Database"
- [ ] Click "Create database"
- [ ] Choose "Start in test mode"
- [ ] Click "Next"
- [ ] Select a location (choose closest to you)
- [ ] Click "Enable"
- [ ] Wait for database creation

### Step 5: Update Security Rules
- [ ] In Firestore, click "Rules" tab
- [ ] Replace existing rules with:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
- [ ] Click "Publish"

## ✅ Application Setup Checklist

### Step 1: Install Dependencies
- [ ] Open terminal in project folder
- [ ] Run: `npm install`
- [ ] Wait for installation to complete
- [ ] Check for any errors

### Step 2: Configure Firebase
- [ ] Open `src/environments/environment.ts`
- [ ] Replace the placeholder Firebase config with yours:
  - [ ] apiKey
  - [ ] authDomain
  - [ ] projectId
  - [ ] storageBucket
  - [ ] messagingSenderId
  - [ ] appId
- [ ] Save the file
- [ ] Open `src/environments/environment.prod.ts`
- [ ] Repeat the same for production config
- [ ] Save the file

### Step 3: Create First Admin User
- [ ] Go to Firebase Console
- [ ] Click "Authentication"
- [ ] Click "Add user"
- [ ] Enter email: `admin@restaurant.com`
- [ ] Enter password: (choose a strong password, min 6 chars)
- [ ] Click "Add user"
- [ ] **COPY THE USER UID** (the long string)
- [ ] Go to "Firestore Database"
- [ ] Click "Start collection"
- [ ] Collection ID: `users`
- [ ] Click "Next"
- [ ] Document ID: **PASTE THE USER UID**
- [ ] Add these fields:
  ```
  Field: email       Type: string    Value: admin@restaurant.com
  Field: name        Type: string    Value: Admin User
  Field: role        Type: string    Value: admin
  Field: username    Type: string    Value: admin
  Field: isActive    Type: boolean   Value: true
  ```
- [ ] Click "Save"

## ✅ Testing Checklist

### Step 1: Start the Application
- [ ] Open terminal
- [ ] Run: `npm start`
- [ ] Wait for compilation
- [ ] Browser should open automatically at http://localhost:4200
- [ ] If not, open browser and go to that URL

### Step 2: Test Login
- [ ] You should see the login screen
- [ ] Enter email: `admin@restaurant.com`
- [ ] Enter password: (your admin password)
- [ ] Click "Login"
- [ ] You should be redirected to Dashboard
- [ ] Navigation bar should appear at top

### Step 3: Test Menu Management
- [ ] Click "Menu" in navigation
- [ ] Click "+ Add New Menu Item"
- [ ] Enter:
  - [ ] Name: Test Item
  - [ ] Category: BBQ
  - [ ] Price: 10
  - [ ] Tax Rate: 0
- [ ] Click "Save"
- [ ] Item should appear in the table
- [ ] Try editing and deleting

### Step 4: Test Inventory
- [ ] Click "Inventory" in navigation
- [ ] Click "+ Add Item"
- [ ] Enter:
  - [ ] Name: Test Ingredient
  - [ ] Category: Vegetables
  - [ ] Current Stock: 50
  - [ ] Unit: kg
  - [ ] Low Stock Threshold: 10
- [ ] Click "Save"
- [ ] Item should appear in stock table

### Step 5: Test Purchase Recording
- [ ] Click "Purchase History" tab
- [ ] Click "+ Record Purchase"
- [ ] Enter:
  - [ ] Supplier: Test Supplier
  - [ ] Select your test ingredient
  - [ ] Quantity: 10
  - [ ] Cost Price: 5
  - [ ] Total should auto-calculate to 50
- [ ] Click "Save Purchase"
- [ ] Go back to "Current Stock" tab
- [ ] Test ingredient stock should now be 60 (50 + 10)

### Step 6: Test POS
- [ ] Click "POS" in navigation
- [ ] Click on your test menu item
- [ ] Item should appear in cart
- [ ] Enter table number: T-1
- [ ] Click "Pay & Print Bill"
- [ ] Should show success message
- [ ] Cart should clear

### Step 7: Test Reports
- [ ] Click "Reports" in navigation
- [ ] Should see your test order in sales
- [ ] Should see your test purchase in expenses
- [ ] Profit should calculate correctly

### Step 8: Test User Management
- [ ] Click "Users" in navigation
- [ ] Click "+ Add User"
- [ ] Create a test cashier:
  - [ ] Name: Test Cashier
  - [ ] Email: cashier@test.com
  - [ ] Role: cashier
  - [ ] Password: Test@123
- [ ] Click "Save User"
- [ ] User should appear in table

### Step 9: Test Role-Based Access
- [ ] Click "Logout"
- [ ] Login with cashier credentials
- [ ] You should only see "POS" in navigation
- [ ] You should NOT see Dashboard, Menu, Inventory, etc.
- [ ] Logout and login back as admin

## ✅ Production Checklist

Before deploying to production:

- [ ] Update Firebase Security Rules to production mode
- [ ] Change all test passwords to strong passwords
- [ ] Update environment.prod.ts with production Firebase config
- [ ] Test all features thoroughly
- [ ] Add real menu items
- [ ] Add real inventory items
- [ ] Create real staff accounts
- [ ] Delete all test data
- [ ] Build production version: `npm run build`
- [ ] Deploy to hosting service
- [ ] Test on production URL
- [ ] Train staff on how to use the system

## ✅ Daily Operations Checklist

### Morning (Admin)
- [ ] Check Dashboard for yesterday's summary
- [ ] Review low stock alerts
- [ ] Record any new purchases
- [ ] Check if any menu items need updating

### During Service (Cashier)
- [ ] Login to POS
- [ ] Take customer orders
- [ ] Process payments
- [ ] Print KOTs for kitchen

### During Service (Chef)
- [ ] Login to Kitchen Display
- [ ] Monitor incoming orders
- [ ] Mark orders as cooking
- [ ] Mark completed orders as ready

### End of Day (Admin)
- [ ] Review Reports for the day
- [ ] Check total sales vs expenses
- [ ] Review item performance
- [ ] Plan for next day's purchases

## 🎯 Success Criteria

Your setup is complete when:
- [ ] You can login as admin
- [ ] You can see the dashboard with data
- [ ] You can create menu items
- [ ] You can record purchases (and see stock increase)
- [ ] You can take orders in POS
- [ ] You can view orders in Kitchen Display
- [ ] You can generate reports
- [ ] You can create new users
- [ ] Different roles see different menus
- [ ] All features work without errors

## 🆘 Common Issues & Solutions

### Issue: Can't login
**Solution**: 
- Check Firebase Authentication is enabled
- Verify user exists in Authentication AND Firestore
- Check console for errors

### Issue: "Permission denied" in console
**Solution**: 
- Update Firestore security rules
- Make sure user is authenticated
- Check that collections exist

### Issue: Data not appearing
**Solution**: 
- Check Firebase console to see if data is there
- Check browser console for errors
- Verify Firebase config is correct

### Issue: Build errors
**Solution**: 
- Run `npm install` again
- Check for TypeScript errors
- Make sure all imports are correct

## 📚 Next Steps

After successful setup:
1. Read QUICK_REFERENCE.md for common tasks
2. Check SAMPLE_DATA.md for example data
3. Customize colors and branding
4. Add your restaurant logo
5. Train your staff
6. Start using for real operations!

---

**Congratulations! Your Restaurant Management System is ready! 🎉**
