import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { Order, Purchase } from '../../models/models';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {
  activeTab: 'sales' | 'expenses' | 'profit' | 'items' = 'sales';
  
  startDate: string = '';
  endDate: string = '';
  
  // Sales Report
  salesOrders: Order[] = [];
  totalRevenue: number = 0;
  totalOrdersCount: number = 0;
  
  // Expenses Report
  expenses: Purchase[] = [];
  totalExpenses: number = 0;
  
  // Profit/Loss
  profit: number = 0;
  
  // Item Performance
  itemPerformance: { name: string; sold: number; revenue: number }[] = [];

  constructor(private db: DatabaseService) {}

  async ngOnInit(): Promise<void> {
    // Set default dates (last 7 days)
    const today = new Date();
    this.endDate = today.toISOString().split('T')[0];
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    this.startDate = weekAgo.toISOString().split('T')[0];
    
    await this.loadReports();
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

  switchTab(tab: 'sales' | 'expenses' | 'items'): void {
    this.activeTab = tab;
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
        ['Total Revenue', `$${this.totalRevenue.toFixed(2)} (${this.totalOrdersCount} orders)`],
        ['Total Expenses', `$${this.totalExpenses.toFixed(2)} (${this.expenses.length} purchases)`],
        ['Net Profit/Loss', `$${this.profit.toFixed(2)}`]
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
      order.cashierName,
      `$${order.totalAmount.toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Order #', 'Date', 'Type', 'Items', 'Cashier', 'Amount']],
      body: salesData.length > 0 ? salesData : [['No sales in this period', '', '', '', '', '']],
      theme: 'striped',
      headStyles: { fillColor: [76, 175, 80] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        3: { cellWidth: 60 }
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
      `$${item.revenue.toFixed(2)}`
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
    const confirmMessage = `Are you sure you want to delete ALL records (sales and expenses) for the period ${dateRange}?\n\nThis action cannot be undone!\n\nRecords to be deleted:\n- ${this.salesOrders.length} sales orders\n- ${this.expenses.length} expense records`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    // Double confirmation for safety
    if (!confirm('Final confirmation: This will permanently delete all selected records. Continue?')) {
      return;
    }
    
    try {
      let deletedOrders = 0;
      let deletedExpenses = 0;
      
      // Delete all sales orders
      for (const order of this.salesOrders) {
        if (order.id) {
          await this.db.deleteOrder(order.id);
          deletedOrders++;
        }
      }
      
      // Delete all expenses
      for (const expense of this.expenses) {
        if (expense.id) {
          await this.db.deletePurchase(expense.id);
          deletedExpenses++;
        }
      }
      
      alert(`Records cleared successfully!\n\nDeleted:\n- ${deletedOrders} sales orders\n- ${deletedExpenses} expense records`);
      
      // Reload reports to refresh the view
      await this.loadReports();
    } catch (error) {
      console.error('Error clearing records:', error);
      alert('Error clearing records. Please try again.');
    }
  }

  viewOrderDetail(order: Order): void {
    const created: Date = (order.createdAt && typeof order.createdAt === 'object' && 'toDate' in order.createdAt)
      ? (order.createdAt as any).toDate()
      : new Date(order.createdAt as any);
    
    const rows = (order.items || []).map(i =>
      `<tr><td>${i.menuItemName}</td><td>${i.quantity}</td><td>${i.price.toFixed(0)} PKR</td><td>${i.totalPrice.toFixed(0)} PKR</td></tr>`
    ).join('');
    
    const discountLine = order.discount > 0 
      ? `<p>Discount: -${order.discount.toFixed(0)} PKR${order.discountType === 'percentage' ? ` (${order.discountValue}%)` : ''}</p>`
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
}
