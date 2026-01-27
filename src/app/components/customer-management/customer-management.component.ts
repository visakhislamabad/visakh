import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { CreditCustomer, CustomerLedgerEntry } from '../../models/models';

@Component({
  selector: 'app-customer-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-management.component.html',
  styleUrls: ['./customer-management.component.css']
})
export class CustomerManagementComponent implements OnInit {
  customers: CreditCustomer[] = [];
  filteredCustomers: CreditCustomer[] = [];
  searchText: string = '';
  isLoading: boolean = false;
  
  // Form data
  showForm: boolean = false;
  isEditMode: boolean = false;
  currentCustomer: CreditCustomer = this.getEmptyCustomer();

  // Ledger data
  showLedger: boolean = false;
  isLoadingLedger: boolean = false;
  selectedCustomer: CreditCustomer | null = null;
  ledgerEntries: CustomerLedgerEntry[] = [];

  // Payment collection
  showPaymentModal: boolean = false;
  paymentAmount: number = 0;
  paymentMode: 'cash' | 'bank_transfer' | 'check' = 'cash';
  checkNumber: string = '';
  transactionId: string = '';

  constructor(private db: DatabaseService, private authService: AuthService) {}

  ngOnInit() {
    this.loadCustomers();
  }

  async loadCustomers() {
    this.isLoading = true;
    try {
      this.customers = await this.db.getCreditCustomers();
      this.filteredCustomers = [...this.customers];
    } catch (error) {
      console.error('Error loading customers:', error);
      alert('Failed to load customers');
    } finally {
      this.isLoading = false;
    }
  }

  onSearchChange() {
    const search = this.searchText.toLowerCase().trim();
    if (!search) {
      this.filteredCustomers = [...this.customers];
      return;
    }

    this.filteredCustomers = this.customers.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.phone.includes(search) ||
      (c.companyName && c.companyName.toLowerCase().includes(search))
    );
  }

  getTotalAmountDue(): number {
    return this.filteredCustomers.reduce((total, customer) => total + customer.currentBalance, 0);
  }

  openAddForm() {
    this.isEditMode = false;
    this.currentCustomer = this.getEmptyCustomer();
    this.showForm = true;
  }

  openEditForm(customer: CreditCustomer) {
    this.isEditMode = true;
    this.currentCustomer = { ...customer };
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.currentCustomer = this.getEmptyCustomer();
  }

  async saveCustomer() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    try {
      if (this.isEditMode) {
        await this.db.updateCreditCustomer(this.currentCustomer);
        alert('Customer updated successfully');
      } else {
        await this.db.addCreditCustomer(this.currentCustomer);
        alert('Customer added successfully');
      }
      this.closeForm();
      await this.loadCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Failed to save customer');
    } finally {
      this.isLoading = false;
    }
  }

  async toggleCreditStatus(customer: CreditCustomer) {
    const updatedCustomer = { ...customer, isCreditEnabled: !customer.isCreditEnabled };
    this.isLoading = true;
    try {
      await this.db.updateCreditCustomer(updatedCustomer);
      await this.loadCustomers();
    } catch (error) {
      console.error('Error toggling credit status:', error);
      alert('Failed to update credit status');
    } finally {
      this.isLoading = false;
    }
  }

  async deleteCustomer(customer: CreditCustomer) {
    if (customer.currentBalance > 0) {
      alert('Cannot delete customer with outstanding balance. Please clear balance first.');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${customer.name}?`)) {
      return;
    }

    this.isLoading = true;
    try {
      await this.db.deleteCreditCustomer(customer.id!);
      alert('Customer deleted successfully');
      await this.loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer');
    } finally {
      this.isLoading = false;
    }
  }

  validateForm(): boolean {
    if (!this.currentCustomer.name.trim()) {
      alert('Please enter customer name');
      return false;
    }
    if (!this.currentCustomer.phone.trim()) {
      alert('Please enter phone number');
      return false;
    }
    return true;
  }

  getEmptyCustomer(): CreditCustomer {
    return {
      name: '',
      phone: '',
      address: '',
      companyName: '',
      currentBalance: 0,
      isCreditEnabled: true,
      createdAt: new Date()
    };
  }

  async viewLedger(customer: CreditCustomer) {
    this.selectedCustomer = customer;
    this.showLedger = true;
    this.isLoadingLedger = true;
    
    try {
      this.ledgerEntries = await this.db.getCustomerLedger(customer.id!);
      // Sort by date descending (newest first)
      this.ledgerEntries.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : (a.date as any).toDate();
        const dateB = b.date instanceof Date ? b.date : (b.date as any).toDate();
        return dateB.getTime() - dateA.getTime();
      });
    } catch (error) {
      console.error('Error loading ledger:', error);
      alert('Failed to load ledger entries');
    } finally {
      this.isLoadingLedger = false;
    }
  }

  closeLedger() {
    this.showLedger = false;
    this.selectedCustomer = null;
    this.ledgerEntries = [];
  }

  formatDate(date: Date | any): string {
    const d = date instanceof Date ? date : date.toDate();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return d.toLocaleString('en-US', options);
  }

  async viewOrderDetail(orderNumber: string) {
    try {
      const order = await this.db.getOrderByOrderNumber(orderNumber);
      if (!order) {
        alert('Order not found');
        return;
      }

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
    } catch (error) {
      console.error('Error viewing order detail:', error);
      alert('Failed to load order details');
    }
  }

  collectPayment(customer: CreditCustomer) {
    this.selectedCustomer = customer;
    this.paymentAmount = customer.currentBalance;
    this.showPaymentModal = true;
  }

  collectPaymentFromLedger() {
    if (!this.selectedCustomer) return;
    this.paymentAmount = this.selectedCustomer.currentBalance;
    this.showPaymentModal = true;
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.paymentAmount = 0;
    this.paymentMode = 'cash';
    this.checkNumber = '';
    this.transactionId = '';
  }

  async recordPayment() {
    if (!this.selectedCustomer || this.paymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (this.paymentMode === 'check' && !this.checkNumber.trim()) {
      alert('Please enter check number');
      return;
    }

    if (this.paymentMode === 'bank_transfer' && !this.transactionId.trim()) {
      alert('Please enter transaction ID');
      return;
    }

    this.isLoading = true;
    try {
      const currentUser = this.authService.currentUser;
      const payment: any = {
        customerId: this.selectedCustomer.id!,
        customerName: this.selectedCustomer.name,
        amount: this.paymentAmount,
        paymentMode: this.paymentMode,
        date: new Date(),
        receivedBy: currentUser?.name || 'Admin',
        notes: `Payment via ${this.paymentMode}${this.checkNumber ? ` (Check: ${this.checkNumber})` : ''}${this.transactionId ? ` (TxID: ${this.transactionId})` : ''}`
      };
      
      // Only add optional fields if they have values
      if (this.checkNumber) {
        payment.checkNumber = this.checkNumber;
      }
      if (this.transactionId) {
        payment.transactionId = this.transactionId;
      }
      
      await this.db.recordCustomerPayment(payment);
      
      alert('Payment recorded successfully');
      this.closePaymentModal();
      
      // Refresh customer list
      await this.loadCustomers();
      
      // Refresh ledger if it's open
      if (this.showLedger && this.selectedCustomer) {
        const updatedCustomer = this.customers.find(c => c.id === this.selectedCustomer!.id);
        if (updatedCustomer) {
          this.selectedCustomer = updatedCustomer;
          await this.viewLedger(updatedCustomer);
        }
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
    } finally {
      this.isLoading = false;
    }
  }
}
