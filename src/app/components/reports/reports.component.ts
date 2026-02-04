import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { Order, Purchase, OrderItem } from '../../models/models';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ManualSaleItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface ManualSale {
  date: string;
  time: string;
  isTakeaway: boolean;
  tableNumber: string;
  customerName: string;
  items: ManualSaleItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'credit_account';
  notes: string;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {
  activeTab: 'sales' | 'expenses' | 'profit' | 'items' | 'archives' = 'sales';
  
  startDate: string = '';
  endDate: string = '';
  
  // Sales Report
  salesOrders: Order[] = [];
  totalRevenue: number = 0;
  totalOrdersCount: number = 0;
  cashRevenue: number = 0;
  bankTransferRevenue: number = 0;
  creditAccountRevenue: number = 0;

  // Collections (Customer Payments)
  paymentsTotal: number = 0;
  paymentsCashTotal: number = 0;
  paymentsBankTotal: number = 0;
  paymentsCheckTotal: number = 0;
  
  // Expenses Report
  expenses: Purchase[] = [];
  totalExpenses: number = 0;
  
  // Profit/Loss
  profit: number = 0;
  
  // Item Performance
  itemPerformance: { name: string; sold: number; revenue: number }[] = [];

  // Archived Records
  archivedOrders: Order[] = [];
  archivedExpenses: Purchase[] = [];
  archivedPayments: any[] = [];

  // Manual Sale Entry
  showManualSaleModal: boolean = false;
  manualSale: ManualSale = this.getEmptyManualSale();

  // Bill Editing
  showEditBillModal: boolean = false;
  editBillOrder: Order | null = null;
  editBillItems: OrderItem[] = [];
  allMenuItems: any[] = [];

  get isSuperAdmin(): boolean {
    return this.authService.currentUser?.role === 'super_admin';
  }

  constructor(private db: DatabaseService, private authService: AuthService) {}

  async ngOnInit(): Promise<void> {
    // Set default dates (last 7 days)
    const today = new Date();
    this.endDate = today.toISOString().split('T')[0];
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    this.startDate = weekAgo.toISOString().split('T')[0];
    
    // Load all menu items for editing
    try {
      this.allMenuItems = await this.db.getActiveMenuItems();
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
    
    await this.loadReports();
  }

  switchTab(tab: 'sales' | 'expenses' | 'profit' | 'items' | 'archives'): void {
    this.activeTab = tab;
    if (tab === 'archives') {
      this.loadArchivedRecords();
    }
  }

  async loadArchivedRecords(): Promise<void> {
    try {
      this.archivedOrders = await this.db.getArchivedOrders();
      this.archivedExpenses = await this.db.getArchivedPurchases();
      this.archivedPayments = await this.db.getArchivedCustomerPayments();
    } catch (error) {
      console.error('Error loading archived records:', error);
    }
  }

  async loadReports(): Promise<void> {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    end.setHours(23, 59, 59);
    
    try {
      // Load sales
      this.salesOrders = await this.db.getOrdersByDateRange(start, end);
      this.salesOrders = this.salesOrders.filter(o => o.status === 'completed');
      this.totalRevenue = this.salesOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      this.totalOrdersCount = this.salesOrders.length;
      
      // Calculate payment method breakdown
      this.cashRevenue = this.salesOrders
        .filter(o => o.paymentMethod === 'cash')
        .reduce((sum, o) => sum + o.totalAmount, 0);
      this.bankTransferRevenue = this.salesOrders
        .filter(o => o.paymentMethod === 'bank_transfer')
        .reduce((sum, o) => sum + o.totalAmount, 0);
      this.creditAccountRevenue = this.salesOrders
        .filter(o => o.paymentMethod === 'credit_account')
        .reduce((sum, o) => sum + o.totalAmount, 0);

      // Load customer payments (collections)
      const payments = await this.db.getCustomerPaymentsByDateRange(start, end);
      this.paymentsTotal = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      this.paymentsCashTotal = payments
        .filter((p: any) => p.paymentMode === 'cash')
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      this.paymentsBankTotal = payments
        .filter((p: any) => p.paymentMode === 'bank_transfer')
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      this.paymentsCheckTotal = payments
        .filter((p: any) => p.paymentMode === 'check')
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      
      // Load expenses
      this.expenses = await this.db.getPurchasesByDateRange(start, end);
      this.totalExpenses = this.expenses.reduce((sum, p) => sum + p.totalCost, 0);
      
      // Calculate profit
      this.profit = this.totalRevenue - this.totalExpenses;
      
      // Calculate item performance
      this.calculateItemPerformance();
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  }

  calculateItemPerformance(): void {
    const itemMap = new Map<string, { sold: number; revenue: number }>();
    
    for (const order of this.salesOrders) {
      for (const item of order.items) {
        const existing = itemMap.get(item.menuItemName) || { sold: 0, revenue: 0 };
        existing.sold += item.quantity;
        existing.revenue += item.totalPrice;
        itemMap.set(item.menuItemName, existing);
      }
    }
    
    this.itemPerformance = Array.from(itemMap.entries())
      .map(([name, data]) => ({ name, sold: data.sold, revenue: data.revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    
    let d: Date;
    
    // Handle Firestore Timestamp
    if (date.toDate && typeof date.toDate === 'function') {
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
    
    // Check if date is valid
    if (isNaN(d.getTime())) {
      return 'Invalid Date';
    }
    
    return d.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  exportToPDF(): void {
    const doc = new jsPDF();
    const dateRange = `${this.startDate} to ${this.endDate}`;
    let yPos = 20;
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('VISAKH', 105, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(14);
    doc.text('Reports & Accounts', 105, yPos, { align: 'center' });
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${dateRange}`, 105, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, yPos, { align: 'center' });
    yPos += 15;
    
    // Summary Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', 14, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: [
        ['Total Revenue', `${this.totalRevenue.toFixed(0)} PKR (${this.totalOrdersCount} orders)`],
        ['Cash Revenue', `${this.cashRevenue.toFixed(0)} PKR`],
        ['Bank Transfer', `${this.bankTransferRevenue.toFixed(0)} PKR`],
        ['Credit Account', `${this.creditAccountRevenue.toFixed(0)} PKR`],
        ['Collections - Cash', `${this.paymentsCashTotal.toFixed(0)} PKR`],
        ['Collections - Bank', `${this.paymentsBankTotal.toFixed(0)} PKR`],
        ['Collections - Check', `${this.paymentsCheckTotal.toFixed(0)} PKR`],
        ['Total Expenses', `${this.totalExpenses.toFixed(0)} PKR (${this.expenses.length} purchases)`],
        ['Net Profit/Loss', `${this.profit.toFixed(0)} PKR`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [102, 126, 234] },
      margin: { left: 14, right: 14 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Sales Report
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SALES REPORT', 14, yPos);
    yPos += 8;
    
    const salesData = this.salesOrders.map(order => [
      order.orderNumber,
      this.formatDate(order.createdAt),
      order.isTakeaway ? 'Takeaway' : `Table ${order.tableNumber}`,
      order.items.map(i => `${i.quantity}x ${i.menuItemName}`).join(', '),
      order.paymentMethod === 'bank_transfer' ? 'Bank' : 
        order.paymentMethod === 'credit_account' ? 'Credit' : 'Cash',
      order.cashierName,
      `${order.totalAmount.toFixed(0)} PKR`
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Order #', 'Date', 'Type', 'Items', 'Payment', 'Cashier', 'Amount']],
      body: salesData.length > 0 ? salesData : [['No sales in this period', '', '', '', '', '', '']],
      theme: 'striped',
      headStyles: { fillColor: [76, 175, 80] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        3: { cellWidth: 50 }
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    // Expense Report
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('EXPENSE REPORT', 14, yPos);
    yPos += 8;
    
    const expenseData = this.expenses.map(expense => [
      this.formatDate(expense.date),
      expense.supplierName,
      expense.inventoryItemName,
      `${expense.quantity} ${expense.unit}`,
      `$${expense.totalCost.toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Supplier', 'Item', 'Quantity', 'Cost']],
      body: expenseData.length > 0 ? expenseData : [['No expenses in this period', '', '', '', '']],
      theme: 'striped',
      headStyles: { fillColor: [255, 152, 0] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 3 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    // Item Performance
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ITEM PERFORMANCE', 14, yPos);
    yPos += 8;
    
    const itemData = this.itemPerformance.map((item, index) => [
      (index + 1).toString(),
      item.name,
      item.sold.toString(),
      `${item.revenue.toFixed(2)} PKR`
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Rank', 'Item Name', 'Quantity Sold', 'Total Revenue']],
      body: itemData.length > 0 ? itemData : [['No sales data available', '', '', '']],
      theme: 'striped',
      headStyles: { fillColor: [33, 150, 243] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 3 }
    });
    
    // Save PDF
    const fileName = `HMS_Report_${this.startDate}_to_${this.endDate}.pdf`;
    doc.save(fileName);
    
    alert('PDF report exported successfully!');
  }

  async clearRecords(): Promise<void> {
    const dateRange = `${this.startDate} to ${this.endDate}`;
    // Load payments for confirmation preview
    const start = new Date(this.startDate);
    const end = new Date(this.endDate); end.setHours(23,59,59);
    const payments = await this.db.getCustomerPaymentsByDateRange(start, end);
    const cashCount = payments.filter((p: any) => p.paymentMode === 'cash').length;
    const bankCount = payments.filter((p: any) => p.paymentMode === 'bank_transfer').length;
    const checkCount = payments.filter((p: any) => p.paymentMode === 'check').length;

    const confirmMessage = `Are you sure you want to archive ALL records for ${dateRange}?\n\nRecords will be moved to archives and can be retrieved if needed.\n\nRecords to be archived:\n- ${this.salesOrders.length} sales orders\n- ${this.expenses.length} expense records\n- ${payments.length} customer payments (Cash: ${cashCount}, Bank: ${bankCount}, Check: ${checkCount})`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      let archivedOrders = 0;
      let archivedExpenses = 0;
      let archivedPayments = 0;
      
      // Archive all sales orders
      for (const order of this.salesOrders) {
        if (order.id) {
          await this.db.archiveOrder(order);
          await this.db.deleteOrder(order.id);
          archivedOrders++;
        }
      }
      
      // Archive all expenses
      for (const expense of this.expenses) {
        if (expense.id) {
          await this.db.archivePurchase(expense);
          await this.db.deletePurchase(expense.id);
          archivedExpenses++;
        }
      }

      // Archive all customer payments in range and reverse balances
      for (const p of payments) {
        if (p.id) {
          await this.db.archiveCustomerPayment(p);
          await this.db.deleteCustomerPayment(p.id);
          archivedPayments++;
        }
      }
      
      alert(`Records archived successfully!\n\nArchived:\n- ${archivedOrders} sales orders\n- ${archivedExpenses} expense records\n- ${archivedPayments} customer payments\n\nThese records have been moved to archives.`);
      
      // Reload reports to refresh the view
      await this.loadReports();
    } catch (error) {
      console.error('Error archiving records:', error);
      alert('Error archiving records. Please try again.');
    }
  }

  viewOrderDetail(order: Order): void {
    const created: Date = (order.createdAt && typeof order.createdAt === 'object' && 'toDate' in order.createdAt)
      ? (order.createdAt as any).toDate()
      : new Date(order.createdAt as any);
    
    const edited = order.editedAt ? ((order.editedAt && typeof order.editedAt === 'object' && 'toDate' in order.editedAt)
      ? (order.editedAt as any).toDate()
      : new Date(order.editedAt as any)) : null;
    
    const rows = (order.items || []).map(i =>
      `<tr><td>${i.menuItemName}</td><td>${i.quantity}</td><td>${i.price.toFixed(0)} PKR</td><td>${i.totalPrice.toFixed(0)} PKR</td></tr>`
    ).join('');
    
    const discountLine = order.discount > 0 
      ? `<p>Discount: -${order.discount.toFixed(0)} PKR${order.discountType === 'percentage' ? ` (${order.discountValue}%)` : ''}</p>`
      : '';
    
    const editedLine = edited
      ? `<p style="font-style:italic;font-size:0.9em;color:#666;">Edited: ${edited.toLocaleString()} by ${order.editedBy || 'Unknown'}</p>`
      : '';
    
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Order ${order.orderNumber}</title>
      <style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;padding:20px;color:#333}
      h1{font-size:20px;margin:0 0 10px} p{margin:4px 0}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{padding:8px;border-bottom:1px solid #eee;text-align:left}
      .total{font-weight:700;margin-top:12px}
      </style></head><body>
      <h1>Order ${order.orderNumber}</h1>
      <p><strong>${order.isTakeaway ? 'Takeaway' : 'Table: ' + order.tableNumber}</strong></p>
      <p>Customer: ${order.customerName || '-'}</p>
      <p>Status: ${order.status}</p>
      <p>Created: ${created.toLocaleString()}</p>
      ${editedLine}
      <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
      <p>Subtotal: ${order.subtotal.toFixed(0)} PKR</p>
      <p>Tax: ${order.tax.toFixed(0)} PKR</p>
      ${discountLine}
      <p class="total">Grand Total: ${order.totalAmount.toFixed(0)} PKR</p>
      </body></html>`;
    
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
    }
  }

  // Manual Sales Entry Methods
  getEmptyManualSale(): ManualSale {
    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0].substring(0, 5), // HH:MM
      isTakeaway: true,
      tableNumber: '',
      customerName: '',
      items: [{ name: '', quantity: 1, price: 0, total: 0 }],
      subtotal: 0,
      taxRate: 0,
      tax: 0,
      discount: 0,
      totalAmount: 0,
      paymentMethod: 'cash',
      notes: ''
    };
  }

  openManualSaleModal(): void {
    this.manualSale = this.getEmptyManualSale();
    this.showManualSaleModal = true;
  }

  closeManualSaleModal(): void {
    this.showManualSaleModal = false;
  }

  addManualItem(): void {
    this.manualSale.items.push({ name: '', quantity: 1, price: 0, total: 0 });
  }

  removeManualItem(index: number): void {
    if (this.manualSale.items.length > 1) {
      this.manualSale.items.splice(index, 1);
      this.calculateManualTotals();
    }
  }

  calculateManualItemTotal(index: number): void {
    const item = this.manualSale.items[index];
    item.total = item.quantity * item.price;
    this.calculateManualTotals();
  }

  calculateManualTotals(): void {
    // Calculate subtotal
    this.manualSale.subtotal = this.manualSale.items.reduce((sum, item) => sum + item.total, 0);
    
    // Calculate tax
    this.manualSale.tax = (this.manualSale.subtotal * this.manualSale.taxRate) / 100;
    
    // Calculate total
    this.manualSale.totalAmount = this.manualSale.subtotal + this.manualSale.tax - this.manualSale.discount;
  }

  isManualSaleValid(): boolean {
    // Check if date and time are set
    if (!this.manualSale.date || !this.manualSale.time) {
      return false;
    }

    // Check if at least one item with valid data exists
    const hasValidItem = this.manualSale.items.some(
      item => item.name.trim() !== '' && item.quantity > 0 && item.price > 0
    );

    if (!hasValidItem) {
      return false;
    }

    // Check if total is positive
    if (this.manualSale.totalAmount <= 0) {
      return false;
    }

    return true;
  }

  async saveManualSale(): Promise<void> {
    if (!this.isManualSaleValid()) {
      alert('Please fill in all required fields with valid values.');
      return;
    }

    try {
      // Combine date and time to create timestamp
      const saleDateTime = new Date(`${this.manualSale.date}T${this.manualSale.time}`);
      
      if (isNaN(saleDateTime.getTime())) {
        alert('Invalid date or time format.');
        return;
      }

      // Get current user info
      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        alert('User not authenticated.');
        return;
      }

      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Filter out empty items and convert to OrderItem format
      const orderItems: OrderItem[] = this.manualSale.items
        .filter(item => item.name.trim() !== '' && item.quantity > 0 && item.price > 0)
        .map(item => ({
          menuItemId: 'manual-entry',
          menuItemName: item.name,
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.total
        }));

      // Create order object
      const order: Order = {
        orderNumber: orderNumber,
        isTakeaway: this.manualSale.isTakeaway,
        tableNumber: this.manualSale.isTakeaway ? undefined : this.manualSale.tableNumber || undefined,
        customerName: this.manualSale.customerName || undefined,
        items: orderItems,
        subtotal: this.manualSale.subtotal,
        tax: this.manualSale.tax,
        discount: this.manualSale.discount,
        totalAmount: this.manualSale.totalAmount,
        status: 'completed', // Manual sales are already completed
        paymentMethod: this.manualSale.paymentMethod,
        createdAt: saleDateTime,
        completedAt: saleDateTime, // Same as created since it's historical
        cashierId: currentUser.id || 'manual-entry',
        cashierName: currentUser.name
      };

      // Save to database
      const orderId = await this.db.createOrder(order);

      // Log the activity
      await this.db.logActivity({
        userId: currentUser.id || 'manual-entry',
        userName: currentUser.name,
        action: 'Manual Sale Entry',
        timestamp: new Date(),
        details: `Added manual sale record ${orderNumber} for ${this.manualSale.totalAmount.toFixed(2)} PKR (Date: ${this.manualSale.date} ${this.manualSale.time})${this.manualSale.notes ? ' - ' + this.manualSale.notes : ''}`
      });

      alert(`Manual sale record saved successfully!\nOrder Number: ${orderNumber}`);
      
      // Close modal and reload reports
      this.closeManualSaleModal();
      await this.loadReports();
    } catch (error) {
      console.error('Error saving manual sale:', error);
      alert('Error saving manual sale record. Please try again.');
    }
  }

  async generateOrderNumber(): Promise<string> {
    // Generate a unique order number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `MANUAL-${timestamp}-${random}`;
  }

  // ============ BILL EDITING METHODS ============

  openEditBillModal(order: Order): void {
    this.editBillOrder = { ...order };
    this.editBillItems = order.items.map(item => ({ ...item }));
    this.showEditBillModal = true;
  }

  closeEditBillModal(): void {
    this.showEditBillModal = false;
    this.editBillOrder = null;
    this.editBillItems = [];
  }

  addItemToBill(): void {
    if (!this.editBillItems) return;
    this.editBillItems.push({
      menuItemId: '',
      menuItemName: '',
      quantity: 1,
      price: 0,
      totalPrice: 0
    });
  }

  removeItemFromBill(index: number): void {
    if (this.editBillItems && this.editBillItems.length > 1) {
      this.editBillItems.splice(index, 1);
      this.recalculateBillTotals();
    }
  }

  getMenuItemName(menuItemId: string): string {
    const item = this.allMenuItems.find(m => m.id === menuItemId);
    return item ? item.name : '';
  }

  selectMenuItem(index: number, menuItemId: string): void {
    if (!this.editBillItems || !this.editBillItems[index]) return;
    
    const menuItem = this.allMenuItems.find(m => m.id === menuItemId);
    if (menuItem) {
      this.editBillItems[index].menuItemId = menuItem.id!;
      this.editBillItems[index].menuItemName = menuItem.name;
      this.editBillItems[index].price = menuItem.price;
      this.editBillItems[index].totalPrice = menuItem.price * this.editBillItems[index].quantity;
      this.recalculateBillTotals();
    }
  }

  updateItemQuantity(index: number): void {
    if (!this.editBillItems || !this.editBillItems[index]) return;
    const item = this.editBillItems[index];
    item.totalPrice = item.quantity * item.price;
    this.recalculateBillTotals();
  }

  recalculateBillTotals(): void {
    if (!this.editBillOrder || !this.editBillItems) return;

    // Calculate subtotal
    const subtotal = this.editBillItems.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Calculate tax (assume uniform tax rate from first item or 0)
    const taxRate = this.editBillOrder.tax > 0 ? (this.editBillOrder.tax / this.editBillOrder.subtotal) * 100 : 0;
    const tax = (subtotal * taxRate) / 100;

    // Apply discount if exists
    const discountAmount = this.editBillOrder.discount || 0;

    this.editBillOrder.subtotal = subtotal;
    this.editBillOrder.tax = tax;
    this.editBillOrder.totalAmount = subtotal + tax - discountAmount;
  }

  async saveAndPrintBill(): Promise<void> {
    if (!this.editBillOrder || !this.editBillOrder.id || !this.editBillItems) {
      alert('Invalid bill data');
      return;
    }

    // Validate items
    const validItems = this.editBillItems.filter(item => item.menuItemName && item.quantity > 0 && item.price > 0);
    if (validItems.length === 0) {
      alert('Please add at least one valid item to the bill');
      return;
    }

    try {
      // Update order with new items and totals
      this.editBillOrder.items = validItems;
      
      // Set edit timestamp and user
      const currentUser = this.authService.currentUser;
      this.editBillOrder.editedAt = new Date();
      this.editBillOrder.editedBy = currentUser?.name || 'Unknown User';
      
      await this.db.updateOrder(this.editBillOrder.id, {
        items: validItems,
        subtotal: this.editBillOrder.subtotal,
        tax: this.editBillOrder.tax,
        totalAmount: this.editBillOrder.totalAmount,
        discount: this.editBillOrder.discount,
        editedAt: this.editBillOrder.editedAt,
        editedBy: this.editBillOrder.editedBy
      });

      alert('✅ Bill updated successfully!');
      
      // Print the updated bill
      this.printUpdatedBill(this.editBillOrder);
      
      // Close modal and reload
      this.closeEditBillModal();
      await this.loadReports();
    } catch (error) {
      console.error('Error saving bill:', error);
      alert('❌ Failed to update bill');
    }
  }

  printUpdatedBill(order: Order): void {
    // Create thermal printer-optimized HTML (same as POS)
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
            margin: 0 0 12px;
            font-weight: bold;
          }
          .end-dotted {
            border-top: 1px dotted #000;
            margin-top: 14px;
          }
          .qr {
            text-align: center;
            margin-top: 8px;
          }
          .qr img {
            width: 64px;
            height: 64px;
            display: block;
            margin: 0 auto;
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
          .updated {
            text-align: center;
            margin-top: 5px;
            font-size: 9px;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <h1>VISAKH</h1>
        <div class="center">Restaurant Bill</div>
        <div class="divider"></div>
        
        <div><strong>Order:</strong> ${order.orderNumber}</div>
        <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</div>
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
        <div class="qr">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https%3A%2F%2Fwww.tiktok.com%2F%40visakh.islamabad%3F_r%3D1%26_t%3DZS-93eJaTz7maa" alt="TikTok QR">
          <div style="font-size:10px;margin-top:4px;">Follow us on TikTok</div>
        </div>
        <div style="text-align: center; margin-top: 8px; font-size: 10px;">
          WhatsApp: +92 318 0056561
        </div>
        <div class="end-dotted"></div>
        <div class="updated">Bill updated and reprinted</div>
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
}
