import { Injectable, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  CollectionReference,
  DocumentData
} from '@angular/fire/firestore';
import {
  User,
  MenuItem,
  InventoryItem,
  Purchase,
  Supplier,
  Order,
  ActivityLog,
  DailySummary,
  InventoryAdjustment,
  AppSettings,
  Deal
} from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  constructor(private firestore: Firestore, private envInjector: EnvironmentInjector) {}

  private inCtx<T>(fn: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.envInjector, fn);
  }

  // ============ USERS ============
  async createUser(user: User): Promise<string> {
    const usersRef = collection(this.firestore, 'users');
    const docRef = await addDoc(usersRef, {
      ...user,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  }

  async getUsers(): Promise<User[]> {
    const usersRef = collection(this.firestore, 'users');
    const snapshot = await this.inCtx(() => getDocs(usersRef));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }

  async updateUser(id: string, user: Partial<User>): Promise<void> {
    const userDoc = doc(this.firestore, `users/${id}`);
    await updateDoc(userDoc, user);
  }

  async deleteUser(id: string): Promise<void> {
    const userDoc = doc(this.firestore, `users/${id}`);
    await deleteDoc(userDoc);
  }

  // ============ MENU ITEMS ============
  async createMenuItem(item: MenuItem): Promise<string> {
    const menuRef = collection(this.firestore, 'menuItems');
    const docRef = await addDoc(menuRef, {
      ...item,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  }

  async getMenuItems(): Promise<MenuItem[]> {
    const menuRef = collection(this.firestore, 'menuItems');
    const snapshot = await this.inCtx(() => getDocs(menuRef));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
  }

  async getActiveMenuItems(): Promise<MenuItem[]> {
    const menuRef = collection(this.firestore, 'menuItems');
    const q = query(menuRef, where('isActive', '==', true));
    const snapshot = await this.inCtx(() => getDocs(q));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
  }

  async updateMenuItem(id: string, item: Partial<MenuItem>): Promise<void> {
    const itemDoc = doc(this.firestore, `menuItems/${id}`);
    await updateDoc(itemDoc, item);
  }

  async deleteMenuItem(id: string): Promise<void> {
    const itemDoc = doc(this.firestore, `menuItems/${id}`);
    await deleteDoc(itemDoc);
  }

  // ============ DEALS & COMBOS ============
  async createDeal(deal: Deal): Promise<string> {
    const dealsRef = collection(this.firestore, 'deals');
    const dealData: any = {
      ...deal,
      createdAt: Timestamp.now()
    };
    // Convert dates to Timestamp
    if (deal.startDate) dealData.startDate = Timestamp.fromDate(deal.startDate);
    if (deal.endDate) dealData.endDate = Timestamp.fromDate(deal.endDate);
    
    const docRef = await addDoc(dealsRef, dealData);
    return docRef.id;
  }

  async getDeals(): Promise<Deal[]> {
    const dealsRef = collection(this.firestore, 'deals');
    const snapshot = await this.inCtx(() => getDocs(dealsRef));
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data['startDate']?.toDate(),
        endDate: data['endDate']?.toDate(),
        createdAt: data['createdAt']?.toDate()
      } as Deal;
    });
  }

  async getActiveDeals(): Promise<Deal[]> {
    const deals = await this.getDeals();
    const now = new Date();
    return deals.filter(deal => {
      if (!deal.isActive) return false;
      // Check date validity
      if (deal.startDate && deal.startDate > now) return false;
      if (deal.endDate && deal.endDate < now) return false;
      return true;
    });
  }

  async updateDeal(id: string, deal: Partial<Deal>): Promise<void> {
    const dealDoc = doc(this.firestore, `deals/${id}`);
    const updateData: any = { ...deal };
    // Convert dates to Timestamp
    if (deal.startDate) updateData.startDate = Timestamp.fromDate(deal.startDate);
    if (deal.endDate) updateData.endDate = Timestamp.fromDate(deal.endDate);
    await updateDoc(dealDoc, updateData);
  }

  async deleteDeal(id: string): Promise<void> {
    const dealDoc = doc(this.firestore, `deals/${id}`);
    await deleteDoc(dealDoc);
  }

  // ============ INVENTORY ============
  async createInventoryItem(item: InventoryItem): Promise<string> {
    const inventoryRef = collection(this.firestore, 'inventory');
    const docRef = await addDoc(inventoryRef, {
      ...item,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    const inventoryRef = collection(this.firestore, 'inventory');
    const snapshot = await this.inCtx(() => getDocs(inventoryRef));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    const items = await this.getInventoryItems();
    return items.filter(item => item.currentStock < item.lowStockThreshold);
  }

  async updateInventoryItem(id: string, item: Partial<InventoryItem>): Promise<void> {
    const itemDoc = doc(this.firestore, `inventory/${id}`);
    await updateDoc(itemDoc, item);
  }

  async deleteInventoryItem(id: string): Promise<void> {
    const itemDoc = doc(this.firestore, `inventory/${id}`);
    await deleteDoc(itemDoc);
  }

  async updateInventoryStock(id: string, quantityChange: number): Promise<void> {
    const itemDoc = doc(this.firestore, `inventory/${id}`);
    const snapshot = await this.inCtx(() => getDoc(itemDoc));
    if (snapshot.exists()) {
      const currentStock = snapshot.data()['currentStock'] || 0;
      await updateDoc(itemDoc, { currentStock: currentStock + quantityChange });
    }
  }

  // ============ PURCHASES ============
  async createPurchase(purchase: Purchase): Promise<string> {
    const purchasesRef = collection(this.firestore, 'purchases');
    const docRef = await addDoc(purchasesRef, {
      ...purchase,
      date: purchase.date ? Timestamp.fromDate(purchase.date) : Timestamp.now(),
      createdAt: Timestamp.now()
    });
    
    // Update inventory stock
    await this.updateInventoryStock(purchase.inventoryItemId, purchase.quantity);
    
    return docRef.id;
  }

  async getPurchases(): Promise<Purchase[]> {
    const purchasesRef = collection(this.firestore, 'purchases');
    const q = query(purchasesRef, orderBy('date', 'desc'));
    const snapshot = await this.inCtx(() => getDocs(q));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase));
  }

  async deletePurchase(id: string): Promise<void> {
    const purchaseDoc = doc(this.firestore, `purchases/${id}`);
    await deleteDoc(purchaseDoc);
  }

  // ============ SUPPLIERS ============
  async createSupplier(supplier: Supplier): Promise<string> {
    const suppliersRef = collection(this.firestore, 'suppliers');
    const docRef = await addDoc(suppliersRef, {
      ...supplier,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  }

  async getSuppliers(): Promise<Supplier[]> {
    const suppliersRef = collection(this.firestore, 'suppliers');
    const snapshot = await this.inCtx(() => getDocs(suppliersRef));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
  }

  // ============ ORDERS ============
  async createOrder(order: Order): Promise<string> {
    try {
      const ordersRef = collection(this.firestore, 'orders');
      
      // Convert Date objects to Timestamps and remove undefined fields
      const orderData: any = {
        orderNumber: order.orderNumber,
        isTakeaway: order.isTakeaway,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt ? Timestamp.fromDate(order.createdAt) : Timestamp.now(),
        cashierId: order.cashierId,
        cashierName: order.cashierName,
      };

      // Add optional fields only if they exist
      if (order.tableNumber) orderData.tableNumber = order.tableNumber;
      if (order.customerName) orderData.customerName = order.customerName;
      if (order.startedCookingAt) orderData.startedCookingAt = Timestamp.fromDate(order.startedCookingAt);
      if (order.readyAt) orderData.readyAt = Timestamp.fromDate(order.readyAt);
      if (order.completedAt) orderData.completedAt = Timestamp.fromDate(order.completedAt);
      
      const docRef = await addDoc(ordersRef, orderData);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async getMenuItem(id: string): Promise<MenuItem | null> {
    const itemDoc = doc(this.firestore, `menuItems/${id}`);
    const snapshot = await this.inCtx(() => getDoc(itemDoc));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as MenuItem : null;
  }

  async getOrders(status?: string): Promise<Order[]> {
    const ordersRef = collection(this.firestore, 'orders');
    let q;
    if (status) {
      // Avoid composite index requirement by skipping orderBy when filtering
      q = query(ordersRef, where('status', '==', status));
    } else {
      q = query(ordersRef, orderBy('createdAt', 'desc'));
    }
    const snapshot = await this.inCtx(() => getDocs(q));
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    // Sort locally by createdAt desc if status filter applied
    if (status) {
      orders.sort((a: any, b: any) => {
        const ad = (a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt) ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const bd = (b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt) ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return bd.getTime() - ad.getTime();
      });
    }
    return orders;
  }

  async updateOrder(id: string, order: Partial<Order>): Promise<void> {
    const orderDoc = doc(this.firestore, `orders/${id}`);
    await updateDoc(orderDoc, order);
  }

  async deleteOrder(id: string): Promise<void> {
    const orderDoc = doc(this.firestore, `orders/${id}`);
    await deleteDoc(orderDoc);
  }

  async getTodayOrders(): Promise<Order[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const ordersRef = collection(this.firestore, 'orders');
    const q = query(
      ordersRef,
      where('createdAt', '>=', Timestamp.fromDate(today)),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await this.inCtx(() => getDocs(q));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  }

  async getActiveOrderForTable(tableNumber: string): Promise<Order | null> {
    const ordersRef = collection(this.firestore, 'orders');
    const q = query(
      ordersRef,
      where('tableNumber', '==', tableNumber),
      where('status', 'in', ['pending', 'cooking', 'ready']),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snapshot = await this.inCtx(() => getDocs(q));
    
    if (snapshot.empty) {
      return null;
    }
    
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Order;
  }

  async getOrdersByTable(tableNumber: string): Promise<Order[]> {
    const ordersRef = collection(this.firestore, 'orders');
    const q = query(
      ordersRef,
      where('tableNumber', '==', tableNumber),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await this.inCtx(() => getDocs(q));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  }

  // ============ ACTIVITY LOGS ============
  async logActivity(log: ActivityLog): Promise<string> {
    const logsRef = collection(this.firestore, 'activityLogs');
    const docRef = await addDoc(logsRef, {
      ...log,
      timestamp: Timestamp.now()
    });
    return docRef.id;
  }

  async getRecentActivityLogs(limitCount: number = 10): Promise<ActivityLog[]> {
    const logsRef = collection(this.firestore, 'activityLogs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await this.inCtx(() => getDocs(q));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
  }

  // ============ REPORTS ============
  async getTodaySales(): Promise<number> {
    const orders = await this.getTodayOrders();
    return orders
      .filter(o => o.status === 'completed')
      .reduce((sum, order) => sum + order.totalAmount, 0);
  }

  async getTodayExpenses(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const purchasesRef = collection(this.firestore, 'purchases');
    const q = query(
      purchasesRef,
      where('createdAt', '>=', Timestamp.fromDate(today))
    );
    const snapshot = await this.inCtx(() => getDocs(q));
    const purchases = snapshot.docs.map(doc => doc.data() as Purchase);
    return purchases.reduce((sum, purchase) => sum + purchase.totalCost, 0);
  }

  async getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    const ordersRef = collection(this.firestore, 'orders');
    const q = query(
      ordersRef,
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await this.inCtx(() => getDocs(q));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  }

  async getPurchasesByDateRange(startDate: Date, endDate: Date): Promise<Purchase[]> {
    const purchasesRef = collection(this.firestore, 'purchases');
    const q = query(
      purchasesRef,
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
    const snapshot = await this.inCtx(() => getDocs(q));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase));
  }

  // ============ INVENTORY ADJUSTMENTS ============
  async createInventoryAdjustment(adjustment: InventoryAdjustment): Promise<string> {
    const adjustmentsRef = collection(this.firestore, 'inventoryAdjustments');
    const docRef = await addDoc(adjustmentsRef, {
      ...adjustment,
      createdAt: Timestamp.now()
    });

    // Update the inventory item stock
    const inventoryDoc = doc(this.firestore, `inventory/${adjustment.inventoryItemId}`);
    const inventorySnap = await this.inCtx(() => getDoc(inventoryDoc));
    if (inventorySnap.exists()) {
      const currentStock = inventorySnap.data()['currentStock'] || 0;
      await updateDoc(inventoryDoc, {
        currentStock: currentStock + adjustment.quantity
      });
    }

    return docRef.id;
  }

  async getInventoryAdjustments(): Promise<InventoryAdjustment[]> {
    const adjustmentsRef = collection(this.firestore, 'inventoryAdjustments');
    const q = query(adjustmentsRef, orderBy('date', 'desc'));
    const snapshot = await this.inCtx(() => getDocs(q));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryAdjustment));
  }

  async getAdjustmentsByItem(itemId: string): Promise<InventoryAdjustment[]> {
    const adjustmentsRef = collection(this.firestore, 'inventoryAdjustments');
    const q = query(
      adjustmentsRef,
      where('inventoryItemId', '==', itemId),
      orderBy('date', 'desc')
    );
    const snapshot = await this.inCtx(() => getDocs(q));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryAdjustment));
  }

  // ============ SETTINGS ============
  async getSettings(): Promise<AppSettings> {
    const settingsRef = collection(this.firestore, 'settings');
    const snapshot = await this.inCtx(() => getDocs(settingsRef));
    
    if (snapshot.empty) {
      // Return default settings
      return {
        currency: 'PKR',
        currencyPosition: 'before',
        dateFormat: 'MM/DD/YYYY',
        taxRate: 5,
        restaurantName: 'My Restaurant'
      };
    }
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as AppSettings;
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    const settingsRef = collection(this.firestore, 'settings');
    const snapshot = await this.inCtx(() => getDocs(settingsRef));
    
    if (snapshot.empty) {
      // Create new settings document
      await addDoc(settingsRef, {
        ...settings,
        createdAt: Timestamp.now()
      });
    } else {
      // Update existing settings
      const docId = snapshot.docs[0].id;
      const docRef = doc(this.firestore, `settings/${docId}`);
      await updateDoc(docRef, settings);
    }
  }
}
