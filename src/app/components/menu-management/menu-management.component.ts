import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { MenuItem, MenuCategory, RecipeItem, InventoryItem, Category } from '../../models/models';
import * as XLSX from 'xlsx';

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
  categories: Category[] = [];
  isLoading: boolean = false;
  showAddModal: boolean = false;
  showCategoryModal: boolean = false;
  
  // Form data for new/edit item
  currentItem: MenuItem = this.getEmptyItem();
  isEditMode: boolean = false;
  
  // Category management
  currentCategory: Category = this.getEmptyCategory();
  isCategoryEditMode: boolean = false;
  
  // Filter
  selectedCategory: string = 'all';
  searchText: string = '';

  constructor(private db: DatabaseService) {}

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
    await this.loadMenuItems();
    await this.loadInventoryItems();
  }

  getEmptyItem(): MenuItem {
    return {
      name: '',
      category: this.categories.length > 0 ? this.categories[0].name : '',
      price: 0,
      taxRate: 0,
      isActive: true,
      description: '',
      recipeMapping: []
    };
  }

  getEmptyCategory(): Category {
    return {
      name: '',
      displayOrder: this.categories.length,
      isActive: true
    };
  }

  async loadCategories(): Promise<void> {
    try {
      this.categories = await this.db.getCategories();
    } catch (error) {
      console.error('Error loading categories:', error);
    }
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
    }).sort((a, b) => {
      // Sort by category first
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      // Then sort alphabetically by name within the same category
      return a.name.localeCompare(b.name);
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

  // ============ CATEGORY MANAGEMENT ============
  openCategoryModal(): void {
    this.currentCategory = this.getEmptyCategory();
    this.isCategoryEditMode = false;
    this.showCategoryModal = true;
  }

  openEditCategoryModal(category: Category): void {
    this.currentCategory = { ...category };
    this.isCategoryEditMode = true;
    this.showCategoryModal = true;
  }

  closeCategoryModal(): void {
    this.showCategoryModal = false;
    this.currentCategory = this.getEmptyCategory();
    this.isCategoryEditMode = false;
  }

  resetCategoryForm(): void {
    this.currentCategory = this.getEmptyCategory();
    this.isCategoryEditMode = false;
  }

  async saveCategory(): Promise<void> {
    if (!this.currentCategory.name) {
      alert('Please enter a category name');
      return;
    }

    this.isLoading = true;
    try {
      if (this.isCategoryEditMode && this.currentCategory.id) {
        await this.db.updateCategory(this.currentCategory.id, this.currentCategory);
      } else {
        await this.db.createCategory(this.currentCategory);
      }
      await this.loadCategories();
      this.resetCategoryForm();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error saving category. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  async toggleCategoryActive(category: Category): Promise<void> {
    if (!category.id) return;
    
    try {
      await this.db.updateCategory(category.id, { isActive: !category.isActive });
      await this.loadCategories();
    } catch (error) {
      console.error('Error updating category:', error);
    }
  }

  async deleteCategory(category: Category): Promise<void> {
    if (!category.id) return;
    
    // Check if any menu items use this category
    const itemsInCategory = this.menuItems.filter(item => item.category === category.name);
    if (itemsInCategory.length > 0) {
      alert(`Cannot delete category "${category.name}" because ${itemsInCategory.length} menu item(s) are using it. Please reassign or delete those items first.`);
      return;
    }
    
    if (confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
      try {
        await this.db.deleteCategory(category.id);
        await this.loadCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  }

  exportToExcel(): void {
    // Sort menu items by category first, then alphabetically by name
    const sortedItems = [...this.menuItems].sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

    // Prepare data for export with only 3 columns
    const exportData = sortedItems.map(item => ({
      'Item Name': item.name,
      'Category': item.category,
      'Price (PKR)': item.price
    }));

    // Create worksheet
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 30 }, // Item Name
      { wch: 20 }, // Category
      { wch: 15 }  // Price
    ];
    ws['!cols'] = colWidths;

    // Create workbook
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Menu Items');

    // Generate filename with current date
    const date = new Date();
    const dateString = date.toISOString().split('T')[0];
    const filename = `Menu_Export_${dateString}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  }
}
