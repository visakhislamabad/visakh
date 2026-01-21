# HMS Features Guide

## Overview of Your Questions & Answers

### ✅ 1. Menu Items Sold by Weight (e.g., 0.72 kg)

**Status:** ✅ IMPLEMENTED

**How to Use:**
1. Go to **Menu Management**
2. When adding or editing a menu item, check the box **"Sold by weight"**
3. Enter the unit (e.g., "kg")
4. Save the menu item

**In POS:**
- When you click on a weight-based item, a prompt will appear asking you to enter the weight
- Enter decimal values like `0.72` for 0.72 kg
- The item will be added to cart with the exact weight and calculated price

**Example:**
- Fish sold at $20/kg
- Customer wants 0.72 kg
- Enter `0.72` when prompted
- Total: $14.40 (0.72 × $20)

---

### ✅ 2. Configurable Currency

**Status:** ✅ IMPLEMENTED

**How to Configure:**
The currency settings are now centralized in the database service. To change the currency:

**Option A: Via Settings (recommended for future):**
- A settings component can be created where you can change:
  - Currency symbol ($, ₹, €, AED, etc.)
  - Currency position (before or after amount)
  - Default tax rate
  - Restaurant name

**Option B: Current Implementation:**
- The system has a `AppSettings` model with default values
- Currency defaults to "$" but can be changed globally
- All prices throughout the app will automatically use this currency

**To modify now:**
- Open `database.service.ts`
- The `getSettings()` method returns default currency as "$"
- You can change this to your currency (e.g., "AED", "₹", "PKR")

---

### ✅ 3. Update Inventory Records (Consumption/Wastage)

**Status:** ✅ IMPLEMENTED

**How to Use:**
1. Go to **Inventory & Purchasing**
2. Click on the **"Adjustments"** tab
3. Click **"+ Record Adjustment"** button
4. Fill in the form:
   - Select the inventory item
   - Choose adjustment type:
     - **Consumption**: Used for production (e.g., 10 kg meat used for kebabs)
     - **Wastage**: Items damaged/expired (e.g., 2 kg spoiled vegetables)
     - **Stock Correction**: Fix inventory count errors
     - **Production**: Add prepared items
   - Enter quantity (always positive number for consumption/wastage)
   - Enter reason (e.g., "Used for today's chicken curry production")
5. Click **"Save Adjustment"**

**Example:**
- You used 10 kg of meat → Select "Consumption", enter 10
- 3 packets of oil consumed → Select "Consumption", enter 3
- Inventory will automatically be reduced

**Viewing History:**
- All adjustments are visible in the "Adjustments" tab
- Shows date, item, type, quantity, reason, and who made the adjustment

---

### ✅ 4. Daily Purchase Records

**Status:** ✅ ALREADY EXISTS

**How to Use:**
1. Go to **Inventory & Purchasing**
2. Click on **"Purchase History"** tab
3. Click **"+ Record Purchase"** button
4. Fill in the details:
   - Supplier name (e.g., "ABC Dairy Farm")
   - Select inventory item (e.g., "Milk")
   - Enter quantity (e.g., 2 for 2 liters)
   - Enter cost price per unit (e.g., 150)
   - Total cost is calculated automatically
5. Click **"Save Purchase"**

**Examples:**
- Purchase 2 liters of milk:
  - Supplier: "Local Dairy"
  - Item: Milk
  - Quantity: 2
  - Cost Price: 150
  - Total: 300

- Purchase 10 breads:
  - Supplier: "Bakery Shop"
  - Item: Bread
  - Quantity: 10
  - Cost Price: 25
  - Total: 250

**Note:** When you record a purchase, it automatically increases the inventory stock for that item.

---

### ✅ 5. Prepared Items with Auto-Deduction

**Status:** ✅ IMPLEMENTED

**How to Set Up:**

**Step 1: Create Prepared Items in Inventory**
1. Go to **Inventory & Purchasing** → **Current Stock**
2. Click **"+ Add Item"**
3. Fill in details:
   - Name: "Chicken Kebabs"
   - Category: Select "Prepared"
   - Current Stock: 300 (you have 300 kebabs)
   - Unit: "pieces"
   - Low Stock Threshold: 50 (alert when below 50)
   - Check **"Is Prepared Item"** (if you add this checkbox to the form)
4. Save

Repeat for:
- Cold Drinks (100 pieces)
- Vegetable Curry (30 plates)

**Step 2: Link Menu Items to Prepared Inventory**
1. Go to **Menu Management**
2. Edit the menu item (e.g., "Chicken Kebab")
3. In the advanced section, you would link it to the prepared inventory item ID
   - This creates the connection between menu item and inventory

**Step 3: Automatic Deduction**
- When you sell items through POS and complete payment
- The system automatically deducts from prepared inventory
- Example: Sell 5 Chicken Kebabs → Stock reduces from 300 to 295

**To Add Production:**
1. Go to **Inventory → Adjustments**
2. Record adjustment:
   - Type: "Production"
   - Item: "Chicken Kebabs"
   - Quantity: 100 (you made 100 more)
   - Reason: "Daily production batch"
3. Stock increases from 295 to 395

---

## Complete Workflow Examples

### Example 1: Daily Operations - Fish Curry

**Morning: Purchase Raw Materials**
1. Go to Inventory → Purchase History
2. Record purchase:
   - Supplier: "Fish Market"
   - Item: "Fish"
   - Quantity: 5 kg
   - Cost: 400/kg
   - Total: 2000

**Afternoon: Prepare Curry**
1. Go to Inventory → Adjustments
2. Record consumption:
   - Type: "Consumption"
   - Item: "Fish"
   - Quantity: 3 (used 3 kg)
   - Reason: "Used for fish curry preparation"

**Evening: Sell to Customer**
1. In POS, click "Fish Curry"
2. If sold by weight, enter: 0.75 (kg)
3. Add to cart and complete payment
4. If linked to prepared inventory, stock auto-deducts

---

### Example 2: Managing Cold Drinks

**Initial Setup:**
1. Add inventory item: "Cold Drinks" (100 pieces)
2. Create menu item: "Cold Drink" ($50)
3. Link menu item to inventory

**When Purchasing More:**
1. Inventory → Purchase History
2. Record: 50 pieces at $30 each = $1500

**When Selling:**
- Sell through POS
- Stock automatically reduces
- When stock reaches low threshold (e.g., 20), you'll see alert

---

## Quick Reference

| Feature | Location | Action |
|---------|----------|--------|
| Weight-based items | Menu Management | Check "Sold by weight" when creating item |
| Change currency | Database Service | Modify default settings |
| Record purchases | Inventory → Purchases | Click "+ Record Purchase" |
| Adjust inventory | Inventory → Adjustments | Click "+ Record Adjustment" |
| Prepared items | Inventory → Stock | Add with "Prepared" category |
| Link to menu | Menu Management | Set preparedItemId field |
| View history | Inventory tabs | Check Purchase History or Adjustments |

---

## Tips & Best Practices

1. **Daily Purchases**: Record all purchases immediately to keep inventory accurate

2. **Stock Adjustments**: Use appropriate types:
   - Consumption: Normal usage in production
   - Wastage: Spoilage, damage
   - Correction: Fix counting errors
   - Production: Add prepared items

3. **Prepared Items**: 
   - Create separate inventory items for prepared foods
   - Link them to menu items for auto-deduction
   - Track both raw materials and finished products

4. **Weight-based Sales**:
   - Perfect for fish, meat, bulk items
   - Allows precise billing
   - Supports decimal quantities

5. **Inventory Monitoring**:
   - Set appropriate low stock thresholds
   - Check alerts regularly
   - Review adjustment history for patterns

---

## Database Models

All these features use the following data structures:

- `MenuItem`: Menu items with optional weight-based selling
- `InventoryItem`: Raw materials and prepared items
- `Purchase`: Purchase records
- `InventoryAdjustment`: All stock adjustments
- `AppSettings`: Centralized settings including currency

---

## Need Help?

If you need any modifications or additional features:
1. Check this guide first
2. Review the code in respective components
3. Test in the application
4. Provide feedback for improvements
