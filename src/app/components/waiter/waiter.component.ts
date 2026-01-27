import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { MenuItem, Order, OrderItem, MenuCategory, Deal, Category } from '../../models/models';

// Table status type
type TableStatus = 'free' | 'occupied' | 'billRequested';
type FilterType = 'all' | 'free' | 'occupied' | 'billRequested';
type ScreenMode = 'floorMap' | 'tableDetail' | 'menuSelection' | 'cartReview';

interface TableInfo {
  number: string;
  status: TableStatus;
  activeOrder: Order | null;
  seatedTime: Date | null;
  guestCount: number;
}

@Component({
  selector: 'app-waiter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './waiter.component.html',
  styleUrl: './waiter.component.css'
})
export class WaiterComponent implements OnInit {
  isLoading: boolean = false;
  
  // Screen navigation
  currentScreen: ScreenMode = 'floorMap';
  
  // Floor map data
  tables: TableInfo[] = [];
  selectedFilter: FilterType = 'all';
  
  // Selected table context
  selectedTable: TableInfo | null = null;
  guestCount: number = 2;
  
  // Menu items
  menuItems: MenuItem[] = [];
  deals: Deal[] = [];
  searchText: string = '';
  selectedCategory: string = 'All';
  categories: Category[] = [];
  
  // Cart (draft items not yet sent to kitchen)
  draftCart: OrderItem[] = [];

  // Edit mode for existing (sent) order when status is 'pending'
  editMode: boolean = false;
  editableItems: OrderItem[] = [];
  
  // Item modifier modal
  showItemModifier: boolean = false;
  selectedMenuItem: MenuItem | null = null;
  modifierQuantity: number = 1;
  modifierNotes: string = '';
  
  // Expose Math to template
  Math = Math;
  
  constructor(private db: DatabaseService, public authService: AuthService) {}

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
    await this.loadMenuItems();
    await this.loadDeals();
    await this.loadAllTables();
    // Refresh table status every 30 seconds
    setInterval(() => this.loadAllTables(), 30000);
  }

  // ===== CATEGORY LOADING =====
  
  async loadCategories(): Promise<void> {
    try {
      this.categories = await this.db.getActiveCategories();
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  // ===== FLOOR MAP FUNCTIONS =====
  
  async loadAllTables(): Promise<void> {
    try {
      // Initialize 20 tables
      const tableNumbers = Array.from({ length: 20 }, (_, i) => String(i + 1));
      const allOrders = await this.db.getOrders();
      
      this.tables = tableNumbers.map(number => {
        // Find active order for this table
        const activeOrder = allOrders.find(
          o => o.tableNumber === number && ['pending', 'cooking', 'ready'].includes(o.status)
        );
        
        let status: TableStatus = 'free';
        if (activeOrder) {
          status = activeOrder.status === 'ready' ? 'billRequested' : 'occupied';
        }
        
        return {
          number,
          status,
          activeOrder: activeOrder || null,
          seatedTime: activeOrder?.createdAt || null,
          guestCount: 0
        };
      });
    } catch (err) {
      console.error('Failed to load tables:', err);
    }
  }

  get filteredTables(): TableInfo[] {
    if (this.selectedFilter === 'all') return this.tables;
    return this.tables.filter(t => t.status === this.selectedFilter);
  }

  setFilter(filter: FilterType): void {
    this.selectedFilter = filter;
  }

  getTimeSinceSeated(table: TableInfo): string {
    if (!table.seatedTime) return '';
    const now = new Date();
    let seated: Date;
    if (table.seatedTime instanceof Date) {
      seated = table.seatedTime;
    } else if (typeof table.seatedTime === 'object' && 'toDate' in table.seatedTime) {
      seated = (table.seatedTime as any).toDate();
    } else {
      seated = new Date(table.seatedTime as any);
    }
    const diffMs = now.getTime() - seated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m ago`;
  }

  // ===== TABLE SELECTION =====
  
  selectTable(table: TableInfo): void {
    this.selectedTable = table;
    this.draftCart = [];
    this.editMode = false;
    this.editableItems = [];
    
    if (table.status === 'free') {
      // New order - go directly to menu selection
      this.guestCount = 2;
      this.currentScreen = 'menuSelection';
    } else {
      // Existing order - show table detail
      this.currentScreen = 'tableDetail';
    }
  }

  backToFloorMap(): void {
    this.currentScreen = 'floorMap';
    this.selectedTable = null;
    this.draftCart = [];
    this.editMode = false;
    this.editableItems = [];
    this.loadAllTables();
  }

  // ===== MENU SELECTION FUNCTIONS =====
  
  async loadMenuItems(): Promise<void> {
    this.isLoading = true;
    try {
      this.menuItems = await this.db.getActiveMenuItems();
    } catch (err) {
      console.error('Failed to load menu items', err);
    } finally {
      this.isLoading = false;
    }
  }

  async loadDeals(): Promise<void> {
    try {
      this.deals = await this.db.getActiveDeals();
    } catch (err) {
      console.error('Failed to load deals', err);
    }
  }

  get filteredMenu(): MenuItem[] {
    // Don't show menu items when Deals category is selected
    if (this.selectedCategory === 'Deals') return [];
    
    const text = this.searchText.toLowerCase();
    let filtered = this.menuItems;
    
    if (this.selectedCategory !== 'All') {
      filtered = filtered.filter(m => m.category === this.selectedCategory);
    }
    
    if (text) {
      filtered = filtered.filter(m => m.name.toLowerCase().includes(text));
    }
    
    return filtered;
  }

  get filteredDeals(): Deal[] {
    if (this.selectedCategory !== 'Deals') return [];
    
    const text = this.searchText.toLowerCase();
    if (!text) return this.deals;
    
    return this.deals.filter(d => d.name.toLowerCase().includes(text));
  }

  // Highlight selected menu items in the menu grid
  isItemSelected(item: MenuItem): boolean {
    if (!item.id) return false;
    return this.draftCart.some(i => i.menuItemId === item.id);
  }

  // Get already selected quantity for a menu item (sum across draft cart entries)
  getSelectedQuantityForItem(item: MenuItem): number {
    if (!item.id) return 0;
    return this.draftCart
      .filter(i => i.menuItemId === item.id)
      .reduce((sum, i) => sum + i.quantity, 0);
  }

  openItemModifier(item: MenuItem): void {
    this.selectedMenuItem = item;
    const existingQty = this.getSelectedQuantityForItem(item);
    this.modifierQuantity = existingQty > 0 ? existingQty : (item.soldByWeight ? 0.5 : 1);
    this.modifierNotes = '';
    this.showItemModifier = true;
  }

  formatQuantity(qty: number): void {
    // Round to 2 decimal places
    this.modifierQuantity = Math.round(qty * 100) / 100;
  }

  addDealToCart(deal: Deal): void {
    if (!deal.id) return;
    
    // Create order item for the deal
    const orderItem: OrderItem = {
      menuItemId: deal.id,
      menuItemName: deal.name,
      quantity: 1,
      price: deal.dealPrice,
      totalPrice: deal.dealPrice,
      isDeal: true,
      dealId: deal.id,
      dealItems: deal.items
    };
    
    this.draftCart.push(orderItem);
    alert(`✅ ${deal.name} added to cart`);
  }

  closeItemModifier(): void {
    this.showItemModifier = false;
    this.selectedMenuItem = null;
    this.modifierNotes = '';
  }

  addItemToCart(): void {
    if (!this.selectedMenuItem) return;
    
    const item = this.selectedMenuItem;
    const orderItem: OrderItem = {
      menuItemId: item.id!,
      menuItemName: item.name,
      quantity: this.modifierQuantity,
      price: item.price,
      totalPrice: this.modifierQuantity * item.price
    };
    
    // Only add notes if they exist
    if (this.modifierNotes && this.modifierNotes.trim() !== '') {
      orderItem.notes = this.modifierNotes.trim();
    }
    
    // Check if item already exists in draft cart
    const existing = this.draftCart.find(i => i.menuItemId === item.id && i.notes === orderItem.notes);
    if (existing) {
      // Replace existing quantity with the new selected amount
      existing.quantity = this.modifierQuantity;
      existing.totalPrice = existing.quantity * existing.price;
    } else {
      this.draftCart.push(orderItem);
    }
    
    this.closeItemModifier();
  }

  goToAddItems(): void {
    this.currentScreen = 'menuSelection';
  }

  viewCart(): void {
    if (this.draftCart.length > 0) {
      this.currentScreen = 'cartReview';
    }
  }

  // ===== CART REVIEW FUNCTIONS =====
  
  removeDraftItem(item: OrderItem): void {
    this.draftCart = this.draftCart.filter(i => i !== item);
  }

  updateDraftQuantity(item: OrderItem, qty: number): void {
    item.quantity = Math.max(0.1, qty);
    item.totalPrice = item.quantity * item.price;
  }

  getDraftSubtotal(): number {
    return this.draftCart.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  getTotalOrderAmount(): number {
    const currentTotal = this.selectedTable?.activeOrder?.totalAmount || 0;
    return currentTotal + this.getDraftSubtotal();
  }

  backToMenu(): void {
    this.currentScreen = 'menuSelection';
  }

  // ===== TAKEAWAY FLOW =====
  startTakeaway(): void {
    // Create a pseudo table context to reuse flows
    this.selectedTable = {
      number: 'TAKEAWAY',
      status: 'free',
      activeOrder: null,
      seatedTime: null,
      guestCount: 0
    };
    this.draftCart = [];
    this.currentScreen = 'menuSelection';
  }

  // ===== SEND TO KITCHEN =====
  
  async confirmAndSendToKitchen(): Promise<void> {
    if (!this.selectedTable || this.draftCart.length === 0) return;
    
    this.isLoading = true;
    try {
      if (this.selectedTable.activeOrder?.id) {
        // ADD-ON: Update existing order by appending new items
        const currentItems = this.selectedTable.activeOrder.items || [];
        const updatedItems = [...currentItems, ...this.draftCart];
        const newSubtotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
        
        await this.db.updateOrder(this.selectedTable.activeOrder.id, {
          items: updatedItems,
          subtotal: newSubtotal,
          totalAmount: newSubtotal
        });
        
        alert('✅ Add-on items sent to kitchen!');
      } else {
        // NEW ORDER: Create fresh order
        const isTakeaway = this.selectedTable.number === 'TAKEAWAY';
        const order: Order = {
          orderNumber: `ORD-${Date.now()}`,
          tableNumber: isTakeaway ? undefined : this.selectedTable.number,
          isTakeaway: isTakeaway,
          items: [...this.draftCart],
          subtotal: this.getDraftSubtotal(),
          tax: 0,
          discount: 0,
          totalAmount: this.getDraftSubtotal(),
          status: isTakeaway ? 'ready' : 'pending',
          createdAt: new Date(),
          cashierId: this.authService.currentUser?.id || '',
          cashierName: this.authService.currentUser?.name || 'Waiter'
        };
        
        await this.db.createOrder(order);
        alert('✅ Order sent to kitchen!');
      }
      
      // Clear draft and reload tables
      this.draftCart = [];
      await this.loadAllTables();
      this.backToFloorMap();
      
    } catch (err) {
      console.error('Failed to send order:', err);
      alert('❌ Failed to send order to kitchen');
    } finally {
      this.isLoading = false;
    }
  }

  // ===== TABLE DETAIL FUNCTIONS =====
  
  async requestBill(): Promise<void> {
    if (!this.selectedTable?.activeOrder?.id) return;
    
    if (!confirm('Mark this table as ready for bill?')) return;
    
    try {
      await this.db.updateOrder(this.selectedTable.activeOrder.id, {
        status: 'ready'
      });
      
      alert('✅ Bill request sent to cashier');
      this.backToFloorMap();
    } catch (err) {
      console.error('Failed to request bill:', err);
      alert('❌ Failed to request bill');
    }
  }

  // ===== EDIT EXISTING ORDER (only when status is 'pending') =====
  canEditOrder(): boolean {
    return !!(this.selectedTable?.activeOrder && this.selectedTable.activeOrder.status === 'pending');
  }

  startEditOrder(): void {
    if (!this.canEditOrder()) return;
    // Deep copy items for safe editing
    const items = this.selectedTable!.activeOrder!.items || [];
    this.editableItems = items.map(i => ({ ...i }));
    this.editMode = true;
  }

  cancelEditOrder(): void {
    this.editMode = false;
    this.editableItems = [];
  }

  updateEditableQuantity(item: OrderItem, qty: number): void {
    item.quantity = Math.max(0.1, qty);
    item.totalPrice = item.quantity * item.price;
  }

  removeEditableItem(item: OrderItem): void {
    this.editableItems = this.editableItems.filter(i => i !== item);
  }

  getEditableSubtotal(): number {
    return this.editableItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  async saveOrderEdits(): Promise<void> {
    if (!this.selectedTable?.activeOrder?.id) return;
    this.isLoading = true;
    try {
      const newSubtotal = this.getEditableSubtotal();
      await this.db.updateOrder(this.selectedTable.activeOrder.id, {
        items: this.editableItems,
        subtotal: newSubtotal,
        totalAmount: newSubtotal
      });
      await this.db.logActivity({
        userId: this.authService.currentUser?.id || '',
        userName: this.authService.currentUser?.name || 'Waiter',
        action: 'Edited Order',
        details: `Table ${this.selectedTable.number} | Items: ${this.editableItems.length} | Total: ${newSubtotal.toFixed(0)} PKR`,
        timestamp: new Date()
      });
      alert('✅ Order updated successfully');
      this.editMode = false;
      this.editableItems = [];
      await this.loadAllTables();
      // Keep on table detail to view updated items
      const updated = this.tables.find(t => t.number === this.selectedTable!.number);
      if (updated) this.selectedTable = updated;
    } catch (err) {
      console.error('Failed to update order:', err);
      alert('❌ Failed to update order');
    } finally {
      this.isLoading = false;
    }
  }

  // ===== CANCEL ORDER (Waiter, allowed when status is 'pending') =====
  async cancelOrderWithReason(): Promise<void> {
    if (!this.selectedTable?.activeOrder?.id) return;
    const status = this.selectedTable.activeOrder.status;
    if (status !== 'pending') {
      alert('Only pending orders can be cancelled by the waiter.');
      return;
    }
    const reason = window.prompt('Reason for cancellation (optional):', 'Customer changed mind');
    if (!confirm('Cancel this order and free the table?')) return;
    this.isLoading = true;
    try {
      await this.db.updateOrder(this.selectedTable.activeOrder.id, { status: 'cancelled' });
      await this.db.logActivity({
        userId: this.authService.currentUser?.id || '',
        userName: this.authService.currentUser?.name || 'Waiter',
        action: 'Cancelled Order',
        details: `Table ${this.selectedTable.number} | Reason: ${reason || 'N/A'}`,
        timestamp: new Date()
      });
      alert('✅ Order cancelled and table cleared');
      this.backToFloorMap();
    } catch (err) {
      console.error('Failed to cancel order:', err);
      alert('❌ Failed to cancel order');
    } finally {
      this.isLoading = false;
    }
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return '#ff9800';
      case 'cooking': return '#2196f3';
      case 'ready': return '#4caf50';
      case 'completed': return '#9e9e9e';
      case 'cancelled': return '#f44336';
      default: return '#9e9e9e';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'cooking': return 'Cooking';
      case 'ready': return 'Ready';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }
}
