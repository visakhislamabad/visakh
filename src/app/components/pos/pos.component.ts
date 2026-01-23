import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { MenuItem, OrderItem, Order, MenuCategory, Deal } from '../../models/models';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.css'
})
export class PosComponent implements OnInit {
  menuItems: MenuItem[] = [];
  filteredMenuItems: MenuItem[] = [];
  deals: Deal[] = [];
  activeDeals: Deal[] = [];
  cart: OrderItem[] = [];
  // Bill requests from waiter (orders marked 'ready')
  readyOrders: Order[] = [];
  selectedBillOrder: Order | null = null;
  paymentMethod: 'cash' | 'card' | 'wallet' | 'split' = 'cash';
  tenderedAmount: number = 0;
  refreshTimer?: any;
  private previousReadyIds: Set<string> = new Set();
  private newRequestIds: Set<string> = new Set();
  soundEnabled: boolean = true;
  private audioChime?: HTMLAudioElement;
  isRefreshing: boolean = false;
  
  // Order details
  tableNumber: string = '';
  isTakeaway: boolean = true;
  customerName: string = '';
  discount: number = 0;
  // Available tables for dine-in selection
  availableTables: string[] = [];
  
  // Filters
  selectedCategory: MenuCategory | 'all' = 'all';
  searchText: string = '';
  categories: (MenuCategory | 'all')[] = ['all', 'BBQ', 'Curries', 'Rice', 'Bread', 'Salads', 'Drinks', 'Desserts'];
  
  isLoading: boolean = false;

  constructor(
    private db: DatabaseService,
    public authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadMenuItems();
    await this.loadDeals();
    await this.loadReadyOrders();
    await this.loadAvailableTables();
    this.initAudio();
    // restore sound preference
    const stored = localStorage.getItem('posSoundEnabled');
    if (stored !== null) this.soundEnabled = stored === 'true';
    // Refresh bill requests periodically
    this.refreshTimer = setInterval(() => {
      this.loadReadyOrders();
    }, 30000);
  }

  async loadMenuItems(): Promise<void> {
    this.isLoading = true;
    try {
      this.menuItems = await this.db.getActiveMenuItems();
      this.applyFilters();
    } catch (error) {
      console.error('Error loading menu items:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadDeals(): Promise<void> {
    try {
      this.deals = await this.db.getActiveDeals();
      this.activeDeals = this.deals;
    } catch (error) {
      console.error('Error loading deals:', error);
    }
  }

  async loadReadyOrders(): Promise<void> {
    this.isRefreshing = true;
    try {
      const orders = await this.db.getOrders('ready');
      this.readyOrders = orders;

      // Detect new requests
      const currentIds = new Set<string>(orders.map(o => o.id!).filter(Boolean));
      const newlyArrived: string[] = [];
      for (const id of currentIds) {
        if (!this.previousReadyIds.has(id)) newlyArrived.push(id);
      }
      if (newlyArrived.length > 0) {
        this.playNotificationSound();
        newlyArrived.forEach(id => {
          this.newRequestIds.add(id);
          setTimeout(() => this.newRequestIds.delete(id), 10000);
        });
      }
      this.previousReadyIds = currentIds;
    } catch (error) {
      console.error('Error loading bill requests:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  openSettlement(order: Order): void {
    this.selectedBillOrder = order;
    this.paymentMethod = 'cash';
    this.tenderedAmount = 0;
  }

  cancelSettlement(): void {
    this.selectedBillOrder = null;
    this.tenderedAmount = 0;
  }

  getSelectedBillTotal(): number {
    return this.selectedBillOrder?.totalAmount || 0;
  }

  getChange(): number {
    if (this.paymentMethod !== 'cash') return 0;
    const due = this.getSelectedBillTotal();
    return Math.max(0, this.tenderedAmount - due);
  }

  isNewRequest(id?: string): boolean {
    if (!id) return false;
    return this.newRequestIds.has(id);
  }

  timeSince(date: any): string {
    if (!date) return '';
    const d: Date = (typeof date === 'object' && 'toDate' in date) ? (date as any).toDate() : new Date(date);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs} hr${hrs !== 1 ? 's' : ''} ago`;
  }

  playNotificationSound(): void {
    if (!this.soundEnabled) return;
    // Try audio chime first
    if (this.audioChime) {
      this.audioChime.currentTime = 0;
      this.audioChime.play().catch(() => this.playBeep());
      return;
    }
    this.playBeep();
  }

  private initAudio(): void {
    try {
      this.audioChime = new Audio('/sounds/notify.mp3');
      this.audioChime.volume = 0.4;
      this.audioChime.load();
    } catch {
      this.audioChime = undefined;
    }
  }

  private playBeep(): void {
    try {
      const ctx = new (window as any).AudioContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(920, ctx.currentTime);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.28);
    } catch {}
  }

  toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('posSoundEnabled', String(this.soundEnabled));
  }

  viewSelectedBillDetail(): void {
    if (!this.selectedBillOrder) return;
    const o = this.selectedBillOrder;
    const created: Date = (o.createdAt && typeof o.createdAt === 'object' && 'toDate' in o.createdAt)
      ? (o.createdAt as any).toDate()
      : new Date(o.createdAt as any);
    const rows = (o.items || []).map(i =>
      `<tr><td>${i.menuItemName}</td><td>${i.quantity}</td><td>${i.price.toFixed(0)} PKR</td><td>${i.totalPrice.toFixed(0)} PKR</td></tr>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Order ${o.orderNumber}</title>
      <style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;padding:20px;color:#333}
      h1{font-size:20px;margin:0 0 10px} p{margin:4px 0}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{padding:8px;border-bottom:1px solid #eee;text-align:left}
      .total{font-weight:700;margin-top:12px}
      </style></head><body>
      <h1>Order ${o.orderNumber}</h1>
      <p>Table: ${o.tableNumber ?? '-'}</p>
      <p>Status: ${o.status}</p>
      <p>Created: ${created.toLocaleString()}</p>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
      <p class=\"total\">Grand Total: ${o.totalAmount.toFixed(0)} PKR</p>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
    }
  }

  async completeSettlement(): Promise<void> {
    if (!this.selectedBillOrder?.id) return;
    this.isLoading = true;
    try {
      // Deduct inventory for order items
      await this.deductInventoryForOrder(this.selectedBillOrder);
      
      // Mark order completed
      await this.db.updateOrder(this.selectedBillOrder.id, { status: 'completed' });
      
      // Refresh lists and clear selection
      await this.loadReadyOrders();
      this.selectedBillOrder = null;
      this.tenderedAmount = 0;
      alert('✅ Payment completed. Table reset to free.');
    } catch (error) {
      console.error('Error completing settlement:', error);
      alert('❌ Failed to complete payment');
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters(): void {
    this.filteredMenuItems = this.menuItems.filter(item => {
      const matchesCategory = this.selectedCategory === 'all' || item.category === this.selectedCategory;
      const matchesSearch = !this.searchText || 
        item.name.toLowerCase().includes(this.searchText.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }

  onCategoryChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  // Load available tables (free: no active orders with pending/cooking/ready)
  async loadAvailableTables(): Promise<void> {
    try {
      const tableNumbers = Array.from({ length: 20 }, (_, i) => String(i + 1));
      const allOrders = await this.db.getOrders();
      const occupied = new Set<string>(
        (allOrders || [])
          .filter(o => !!o.tableNumber && ['pending', 'cooking', 'ready'].includes(o.status))
          .map(o => o.tableNumber as string)
      );
      this.availableTables = tableNumbers.filter(t => !occupied.has(t));
    } catch (error) {
      console.error('Error loading available tables:', error);
      this.availableTables = [];
    }
  }

  addToCart(menuItem: MenuItem): void {
    const existingItem = this.cart.find(item => item.menuItemId === menuItem.id);
    
    if (existingItem) {
      // For weight-based items, prompt for quantity
      if (menuItem.soldByWeight) {
        this.promptForWeight(menuItem, existingItem);
      } else {
        existingItem.quantity++;
        existingItem.totalPrice = existingItem.quantity * existingItem.price;
      }
    } else {
      // For weight-based items, prompt for quantity
      if (menuItem.soldByWeight) {
        this.promptForWeight(menuItem);
      } else {
        this.cart.push({
          menuItemId: menuItem.id!,
          menuItemName: menuItem.name,
          quantity: 1,
          price: menuItem.price,
          totalPrice: menuItem.price
        });
      }
    }
  }

  addDealToCart(deal: Deal): void {
    const existingDeal = this.cart.find(item => item.dealId === deal.id && item.isDeal);
    
    if (existingDeal) {
      existingDeal.quantity++;
      existingDeal.totalPrice = existingDeal.quantity * existingDeal.price;
    } else {
      this.cart.push({
        menuItemId: deal.id!,
        menuItemName: deal.name,
        quantity: 1,
        price: deal.dealPrice,
        totalPrice: deal.dealPrice,
        isDeal: true,
        dealId: deal.id,
        dealItems: deal.items
      });
    }
  }

  promptForWeight(menuItem: MenuItem, existingItem?: OrderItem): void {
    const weight = prompt(`Enter weight in ${menuItem.unit || 'kg'} (e.g., 0.72):`);
    if (weight && !isNaN(parseFloat(weight))) {
      const quantity = parseFloat(weight);
      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.totalPrice = existingItem.quantity * existingItem.price;
      } else {
        this.cart.push({
          menuItemId: menuItem.id!,
          menuItemName: `${menuItem.name} (${quantity} ${menuItem.unit || 'kg'})`,
          quantity: quantity,
          price: menuItem.price,
          totalPrice: quantity * menuItem.price
        });
      }
    }
  }

  increaseQuantity(item: OrderItem): void {
    item.quantity++;
    item.totalPrice = item.quantity * item.price;
  }

  decreaseQuantity(item: OrderItem): void {
    if (item.quantity > 1) {
      item.quantity--;
      item.totalPrice = item.quantity * item.price;
    } else {
      this.removeFromCart(item);
    }
  }

  removeFromCart(item: OrderItem): void {
    const index = this.cart.indexOf(item);
    if (index > -1) {
      this.cart.splice(index, 1);
    }
  }

  getSubtotal(): number {
    return this.cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  getTax(): number {
    // Calculate average tax rate from items
    let totalTax = 0;
    for (const cartItem of this.cart) {
      const menuItem = this.menuItems.find(m => m.id === cartItem.menuItemId);
      if (menuItem) {
        totalTax += (cartItem.totalPrice * menuItem.taxRate) / 100;
      }
    }
    return totalTax;
  }

  getTotal(): number {
    return this.getSubtotal() + this.getTax() - this.discount;
  }

  async printKOT(): Promise<void> {
    if (this.cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    if (!this.isTakeaway && !this.tableNumber) {
      alert('Please select an available table');
      return;
    }

    this.isLoading = true;
    try {
      const order = this.createOrder('pending');
      await this.db.createOrder(order);
      alert('Kitchen Order Ticket sent to kitchen!');
      // Don't clear cart yet - only clear after payment
    } catch (error) {
      console.error('Error sending KOT:', error);
      alert('Error sending order to kitchen');
    } finally {
      this.isLoading = false;
    }
  }

  async payAndPrint(): Promise<void> {
    if (this.cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    if (!this.isTakeaway && !this.tableNumber) {
      alert('Please select an available table or choose takeaway');
      return;
    }

    this.isLoading = true;
    try {
      const order = this.createOrder('completed');
      await this.db.createOrder(order);
      
      // Deduct prepared items from inventory if linked
      await this.deductPreparedItems();
      
      alert(`Payment successful! Total: $${this.getTotal().toFixed(2)}`);
      this.clearCart();
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error processing payment');
    } finally {
      this.isLoading = false;
    }
  }

  async deductPreparedItems(): Promise<void> {
    for (const cartItem of this.cart) {
      const menuItem = this.menuItems.find(m => m.id === cartItem.menuItemId);
      if (!menuItem) continue;

      // Handle prepared items linked directly
      if (menuItem.preparedItemId) {
        const adjustment = {
          inventoryItemId: menuItem.preparedItemId,
          inventoryItemName: menuItem.name,
          adjustmentType: 'consumption' as const,
          quantity: -cartItem.quantity,
          unit: menuItem.unit || 'pieces',
          reason: `Sold via POS - Order`,
          adjustedBy: this.authService.currentUser?.name || 'System',
          date: new Date()
        };
        
        try {
          await this.db.createInventoryAdjustment(adjustment);
        } catch (error) {
          console.error('Error deducting prepared inventory:', error);
        }
      }

      // Handle recipe-mapped items (e.g., fish, vegetables, etc.)
      if (menuItem.recipeMapping && menuItem.recipeMapping.length > 0) {
        for (const recipe of menuItem.recipeMapping) {
          const totalQuantity = recipe.quantityUsed * cartItem.quantity;
          const adjustment = {
            inventoryItemId: recipe.inventoryItemId,
            inventoryItemName: recipe.inventoryItemName,
            adjustmentType: 'consumption' as const,
            quantity: -totalQuantity,
            unit: recipe.unit,
            reason: `Sold ${cartItem.quantity}x ${menuItem.name} via POS`,
            adjustedBy: this.authService.currentUser?.name || 'System',
            date: new Date()
          };
          
          try {
            await this.db.createInventoryAdjustment(adjustment);
          } catch (error) {
            console.error('Error deducting recipe inventory:', error);
          }
        }
      }
    }
  }

  async deductInventoryForOrder(order: Order): Promise<void> {
    for (const orderItem of order.items || []) {
      // If this is a deal, deduct inventory for each item inside the deal
      if (orderItem.isDeal && orderItem.dealItems) {
        for (const dealItem of orderItem.dealItems) {
          const menuItem = this.menuItems.find(m => m.id === dealItem.menuItemId);
          if (!menuItem) continue;
          
          // Multiply by order item quantity (e.g., 2x Family Deal)
          const totalDealItemQty = dealItem.quantity * orderItem.quantity;
          
          await this.deductInventoryForMenuItem(menuItem, totalDealItemQty, order.orderNumber);
        }
      } else {
        // Regular menu item
        const menuItem = this.menuItems.find(m => m.id === orderItem.menuItemId);
        if (!menuItem) continue;
        
        await this.deductInventoryForMenuItem(menuItem, orderItem.quantity, order.orderNumber);
      }
    }
  }

  async deductInventoryForMenuItem(menuItem: MenuItem, quantity: number, orderNumber: string): Promise<void> {
    // Handle prepared items linked directly
    if (menuItem.preparedItemId) {
      const adjustment = {
        inventoryItemId: menuItem.preparedItemId,
        inventoryItemName: menuItem.name,
        adjustmentType: 'consumption' as const,
        quantity: -quantity,
        unit: menuItem.unit || 'pieces',
        reason: `Sold - Order ${orderNumber}`,
        adjustedBy: this.authService.currentUser?.name || 'System',
        date: new Date()
      };
      
      try {
        await this.db.createInventoryAdjustment(adjustment);
      } catch (error) {
        console.error('Error deducting prepared inventory:', error);
      }
    }

    // Handle recipe-mapped items (e.g., fish, vegetables, etc.)
    if (menuItem.recipeMapping && menuItem.recipeMapping.length > 0) {
      for (const recipe of menuItem.recipeMapping) {
        const totalQuantity = recipe.quantityUsed * quantity;
        const adjustment = {
          inventoryItemId: recipe.inventoryItemId,
          inventoryItemName: recipe.inventoryItemName,
          adjustmentType: 'consumption' as const,
          quantity: -totalQuantity,
          unit: recipe.unit,
          reason: `Sold ${quantity}x ${menuItem.name} - Order ${orderNumber}`,
          adjustedBy: this.authService.currentUser?.name || 'System',
          date: new Date()
        };
        
        try {
          await this.db.createInventoryAdjustment(adjustment);
        } catch (error) {
          console.error('Error deducting recipe inventory:', error);
        }
      }
    }
  }

  createOrder(status: 'pending' | 'completed'): Order {
    const orderNumber = `ORD-${Date.now()}`;
    
    return {
      orderNumber,
      tableNumber: this.isTakeaway ? undefined : this.tableNumber,
      isTakeaway: this.isTakeaway,
      customerName: this.customerName || undefined,
      items: [...this.cart],
      subtotal: this.getSubtotal(),
      tax: this.getTax(),
      discount: this.discount,
      totalAmount: this.getTotal(),
      status,
      createdAt: new Date(),
      cashierId: this.authService.currentUser?.id || '',
      cashierName: this.authService.currentUser?.name || 'Unknown'
    };
  }

  clearCart(): void {
    this.cart = [];
    this.tableNumber = '';
    this.isTakeaway = false;
    this.customerName = '';
    this.discount = 0;
  }

  cancelOrder(): void {
    if (confirm('Are you sure you want to cancel this order?')) {
      this.clearCart();
    }
  }
}
