import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { CreditCustomer, CustomerPayment } from '../../models/models';

@Component({
  selector: 'app-payment-collection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-collection.component.html',
  styleUrls: ['./payment-collection.component.css']
})
export class PaymentCollectionComponent implements OnInit {
  customers: CreditCustomer[] = [];
  filteredCustomers: CreditCustomer[] = [];
  searchText: string = '';
  selectedCustomer: CreditCustomer | null = null;
  
  // Payment form
  paymentAmount: number = 0;
  paymentMode: 'cash' | 'bank_transfer' = 'cash';
  transactionId: string = '';
  notes: string = '';
  
  isLoading: boolean = false;
  recentPayments: CustomerPayment[] = [];

  // Expose Math for template
  Math = Math;

  constructor(
    private db: DatabaseService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadCustomers();
    this.loadRecentPayments();
  }

  async loadCustomers() {
    try {
      const allCustomers = await this.db.getCreditCustomers();
      // Only show customers with outstanding balance
      this.customers = allCustomers.filter((c: CreditCustomer) => c.currentBalance > 0);
      this.filteredCustomers = [...this.customers];
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }

  async loadRecentPayments() {
    try {
      this.recentPayments = await this.db.getRecentCustomerPayments(10);
    } catch (error) {
      console.error('Error loading recent payments:', error);
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
      c.phone.includes(search)
    );
  }

  selectCustomer(customer: CreditCustomer) {
    this.selectedCustomer = customer;
    this.paymentAmount = customer.currentBalance; // Default to full payment
    this.resetForm();
  }

  resetForm() {
    this.paymentMode = 'cash';
    this.transactionId = '';
    this.notes = '';
  }

  closeCustomerSelection() {
    this.selectedCustomer = null;
    this.paymentAmount = 0;
    this.resetForm();
  }

  async recordPayment() {
    if (!this.selectedCustomer) return;

    if (this.paymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (this.paymentAmount > this.selectedCustomer.currentBalance) {
      if (!confirm(`Payment amount (${this.paymentAmount} PKR) exceeds balance (${this.selectedCustomer.currentBalance} PKR). Continue?`)) {
        return;
      }
    }

    if (this.paymentMode === 'bank_transfer' && !this.transactionId.trim()) {
      alert('Please enter transaction ID');
      return;
    }

    const payment: CustomerPayment = {
      customerId: this.selectedCustomer.id!,
      customerName: this.selectedCustomer.name,
      amount: this.paymentAmount,
      paymentMode: this.paymentMode,
      transactionId: this.paymentMode === 'bank_transfer' ? this.transactionId : undefined,
      notes: this.notes.trim() || undefined,
      receivedBy: this.authService.currentUser?.name || 'Unknown',
      date: new Date()
    };

    this.isLoading = true;
    try {
      await this.db.recordCustomerPayment(payment);
      alert(`Payment recorded successfully! \n${this.selectedCustomer.name} paid ${this.paymentAmount} PKR`);
      this.closeCustomerSelection();
      await this.loadCustomers();
      await this.loadRecentPayments();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
    } finally {
      this.isLoading = false;
    }
  }

  formatDate(date: Date): string {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  getPaymentModeLabel(mode: string): string {
    const labels = {
      'cash': '💵 Cash',
      'bank_transfer': '🏦 Bank Transfer',
      'check': '📝 Check'
    };
    return labels[mode as keyof typeof labels] || mode;
  }
}
