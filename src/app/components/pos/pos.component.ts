import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { MenuItem, OrderItem, Order, MenuCategory, Deal, DiscountType, CreditCustomer, Category } from '../../models/models';

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
  paymentMethod: 'cash' | 'bank_transfer' = 'cash'; // Payment method selection
  tenderedAmount: number = 0;
  refreshTimer?: any;
  private previousReadyIds: Set<string> = new Set();
  private newRequestIds: Set<string> = new Set();
  soundEnabled: boolean = true;
  private audioChime?: HTMLAudioElement;
  isRefreshing: boolean = false;
  // Discount editing for bill settlements
  isEditingDiscount: boolean = false;
  editDiscountType: DiscountType = 'fixed';
  editDiscountValue: number = 0;
  
  // Credit customer selection
  creditCustomers: CreditCustomer[] = [];
  selectedCreditCustomer: CreditCustomer | null = null;
  showCreditCustomerSelection: boolean = false;
  creditCustomerSearchText: string = '';
  filteredCreditCustomers: CreditCustomer[] = [];
  
  // Order details
  tableNumber: string = '';
  isTakeaway: boolean = true;
  customerName: string = '';
  discount: number = 0;
  // Available tables for dine-in selection
  availableTables: string[] = [];
  
  // Filters
  selectedCategory: string = 'all';
  searchText: string = '';
  categories: Category[] = [];
  
  isLoading: boolean = false;
  
  // Bill Preview Modal
  showBillPreviewModal: boolean = false;
  previewOrder: Order | null = null;

  constructor(
    private db: DatabaseService,
    public authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
    await this.loadMenuItems();
    await this.loadDeals();
    await this.loadReadyOrders();
    await this.loadAvailableTables();
    await this.loadCreditCustomers();
    this.initAudio();
    // restore sound preference
    const stored = localStorage.getItem('posSoundEnabled');
    if (stored !== null) this.soundEnabled = stored === 'true';
    // Refresh bill requests periodically
    this.refreshTimer = setInterval(() => {
      this.loadReadyOrders();
    }, 30000);
  }

  async loadCategories(): Promise<void> {
    try {
      this.categories = await this.db.getActiveCategories();
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async loadMenuItems(): Promise<void> {
    this.isLoading = true;
    try {
      this.menuItems = await this.db.getActiveMenuItems();
      // Sort menu items by category, then by name
      this.menuItems.sort((a, b) => {
        if (a.category === b.category) {
          return a.name.localeCompare(b.name);
        }
        return a.category.localeCompare(b.category);
      });
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
      // Sort deals alphabetically by name
      this.deals.sort((a, b) => a.name.localeCompare(b.name));
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

  startEditingDiscount(): void {
    if (!this.selectedBillOrder) return;
    this.isEditingDiscount = true;
    // Initialize with current discount values
    this.editDiscountType = this.selectedBillOrder.discountType || 'fixed';
    this.editDiscountValue = this.selectedBillOrder.discountValue || 0;
  }

  cancelEditingDiscount(): void {
    this.isEditingDiscount = false;
    this.editDiscountValue = 0;
  }

  calculateDiscountAmount(subtotal: number, discountType: DiscountType, discountValue: number): number {
    if (discountType === 'percentage') {
      return (subtotal * discountValue) / 100;
    }
    return discountValue;
  }

  getEditedBillTotal(): number {
    if (!this.selectedBillOrder) return 0;
    const subtotal = this.selectedBillOrder.subtotal;
    const tax = this.selectedBillOrder.tax;
    const discountAmount = this.calculateDiscountAmount(subtotal, this.editDiscountType, this.editDiscountValue);
    return subtotal + tax - discountAmount;
  }

  async applyDiscount(): Promise<void> {
    if (!this.selectedBillOrder?.id) return;
    
    // Validate discount value
    if (this.editDiscountValue < 0) {
      alert('❌ Discount cannot be negative');
      return;
    }

    if (this.editDiscountType === 'percentage' && this.editDiscountValue > 100) {
      alert('❌ Percentage discount cannot exceed 100%');
      return;
    }

    this.isLoading = true;
    try {
      const subtotal = this.selectedBillOrder.subtotal;
      const discountAmount = this.calculateDiscountAmount(subtotal, this.editDiscountType, this.editDiscountValue);
      const newTotal = this.getEditedBillTotal();

      // Update order with new discount
      await this.db.updateOrder(this.selectedBillOrder.id, {
        discount: discountAmount,
        discountType: this.editDiscountType,
        discountValue: this.editDiscountValue,
        totalAmount: newTotal
      });

      // Update local order object
      this.selectedBillOrder.discount = discountAmount;
      this.selectedBillOrder.discountType = this.editDiscountType;
      this.selectedBillOrder.discountValue = this.editDiscountValue;
      this.selectedBillOrder.totalAmount = newTotal;

      // Reload orders to sync
      await this.loadReadyOrders();
      
      this.isEditingDiscount = false;
      alert('✅ Discount applied successfully');
    } catch (error) {
      console.error('Error applying discount:', error);
      alert('❌ Failed to apply discount');
    } finally {
      this.isLoading = false;
    }
  }

  async completeSettlement(): Promise<void> {
    if (!this.selectedBillOrder?.id) return;
    
    // Pass reference directly and add payment method
    this.selectedBillOrder.paymentMethod = this.paymentMethod;
    
    // Pre-convert Firestore Timestamp to Date if needed
    if (this.selectedBillOrder.createdAt && typeof this.selectedBillOrder.createdAt === 'object' && 'toDate' in this.selectedBillOrder.createdAt) {
      this.selectedBillOrder.createdAt = (this.selectedBillOrder.createdAt as any).toDate();
    }
    
    this.previewOrder = this.selectedBillOrder;
    
    // Show bill preview modal
    this.showBillPreviewModal = true;
  }
  
  async printAndCompleteSettlement(): Promise<void> {
    if (!this.previewOrder?.id) return;
    
    this.isLoading = true;
    try {
      // Deduct inventory for order items
      await this.deductInventoryForOrder(this.previewOrder);
      
      // Mark order completed with payment method
      await this.db.updateOrder(this.previewOrder.id, { 
        status: 'completed',
        paymentMethod: this.previewOrder.paymentMethod,
        completedAt: new Date()
      });
      
      // Print the bill
      this.printThermalBill(this.previewOrder);
      
      // Close modal and refresh lists
      this.closeBillPreview();
      await this.loadReadyOrders();
      this.selectedBillOrder = null;
      this.tenderedAmount = 0;
      this.paymentMethod = 'cash'; // Reset to default
      this.isEditingDiscount = false;
      
      alert(`✅ Payment completed! Total: ${this.previewOrder.totalAmount.toFixed(0)} PKR\nBill sent to printer.\nTable reset to free.`);
    } catch (error) {
      console.error('Error completing settlement:', error);
      alert('❌ Failed to complete payment');
    } finally {
      this.isLoading = false;
    }
  }
  
  async completeSettlementWithoutPrint(): Promise<void> {
    if (!this.previewOrder?.id) return;
    
    this.isLoading = true;
    try {
      // Deduct inventory for order items
      await this.deductInventoryForOrder(this.previewOrder);
      
      // Mark order completed with payment method
      await this.db.updateOrder(this.previewOrder.id, { 
        status: 'completed',
        paymentMethod: this.previewOrder.paymentMethod,
        completedAt: new Date()
      });
      
      // Close modal and refresh lists
      this.closeBillPreview();
      await this.loadReadyOrders();
      this.selectedBillOrder = null;
      this.tenderedAmount = 0;
      this.paymentMethod = 'cash'; // Reset to default
      this.isEditingDiscount = false;
      
      alert(`✅ Payment completed! Total: ${this.previewOrder.totalAmount.toFixed(0)} PKR\nTable reset to free.`);
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

    // Create preview order but don't save yet
    this.previewOrder = this.createOrder('completed');
    this.previewOrder.paymentMethod = this.paymentMethod;
    
    // Show bill preview modal
    this.showBillPreviewModal = true;
  }
  
  closeBillPreview(): void {
    this.showBillPreviewModal = false;
    this.previewOrder = null;
    // If we were in settlement mode, keep the settlement panel open
    // Otherwise the user can continue with their current action
  }
  
  formatOrderDate(date: any): string {
    let d: Date;
    
    // Handle Firestore Timestamp
    if (date && typeof date === 'object' && 'toDate' in date) {
      d = date.toDate();
    } 
    // Handle Date object
    else if (date instanceof Date) {
      d = date;
    } 
    // Handle string or number timestamp
    else {
      d = new Date(date);
    }
    
    // Return formatted date
    return d.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
  
  async printAndComplete(): Promise<void> {
    if (!this.previewOrder) return;
    
    this.isLoading = true;
    try {
      // Print the bill first (before saving)
      const shouldProceed = await this.printThermalBillWithConfirmation(this.previewOrder);
      
      if (!shouldProceed) {
        // User cancelled the print dialog
        this.isLoading = false;
        return;
      }
      
      // Deduct prepared items from inventory BEFORE clearing cart
      await this.deductPreparedItems();
      
      // Save the order after successful print
      await this.db.createOrder(this.previewOrder);
      
      // Store total for alert message before clearing
      const totalAmount = this.previewOrder.totalAmount;
      
      // Close modal and clear cart
      this.closeBillPreview();
      this.clearCart();
      this.paymentMethod = 'cash'; // Reset to default
      
      alert(`Payment successful! Total: ${totalAmount.toFixed(0)} PKR\nBill sent to printer.`);
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error processing payment: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      this.isLoading = false;
    }
  }
  
  async completeWithoutPrint(): Promise<void> {
    if (!this.previewOrder) return;
    
    this.isLoading = true;
    try {
      // Deduct prepared items from inventory BEFORE clearing cart
      await this.deductPreparedItems();
      
      // Save the order
      await this.db.createOrder(this.previewOrder);
      
      // Store total for alert message before clearing
      const totalAmount = this.previewOrder.totalAmount;
      
      // Close modal and clear cart
      this.closeBillPreview();
      this.clearCart();
      this.paymentMethod = 'cash'; // Reset to default
      
      alert(`Payment successful! Total: ${totalAmount.toFixed(0)} PKR`);
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error processing payment: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      this.isLoading = false;
    }
  }
  
  printThermalBillWithConfirmation(order: Order): Promise<boolean> {
    return new Promise((resolve) => {
      // Create thermal printer-optimized HTML (3-4 inch width)
      const items = order.items.map(item => `
        <tr>
          <td>${item.menuItemName}</td>
          <td style="text-align: right;">${item.quantity}</td>
          <td style="text-align: right;">${item.price.toFixed(0)}</td>
          <td style="text-align: right;">${item.totalPrice.toFixed(0)}</td>
        </tr>
      `).join('');
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Bill - ${order.orderNumber}</title>
          <style>
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: Helvetica, Arial, sans-serif;
              color: #000;
              width: 80mm;
              margin: 0 auto;
              padding: 5mm;
              font-size: 12px;
              line-height: 1.4;
            }
            h1 {
              text-align: center;
              font-size: 18px;
              margin: 0 0 4px; /* reduce top margin for compact header */
              font-weight: bold;
            }
            .center {
              text-align: center;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
            }
            th, td {
              padding: 3px 2px;
              text-align: left;
            }
            th {
              border-bottom: 1px solid #000;
              font-weight: bold;
            }
            .total-section {
              margin-top: 10px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
            }
            .total-final {
              font-weight: bold;
              font-size: 14px;
              border-top: 1px solid #000;
              padding-top: 5px;
              margin-top: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 10px;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <h1>VISAKH</h1>
          <div class="center">Restaurant Bill</div>
          <div class="divider"></div>
          
          <div><strong>Order:</strong> ${order.orderNumber}</div>
          <div><strong>Date:</strong> ${new Date().toLocaleString()}</div>
          <div><strong>Type:</strong> ${order.isTakeaway ? 'Takeaway' : 'Dine-in - Table ' + order.tableNumber}</div>
          ${order.customerName ? `<div><strong>Customer:</strong> ${order.customerName}</div>` : ''}
          <div><strong>Payment:</strong> ${order.paymentMethod === 'cash' ? 'Cash' : order.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Credit Account'}</div>
          
          <div class="divider"></div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: right;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${order.subtotal.toFixed(0)} PKR</span>
            </div>
            <div class="total-row">
              <span>Tax:</span>
              <span>${order.tax.toFixed(0)} PKR</span>
            </div>
            ${order.discount > 0 ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-${order.discount.toFixed(0)} PKR</span>
            </div>
            ` : ''}
            <div class="total-row total-final">
              <span>TOTAL:</span>
              <span>${order.totalAmount.toFixed(0)} PKR</span>
            </div>
          </div>
          
          <div class="divider"></div>
          <div class="footer">
            <div>Thank you for your visit!</div>
            <div>Please visit again</div>
          </div>
        </body>
        </html>
      `;
      
      // Open print window
      const printWindow = window.open('', '_blank', 'width=300,height=600');
      if (!printWindow) {
        // Pop-up blocked or failed to open
        const userConfirmed = confirm('Unable to open print window. Continue without printing?');
        resolve(userConfirmed);
        return;
      }
      
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      
      let hasResolved = false;
      
      // Track if window is closed without printing
      const checkClosed = setInterval(() => {
        if (printWindow.closed && !hasResolved) {
          clearInterval(checkClosed);
          hasResolved = true;
          // Ask user if they want to continue despite not printing
          const userConfirmed = confirm('Print window was closed. Do you want to complete the payment anyway?');
          resolve(userConfirmed);
        }
      }, 500);
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          // Give user time to print, then resolve
          setTimeout(() => {
            if (!hasResolved) {
              hasResolved = true;
              clearInterval(checkClosed);
              printWindow.close();
              resolve(true); // Assume successful if print dialog was shown
            }
          }, 1000);
        }, 250);
      };
      
      // Timeout fallback (in case print dialog takes too long)
      setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          clearInterval(checkClosed);
          if (!printWindow.closed) {
            printWindow.close();
          }
          resolve(true);
        }
      }, 30000); // 30 second timeout
    });
  }
  
  printThermalBill(order: Order): void {
    // Create thermal printer-optimized HTML (3-4 inches wide)
    const items = order.items.map(item => `
      <tr>
        <td>${item.menuItemName}</td>
        <td style="text-align: right;">${item.quantity}</td>
        <td style="text-align: right;">${item.price.toFixed(0)}</td>
        <td style="text-align: right;">${item.totalPrice.toFixed(0)}</td>
      </tr>
    `).join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bill - ${order.orderNumber}</title>
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
          body {
            font-family: Helvetica, Arial, sans-serif;
            color: #000;
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
            font-size: 12px;
            line-height: 1.4;
          }
          h1 {
            text-align: center;
            font-size: 18px;
            margin: 0 0 4px; /* reduce top margin for compact header */
            font-weight: bold;
          }
          .center {
            text-align: center;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
          }
          th, td {
            padding: 3px 2px;
            text-align: left;
          }
          th {
            border-bottom: 1px solid #000;
            font-weight: bold;
          }
          .total-section {
            margin-top: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
          }
          .total-final {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 10px;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <h1>VISAKH</h1>
        <div class="center">Restaurant Bill</div>
        <div class="divider"></div>
        
        <div><strong>Order:</strong> ${order.orderNumber}</div>
        <div><strong>Date:</strong> ${new Date().toLocaleString()}</div>
        <div><strong>Type:</strong> ${order.isTakeaway ? 'Takeaway' : 'Dine-in - Table ' + order.tableNumber}</div>
        ${order.customerName ? `<div><strong>Customer:</strong> ${order.customerName}</div>` : ''}
        <div><strong>Payment:</strong> ${order.paymentMethod === 'cash' ? 'Cash' : order.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Credit Account'}</div>
        
        <div class="divider"></div>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: right;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items}
          </tbody>
        </table>
        
        <div class="divider"></div>
        
        <div class="total-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${order.subtotal.toFixed(0)} PKR</span>
          </div>
          <div class="total-row">
            <span>Tax:</span>
            <span>${order.tax.toFixed(0)} PKR</span>
          </div>
          ${order.discount > 0 ? `
          <div class="total-row">
            <span>Discount:</span>
            <span>-${order.discount.toFixed(0)} PKR</span>
          </div>
          ` : ''}
          <div class="total-row total-final">
            <span>TOTAL:</span>
            <span>${order.totalAmount.toFixed(0)} PKR</span>
          </div>
        </div>
        
        <div class="divider"></div>
        <div class="footer">
          <div>Thank you for your visit!</div>
          <div>Please visit again</div>
        </div>
      </body>
      </html>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          // Auto-close after printing
          setTimeout(() => printWindow.close(), 500);
        }, 250);
      };
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
      discountType: this.discount > 0 ? 'fixed' : undefined,
      discountValue: this.discount > 0 ? this.discount : undefined,
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
    this.isTakeaway = true;
    this.customerName = '';
    this.discount = 0;
  }

  cancelOrder(): void {
    if (confirm('Are you sure you want to cancel this order?')) {
      this.clearCart();
    }
  }

  // ============ CREDIT CUSTOMER METHODS ============
  
  async loadCreditCustomers(): Promise<void> {
    try {
      const customers = await this.db.getCreditCustomers();
      // Only load active customers with credit enabled
      this.creditCustomers = customers.filter((c: CreditCustomer) => c.isCreditEnabled);
      this.filteredCreditCustomers = [...this.creditCustomers];
    } catch (error) {
      console.error('Error loading credit customers:', error);
    }
  }

  filterCreditCustomers(): void {
    const search = this.creditCustomerSearchText.toLowerCase().trim();
    if (!search) {
      this.filteredCreditCustomers = [...this.creditCustomers];
      return;
    }
    this.filteredCreditCustomers = this.creditCustomers.filter(customer => 
      customer.name.toLowerCase().includes(search) ||
      customer.phone.toLowerCase().includes(search) ||
      (customer.companyName && customer.companyName.toLowerCase().includes(search))
    );
  }

  openCreditCustomerSelectionForNewOrder(): void {
    this.showCreditCustomerSelection = true;
    this.selectedCreditCustomer = null;
    this.selectedBillOrder = null; // Clear bill order to indicate new order
  }

  openCreditCustomerSelection(): void {
    this.showCreditCustomerSelection = true;
    this.selectedCreditCustomer = null;
  }

  closeCreditCustomerSelection(): void {
    this.showCreditCustomerSelection = false;
    this.selectedCreditCustomer = null;
    this.creditCustomerSearchText = '';
    this.filteredCreditCustomers = [...this.creditCustomers];
  }

  selectCreditCustomer(customer: CreditCustomer): void {
    this.selectedCreditCustomer = customer;
  }

  async postToAccount(): Promise<void> {
    if (!this.selectedCreditCustomer) {
      alert('Please select a customer');
      return;
    }

    this.isLoading = true;
    try {
      // Handle existing bill order (from bill requests)
      if (this.selectedBillOrder) {
        const billTotal = this.getSelectedBillTotal();
        
        // Mark order as completed and set payment method as credit account
        await this.db.updateOrder(this.selectedBillOrder.id!, {
          status: 'completed',
          paymentMethod: 'credit_account',
          completedAt: new Date()
        });

        // Post bill to customer account
        await this.db.postBillToAccount(this.selectedBillOrder, this.selectedCreditCustomer.id!);

        alert(`Bill posted to ${this.selectedCreditCustomer.name}'s account.\nAmount: ${billTotal.toFixed(0)} PKR`);
        
        this.closeCreditCustomerSelection();
        this.cancelSettlement();
        await this.loadReadyOrders();
      } 
      // Handle new order from cart
      else if (this.cart.length > 0) {
        const order = this.createOrder('completed');
        order.customerName = this.selectedCreditCustomer.name;
        order.paymentMethod = 'credit_account'; // Mark as credit account transaction
        
        // Create the order
        const orderId = await this.db.createOrder(order);
        order.id = orderId;

        // Deduct inventory
        await this.deductInventoryForOrder(order);

        // Post to customer account
        await this.db.postBillToAccount(order, this.selectedCreditCustomer.id!);

        alert(`Order posted to ${this.selectedCreditCustomer.name}'s account.\nAmount: ${order.totalAmount.toFixed(0)} PKR`);
        
        this.clearCart();
        this.closeCreditCustomerSelection();
      }
      
      await this.loadCreditCustomers(); // Refresh customer balances
    } catch (error) {
      console.error('Error posting to account:', error);
      alert('Failed to post bill to account');
    } finally {
      this.isLoading = false;
    }
  }
}
