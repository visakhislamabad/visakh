# Category Management Setup Guide

## Overview

The HMS application now supports **dynamic categories** that can be managed through the UI. Categories are stored in Firestore and can be added, edited, or deleted without modifying code.

## Initial Setup - Adding Default Categories

Since you already have menu items in your database with the old hardcoded categories, you need to create those categories in Firestore first.

### Option 1: Using Firebase Console (Recommended)

1. Go to your **Firebase Console** → **Firestore Database**
2. Click **"Start collection"** or select existing collections
3. Create a new collection called **`categories`**
4. Add the following documents (one at a time):

#### Default Categories to Add:

**Document 1: BBQ**
```
Field: name          Type: string    Value: BBQ
Field: displayOrder  Type: number    Value: 0
Field: isActive      Type: boolean   Value: true
Field: createdAt     Type: timestamp Value: (current timestamp)
```

**Document 2: Curries**
```
Field: name          Type: string    Value: Curries
Field: displayOrder  Type: number    Value: 1
Field: isActive      Type: boolean   Value: true
Field: createdAt     Type: timestamp Value: (current timestamp)
```

**Document 3: Rice**
```
Field: name          Type: string    Value: Rice
Field: displayOrder  Type: number    Value: 2
Field: isActive      Type: boolean   Value: true
Field: createdAt     Type: timestamp Value: (current timestamp)
```

**Document 4: Bread**
```
Field: name          Type: string    Value: Bread
Field: displayOrder  Type: number    Value: 3
Field: isActive      Type: boolean   Value: true
Field: createdAt     Type: timestamp Value: (current timestamp)
```

**Document 5: Salads**
```
Field: name          Type: string    Value: Salads
Field: displayOrder  Type: number    Value: 4
Field: isActive      Type: boolean   Value: true
Field: createdAt     Type: timestamp Value: (current timestamp)
```

**Document 6: Drinks**
```
Field: name          Type: string    Value: Drinks
Field: displayOrder  Type: number    Value: 5
Field: isActive      Type: boolean   Value: true
Field: createdAt     Type: timestamp Value: (current timestamp)
```

**Document 7: Desserts**
```
Field: name          Type: string    Value: Desserts
Field: displayOrder  Type: number    Value: 6
Field: isActive      Type: boolean   Value: true
Field: createdAt     Type: timestamp Value: (current timestamp)
```

### Option 2: Using the Application UI

Once the app is running:

1. Login as **admin**
2. Go to **Menu Management**
3. Click **"🏷️ Manage Categories"** button
4. Click **"+ Add New"** or the category modal
5. Add each category one by one:
   - Enter the category name
   - Set display order (0, 1, 2, etc.)
   - Ensure "Active" is checked
   - Click "Save"

## How to Use Category Management

### Adding a New Category

1. Go to **Menu Management**
2. Click **"🏷️ Manage Categories"**
3. Enter category name (e.g., "Appetizers", "Seafood", "Pasta")
4. Set display order (lower numbers appear first)
5. Check "Active" if you want it to show immediately
6. Click **"Save"**

### Editing a Category

1. In the Categories section, click **"Edit"** on the category
2. Modify the name or display order
3. Click **"Save"**

### Deactivating a Category

1. Click **"Deactivate"** on the category
2. The category will still exist but won't show in dropdowns
3. Menu items using this category will still work

### Deleting a Category

1. Click **"Delete"** on the category
2. ⚠️ **Warning**: You can only delete a category if NO menu items are using it
3. If menu items exist, you'll get an error message
4. First reassign or delete those menu items, then delete the category

## Features

### In Menu Management:
- **"Manage Categories"** button to open category management
- View all categories with their status
- Add, Edit, Activate/Deactivate, or Delete categories
- Protection against deleting categories in use

### In POS:
- Categories are loaded dynamically from database
- Only active categories are shown
- Categories update automatically when changed

### In Waiter Screen:
- Categories appear in the menu selection screen
- Only active categories are displayed
- Supports filtering by category

### In Deal Management:
- Filter menu items by category when creating deals
- Uses active categories from database

## Adding More Categories - Examples

Here are some popular restaurant category ideas:

- **Appetizers** - Starters and small plates
- **Soups** - Hot and cold soups
- **Seafood** - Fish and shellfish dishes
- **Pasta** - Italian pasta dishes
- **Pizza** - Various pizza options
- **Sandwiches** - All types of sandwiches
- **Burgers** - Burger varieties
- **Breakfast** - Morning items
- **Lunch Specials** - Midday deals
- **Kids Menu** - Child-friendly items
- **Sides** - Side dishes and extras
- **Sauces & Condiments** - Add-ons
- **Hot Beverages** - Coffee, tea, etc.
- **Cold Beverages** - Juices, sodas, etc.
- **Smoothies** - Blended drinks
- **Ice Cream** - Frozen desserts
- **Cakes & Pastries** - Baked goods

## Tips

1. **Display Order**: Use increments of 10 (0, 10, 20, 30...) so you can easily insert categories in between later

2. **Naming Convention**: Use title case for consistency (e.g., "Hot Beverages" not "hot beverages")

3. **Don't Over-Categorize**: Too many categories can confuse staff and customers. Start with 7-12 main categories

4. **Test Before Going Live**: Add test categories and menu items to make sure everything works

5. **Backup**: Before deleting categories, take a Firestore backup

## Benefits of Dynamic Categories

✅ No code changes needed to add new categories  
✅ Categories can be temporarily disabled without deleting  
✅ Easy to reorganize with display order  
✅ Protection against accidentally breaking menu items  
✅ Changes reflect immediately across all screens  
✅ Consistent categories across POS, Waiter, and Management

## Troubleshooting

**Q: Categories not showing up?**
- Make sure `isActive` is set to `true` in Firestore
- Check the browser console for errors
- Verify the collection name is exactly `categories` (lowercase)

**Q: Can't delete a category?**
- Check if any menu items are using it
- Go to Menu Management and filter by that category
- Reassign or delete those menu items first

**Q: Menu items disappeared after adding categories?**
- Menu items still exist, but need matching category names
- Check that your menu item categories match the new category names exactly
- Category names are case-sensitive

---

**Need Help?** Check the Firebase Console's Firestore Database to see your current data structure.
