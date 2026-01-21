import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { InventoryItem, Purchase, Supplier, InventoryAdjustment } from '../../models/models';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.css'
})
export class InventoryComponent implements OnInit {
  activeTab: 'stock' | 'purchases' | 'suppliers' | 'adjustments' = 'stock';
  
  // Stock
  inventoryItems: InventoryItem[] = [];
  showAddItemModal: boolean = false;
  currentItem: InventoryItem = this.getEmptyItem();
  isEditMode: boolean = false;
  
  // Purchases
  purchases: Purchase[] = [];
  showAddPurchaseModal: boolean = false;
  currentPurchase: Purchase = this.getEmptyPurchase();
  
  // Suppliers
  suppliers: Supplier[] = [];
  
  // Adjustments
  adjustments: InventoryAdjustment[] = [];
  showAddAdjustmentModal: boolean = false;
  currentAdjustment!: InventoryAdjustment;
  
  isLoading: boolean = false;

  constructor(
    private db: DatabaseService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  getEmptyItem(): InventoryItem {
    return {
      name: '',
      category: 'Vegetables',
      currentStock: 0,
      unit: 'items',
      lowStockThreshold: 5
    };
  }

  getEmptyPurchase(): Purchase {
    return {
      supplierName: '',
      date: new Date(),
      inventoryItemId: '',
      inventoryItemName: '',
      quantity: 0,
      unit: 'kg',
      costPrice: 0,
      totalCost: 0
    };
  }

  getEmptyAdjustment(): InventoryAdjustment {
    return {
      inventoryItemId: '',
      inventoryItemName: '',
      adjustmentType: 'consumption',
      quantity: 0,
      unit: 'kg',
      reason: '',
      adjustedBy: this.authService.currentUser?.name || 'Unknown',
      date: new Date()
    };
  }

  async loadData(): Promise<void> {
    this.isLoading = true;
    try {
      this.inventoryItems = await this.db.getInventoryItems();
      this.purchases = await this.db.getPurchases();
      this.suppliers = await this.db.getSuppliers();
      this.adjustments = await this.db.getInventoryAdjustments();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Stock Management
  openAddItemModal(): void {
    this.currentItem = this.getEmptyItem();
    this.isEditMode = false;
    this.showAddItemModal = true;
  }

  editItem(item: InventoryItem): void {
    this.currentItem = { ...item };
    this.isEditMode = true;
    this.showAddItemModal = true;
  }

  async deleteItem(item: InventoryItem): Promise<void> {
    if (!item.id) return;
    
    if (confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      try {
        await this.db.deleteInventoryItem(item.id);
        await this.loadData();
        alert('Item deleted successfully');
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item. Please try again.');
      }
    }
  }

  async saveItem(): Promise<void> {
    if (!this.currentItem.name) {
      alert('Please enter item name');
      return;
    }

    try {
      if (this.currentItem.id) {
        await this.db.updateInventoryItem(this.currentItem.id, this.currentItem);
      } else {
        await this.db.createInventoryItem(this.currentItem);
      }
      await this.loadData();
      this.showAddItemModal = false;
    } catch (error) {
      console.error('Error saving item:', error);
    }
  }

  // Purchase Management
  openAddPurchaseModal(): void {
    this.currentPurchase = this.getEmptyPurchase();
    this.showAddPurchaseModal = true;
  }

  onPurchaseItemChange(): void {
    const item = this.inventoryItems.find(i => i.id === this.currentPurchase.inventoryItemId);
    if (item) {
      this.currentPurchase.inventoryItemName = item.name;
      this.currentPurchase.unit = item.unit;
    }
  }

  onPurchaseQuantityChange(): void {
    this.currentPurchase.totalCost = this.currentPurchase.quantity * this.currentPurchase.costPrice;
  }

  async savePurchase(): Promise<void> {
    if (!this.currentPurchase.inventoryItemId || this.currentPurchase.quantity <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await this.db.createPurchase(this.currentPurchase);
      await this.loadData();
      this.showAddPurchaseModal = false;
    } catch (error) {
      console.error('Error saving purchase:', error);
    }
  }

  // Adjustment Management
  openAddAdjustmentModal(): void {
    this.currentAdjustment = this.getEmptyAdjustment();
    this.showAddAdjustmentModal = true;
  }

  onAdjustmentItemChange(): void {
    const item = this.inventoryItems.find(i => i.id === this.currentAdjustment.inventoryItemId);
    if (item) {
      this.currentAdjustment.inventoryItemName = item.name;
      this.currentAdjustment.unit = item.unit;
    }
  }

  async saveAdjustment(): Promise<void> {
    if (!this.currentAdjustment.inventoryItemId || !this.currentAdjustment.reason) {
      alert('Please fill in all required fields');
      return;
    }

    // For consumption, wastage, or negative corrections, make quantity negative
    if (this.currentAdjustment.adjustmentType === 'consumption' || 
        this.currentAdjustment.adjustmentType === 'wastage') {
      this.currentAdjustment.quantity = -Math.abs(this.currentAdjustment.quantity);
    } else if (this.currentAdjustment.adjustmentType === 'correction' && 
               this.currentAdjustment.quantity > 0) {
      // Correction can be positive or negative, keep as entered
    }

    try {
      await this.db.createInventoryAdjustment(this.currentAdjustment);
      await this.loadData();
      this.showAddAdjustmentModal = false;
    } catch (error) {
      console.error('Error saving adjustment:', error);
    }
  }
}
