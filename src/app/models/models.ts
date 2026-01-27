// User roles in the system
export type UserRole = 'admin' | 'cashier' | 'chef' | 'waiter';

// User interface
export interface User {
  id?: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  pinCode?: string; // For quick POS access
  createdAt?: Date;
  isActive: boolean;
}

// Menu Item Category
export type MenuCategory = 'BBQ' | 'Curries' | 'Rice' | 'Bread' | 'Salads' | 'Drinks' | 'Desserts';

// Menu Item (Product to sell)
export interface MenuItem {
  id?: string;
  name: string;
  category: MenuCategory;
  price: number;
  taxRate: number; // e.g., 5 for 5%
  imageUrl?: string;
  isActive: boolean;
  description?: string;
  recipeMapping?: RecipeItem[]; // Optional: links to inventory items
  createdAt?: Date;
  // New fields for advanced features
  soldByWeight?: boolean; // true if sold by weight (kg)
  unit?: string; // 'piece', 'kg', 'plate', etc.
  preparedItemId?: string; // Link to prepared item inventory if applicable
}

// Recipe mapping (how much inventory is used for one menu item)
export interface RecipeItem {
  inventoryItemId: string;
  inventoryItemName: string;
  quantityUsed: number; // e.g., 200 grams
  unit: string; // e.g., 'g', 'kg', 'ml', 'l'
}

// Inventory Item (Raw materials)
export interface InventoryItem {
  id?: string;
  name: string;
  category: 'Vegetables' | 'Meat' | 'Spices' | 'Oil' | 'Rice' | 'Crockery' | 'Prepared' | 'Other';
  currentStock: number; // Current quantity
  unit: string; // 'kg', 'l', 'pieces', etc.
  lowStockThreshold: number; // Alert when stock goes below this
  createdAt?: Date;
  isPreparedItem?: boolean; // true for prepared items like kebabs, curries
}

// Purchase Record
export interface Purchase {
  id?: string;
  supplierName: string;
  date: Date;
  inventoryItemId: string;
  inventoryItemName: string;
  quantity: number;
  unit: string;
  costPrice: number; // Price per unit
  totalCost: number; // quantity * costPrice
  createdAt?: Date;
}

// Supplier
export interface Supplier {
  id?: string;
  name: string;
  contact: string;
  email?: string;
  address?: string;
  createdAt?: Date;
}

// Order Status
export type OrderStatus = 'pending' | 'cooking' | 'ready' | 'completed' | 'cancelled';

// Order Item (item in an order)
export interface OrderItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  price: number; // Price at time of order
  totalPrice: number; // quantity * price
  notes?: string; // Special instructions (e.g., 'Extra spicy', 'No Mayo')
  isDeal?: boolean; // true if this is a deal item
  dealId?: string; // reference to the deal if applicable
  dealItems?: DealMenuItem[]; // constituent items if this is a deal
}

// Deal Menu Item (item within a deal)
export interface DealMenuItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  standardPrice: number; // Original price per unit
}

// Choice Group for customizable deals
export interface DealChoiceGroup {
  groupName: string; // e.g., "Choose 3 Drinks"
  selectCount: number; // How many items to select
  options: string[]; // Array of menu item IDs
}

// Deal/Combo
export interface Deal {
  id?: string;
  name: string; // e.g., "Family Feast"
  description?: string;
  items: DealMenuItem[]; // Fixed items in the deal
  originalPrice: number; // Sum of standard prices
  dealPrice: number; // Promotional price
  savings: number; // originalPrice - dealPrice
  savingsPercent: number; // (savings / originalPrice) * 100
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  choiceGroups?: DealChoiceGroup[]; // For customizable deals
  imageUrl?: string;
  createdAt?: Date;
}

// Discount Type
export type DiscountType = 'fixed' | 'percentage';

// Order (KOT - Kitchen Order Ticket)
export interface Order {
  id?: string;
  orderNumber: string; // e.g., "ORD-001"
  tableNumber?: string; // null for takeaway
  isTakeaway: boolean;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number; // Calculated discount amount
  discountType?: DiscountType; // Type of discount applied
  discountValue?: number; // Original discount value (percentage or fixed amount)
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date;
  startedCookingAt?: Date;
  readyAt?: Date;
  completedAt?: Date;
  cashierId: string;
  cashierName: string;
}

// Daily Summary
export interface DailySummary {
  id?: string;
  date: string; // Format: YYYY-MM-DD
  totalSales: number;
  totalExpenses: number;
  totalOrders: number;
  profit: number; // totalSales - totalExpenses
  createdAt?: Date;
}

// Activity Log
export interface ActivityLog {
  id?: string;
  userId: string;
  userName: string;
  action: string; // e.g., "Logged in", "Voided bill", "Added menu item"
  timestamp: Date;
  details?: string;
}

// Sales Report Data
export interface SalesReport {
  date: string;
  revenue: number;
  orders: number;
}

// Expense Report Data
export interface ExpenseReport {
  date: string;
  amount: number;
  category: string;
}

// Item Performance
export interface ItemPerformance {
  menuItemId: string;
  menuItemName: string;
  totalSold: number;
  totalRevenue: number;
}

// Inventory Adjustment (for consumption, wastage, corrections)
export interface InventoryAdjustment {
  id?: string;
  inventoryItemId: string;
  inventoryItemName: string;
  adjustmentType: 'consumption' | 'wastage' | 'correction' | 'production'; // production for prepared items
  quantity: number; // positive for adding, negative for reducing
  unit: string;
  reason: string;
  adjustedBy: string; // user name
  date: Date;
  createdAt?: Date;
}

// Application Settings
export interface AppSettings {
  id?: string;
  currency: string; // e.g., '$', '₹', '€', 'AED'
  currencyPosition: 'before' | 'after'; // before: $100, after: 100₹
  dateFormat: string; // e.g., 'MM/DD/YYYY', 'DD/MM/YYYY'
  taxRate: number; // default tax rate
  restaurantName: string;
  createdAt?: Date;
}

// Credit Customer (for loan/credit management)
export interface CreditCustomer {
  id?: string;
  name: string;
  phone: string;
  address?: string;
  companyName?: string;
  currentBalance: number; // Current amount owed (read-only, calculated)
  isCreditEnabled: boolean; // Can they make credit purchases?
  createdAt?: Date;
  updatedAt?: Date;
}

// Customer Ledger Entry (transaction history)
export interface CustomerLedgerEntry {
  id?: string;
  customerId: string;
  customerName: string;
  date: Date;
  referenceType: 'sale' | 'payment'; // Sale adds debt, payment reduces it
  referenceNumber: string; // Order number or payment receipt number
  debit: number; // Amount added to debt (sale)
  credit: number; // Amount paid (payment)
  runningBalance: number; // Balance after this transaction
  notes?: string;
  createdAt?: Date;
}

// Customer Payment (when customer pays their debt)
export interface CustomerPayment {
  id?: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMode: 'cash' | 'bank_transfer' | 'check';
  checkNumber?: string; // For check payments
  transactionId?: string; // For bank transfers
  notes?: string;
  receivedBy: string; // User who recorded the payment
  date: Date;
  createdAt?: Date;
}

// Aging Report Entry
export interface AgingReportEntry {
  customerId: string;
  customerName: string;
  phone: string;
  totalBalance: number;
  current: number; // 0-15 days
  overdue: number; // 16-30 days
  critical: number; // 30+ days
  lastPaymentDate?: Date;
  oldestDebtDate?: Date;
}
