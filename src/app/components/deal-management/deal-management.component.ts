import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { Deal, DealMenuItem, MenuItem, MenuCategory } from '../../models/models';

@Component({
  selector: 'app-deal-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './deal-management.component.html',
  styleUrl: './deal-management.component.css'
})
export class DealManagementComponent implements OnInit {
  deals: Deal[] = [];
  menuItems: MenuItem[] = [];
  showDealModal: boolean = false;
  isEditMode: boolean = false;
  currentDeal: Deal = this.getEmptyDeal();
  
  // Deal creator state
  selectedMenuItemId: string = '';
  itemQuantity: number = 1;
  selectedItemCategory: MenuCategory | 'All' = 'All';
  itemCategories: (MenuCategory | 'All')[] = ['All', 'BBQ', 'Curries', 'Rice', 'Bread', 'Salads', 'Drinks', 'Desserts'];

  constructor(private db: DatabaseService, public authService: AuthService) {}

  async ngOnInit(): Promise<void> {
    await this.loadDeals();
    await this.loadMenuItems();
  }

  getEmptyDeal(): Deal {
    return {
      name: '',
      description: '',
      items: [],
      originalPrice: 0,
      dealPrice: 0,
      savings: 0,
      savingsPercent: 0,
      isActive: true
    };
  }

  async loadDeals(): Promise<void> {
    try {
      this.deals = await this.db.getDeals();
    } catch (error) {
      console.error('Error loading deals:', error);
    }
  }

  async loadMenuItems(): Promise<void> {
    try {
      this.menuItems = await this.db.getActiveMenuItems();
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  }

  get filteredMenuItems(): MenuItem[] {
    if (this.selectedItemCategory === 'All') return this.menuItems;
    return this.menuItems.filter(m => m.category === this.selectedItemCategory);
  }

  openAddModal(): void {
    this.currentDeal = this.getEmptyDeal();
    this.isEditMode = false;
    this.showDealModal = true;
  }

  openEditModal(deal: Deal): void {
    this.currentDeal = { ...deal, items: [...deal.items] };
    this.isEditMode = true;
    this.showDealModal = true;
  }

  addItemToDeal(): void {
    if (!this.selectedMenuItemId) {
      alert('Please select a menu item');
      return;
    }
    
    const menuItem = this.menuItems.find(m => m.id === this.selectedMenuItemId);
    if (!menuItem) return;

    // Check if item already exists
    const existing = this.currentDeal.items.find(i => i.menuItemId === this.selectedMenuItemId);
    if (existing) {
      existing.quantity += this.itemQuantity;
    } else {
      this.currentDeal.items.push({
        menuItemId: menuItem.id!,
        menuItemName: menuItem.name,
        quantity: this.itemQuantity,
        standardPrice: menuItem.price
      });
    }

    // Recalculate prices
    this.calculateDealPrices();
    
    // Reset
    this.selectedMenuItemId = '';
    this.itemQuantity = 1;
  }

  removeItemFromDeal(item: DealMenuItem): void {
    this.currentDeal.items = this.currentDeal.items.filter(i => i !== item);
    this.calculateDealPrices();
  }

  updateItemQuantity(item: DealMenuItem, qty: number): void {
    item.quantity = Math.max(1, qty);
    this.calculateDealPrices();
  }

  calculateDealPrices(): void {
    this.currentDeal.originalPrice = this.currentDeal.items.reduce(
      (sum, item) => sum + (item.standardPrice * item.quantity), 0
    );
    
    // Calculate savings
    if (this.currentDeal.dealPrice > 0) {
      this.currentDeal.savings = this.currentDeal.originalPrice - this.currentDeal.dealPrice;
      this.currentDeal.savingsPercent = this.currentDeal.originalPrice > 0 
        ? (this.currentDeal.savings / this.currentDeal.originalPrice) * 100 
        : 0;
    } else {
      this.currentDeal.savings = 0;
      this.currentDeal.savingsPercent = 0;
    }
  }

  onDealPriceChange(): void {
    this.calculateDealPrices();
  }

  async saveDeal(): Promise<void> {
    if (!this.currentDeal.name || this.currentDeal.items.length === 0) {
      alert('Please enter deal name and add at least one item');
      return;
    }

    if (this.currentDeal.dealPrice <= 0) {
      alert('Please set a valid deal price');
      return;
    }

    try {
      if (this.isEditMode && this.currentDeal.id) {
        // Only include fields that have values to avoid Firestore undefined error
        const updateData: any = {
          name: this.currentDeal.name,
          description: this.currentDeal.description,
          items: this.currentDeal.items,
          originalPrice: this.currentDeal.originalPrice,
          dealPrice: this.currentDeal.dealPrice,
          savings: this.currentDeal.savings,
          savingsPercent: this.currentDeal.savingsPercent,
          isActive: this.currentDeal.isActive,
          choiceGroups: this.currentDeal.choiceGroups || []
        };
        
        // Only add date fields if they have values
        if (this.currentDeal.startDate) {
          updateData.startDate = this.currentDeal.startDate;
        }
        if (this.currentDeal.endDate) {
          updateData.endDate = this.currentDeal.endDate;
        }
        
        await this.db.updateDeal(this.currentDeal.id, updateData);
        await this.db.logActivity({
          userId: this.authService.currentUser?.id || '',
          userName: this.authService.currentUser?.name || 'Admin',
          action: 'Edited Deal',
          details: `${this.currentDeal.name} - ${this.currentDeal.dealPrice} PKR`,
          timestamp: new Date()
        });
        alert('Deal updated successfully');
      } else {
        await this.db.createDeal(this.currentDeal);
        await this.db.logActivity({
          userId: this.authService.currentUser?.id || '',
          userName: this.authService.currentUser?.name || 'Admin',
          action: 'Created Deal',
          details: `${this.currentDeal.name} - ${this.currentDeal.dealPrice} PKR`,
          timestamp: new Date()
        });
        alert('Deal created successfully');
      }
      await this.loadDeals();
      this.showDealModal = false;
    } catch (error: any) {
      console.error('Error saving deal:', error);
      alert('Error saving deal: ' + (error.message || 'Unknown error'));
    }
  }

  async toggleActive(deal: Deal): Promise<void> {
    if (!deal.id) return;
    
    try {
      await this.db.updateDeal(deal.id, { isActive: !deal.isActive });
      await this.loadDeals();
    } catch (error) {
      console.error('Error updating deal:', error);
    }
  }

  async deleteDeal(deal: Deal): Promise<void> {
    if (!deal.id) return;
    
    if (!confirm(`Delete deal "${deal.name}"?`)) return;
    
    try {
      await this.db.deleteDeal(deal.id);
      alert('Deal deleted successfully');
      await this.loadDeals();
    } catch (error) {
      console.error('Error deleting deal:', error);
      alert('Error deleting deal');
    }
  }
}
