import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { MenuItem, MenuCategory, RecipeItem, InventoryItem } from '../../models/models';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu-management.component.html',
  styleUrl: './menu-management.component.css'
})
export class MenuManagementComponent implements OnInit {
  menuItems: MenuItem[] = [];
  filteredItems: MenuItem[] = [];
  inventoryItems: InventoryItem[] = [];
  isLoading: boolean = false;
  showAddModal: boolean = false;
  
  // Form data for new/edit item
  currentItem: MenuItem = this.getEmptyItem();
  isEditMode: boolean = false;
  
  // Categories for dropdown
  categories: MenuCategory[] = ['BBQ', 'Curries', 'Rice', 'Bread', 'Salads', 'Drinks', 'Desserts'];
  
  // Filter
  selectedCategory: string = 'all';
  searchText: string = '';

  constructor(private db: DatabaseService) {}

  async ngOnInit(): Promise<void> {
    await this.loadMenuItems();
    await this.loadInventoryItems();
  }

  getEmptyItem(): MenuItem {
    return {
      name: '',
      category: 'BBQ',
      price: 0,
      taxRate: 0,
      isActive: true,
      description: '',
      recipeMapping: []
    };
  }

  async loadMenuItems(): Promise<void> {
    this.isLoading = true;
    try {
      this.menuItems = await this.db.getMenuItems();
      this.applyFilters();
    } catch (error) {
      console.error('Error loading menu items:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadInventoryItems(): Promise<void> {
    try {
      this.inventoryItems = await this.db.getInventoryItems();
    } catch (error) {
      console.error('Error loading inventory items:', error);
    }
  }

  applyFilters(): void {
    this.filteredItems = this.menuItems.filter(item => {
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

  openAddModal(): void {
    this.currentItem = this.getEmptyItem();
    this.isEditMode = false;
    this.showAddModal = true;
  }

  openEditModal(item: MenuItem): void {
    this.currentItem = { 
      ...item,
      recipeMapping: item.recipeMapping ? [...item.recipeMapping] : []
    };
    this.isEditMode = true;
    this.showAddModal = true;
  }

  closeModal(): void {
    this.showAddModal = false;
    this.currentItem = this.getEmptyItem();
  }

  async saveItem(): Promise<void> {
    if (!this.currentItem.name || this.currentItem.price <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    this.isLoading = true;
    try {
      if (this.isEditMode && this.currentItem.id) {
        await this.db.updateMenuItem(this.currentItem.id, this.currentItem);
      } else {
        await this.db.createMenuItem(this.currentItem);
      }
      await this.loadMenuItems();
      this.closeModal();
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Error saving item. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  async toggleActive(item: MenuItem): Promise<void> {
    if (!item.id) return;
    
    try {
      await this.db.updateMenuItem(item.id, { isActive: !item.isActive });
      await this.loadMenuItems();
    } catch (error) {
      console.error('Error updating menu item:', error);
    }
  }

  async deleteItem(item: MenuItem): Promise<void> {
    if (!item.id) return;
    
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await this.db.deleteMenuItem(item.id);
        await this.loadMenuItems();
      } catch (error) {
        console.error('Error deleting menu item:', error);
      }
    }
  }

  addRecipeItem(): void {
    if (!this.currentItem.recipeMapping) {
      this.currentItem.recipeMapping = [];
    }
    this.currentItem.recipeMapping.push({
      inventoryItemId: '',
      inventoryItemName: '',
      quantityUsed: 0,
      unit: ''
    });
  }

  removeRecipeItem(index: number): void {
    if (this.currentItem.recipeMapping) {
      this.currentItem.recipeMapping.splice(index, 1);
    }
  }

  onInventorySelect(recipeItem: RecipeItem, event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const itemId = selectElement.value;
    const inventoryItem = this.inventoryItems.find(i => i.id === itemId);
    if (inventoryItem) {
      recipeItem.inventoryItemId = inventoryItem.id!;
      recipeItem.inventoryItemName = inventoryItem.name;
      recipeItem.unit = inventoryItem.unit;
    }
  }
}
