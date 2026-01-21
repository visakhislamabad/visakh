import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { Order, MenuItem } from '../../models/models';

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kitchen.component.html',
  styleUrl: './kitchen.component.css'
})
export class KitchenComponent implements OnInit {
  orders: Order[] = [];
  readyOrders: Order[] = [];
  isLoading: boolean = false;

  constructor(private db: DatabaseService, private authService: AuthService) {}

  async ngOnInit(): Promise<void> {
    await this.loadOrders();
    // Refresh every 10 seconds
    setInterval(() => this.loadOrders(), 10000);
  }

  async loadOrders(): Promise<void> {
    try {
      const allOrders = await this.db.getTodayOrders();
      // Active for kitchen prep
      this.orders = allOrders.filter(o => o.status === 'pending' || o.status === 'cooking');
      // Ready queue visible to kitchen to handoff
      this.readyOrders = allOrders.filter(o => o.status === 'ready');
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }

  async startCooking(order: Order): Promise<void> {
    if (!order.id) return;
    
    try {
      await this.db.updateOrder(order.id, { 
        status: 'cooking',
        startedCookingAt: new Date()
      });
      await this.loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  }

  async markReady(order: Order): Promise<void> {
    if (!order.id) return;
    
    try {
      await this.db.updateOrder(order.id, { 
        status: 'ready',
        readyAt: new Date()
      });
      await this.loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  }

  async markCompleted(order: Order): Promise<void> {
    if (!order.id) return;
    try {
      await this.db.updateOrder(order.id, {
        status: 'completed',
        completedAt: new Date()
      });
      
      // Deduct inventory for this order
      await this.deductInventoryForOrder(order);
      
      await this.loadOrders();
    } catch (error) {
      console.error('Error completing order:', error);
    }
  }

  async deductInventoryForOrder(order: Order): Promise<void> {
    for (const orderItem of order.items) {
      const menuItem = await this.db.getMenuItem(orderItem.menuItemId);
      if (!menuItem) continue;

      // Handle prepared items linked directly
      if (menuItem.preparedItemId) {
        const adjustment = {
          inventoryItemId: menuItem.preparedItemId,
          inventoryItemName: menuItem.name,
          adjustmentType: 'consumption' as const,
          quantity: -orderItem.quantity,
          unit: menuItem.unit || 'pieces',
          reason: `Completed Order ${order.orderNumber}`,
          adjustedBy: this.authService.currentUser?.name || 'Kitchen',
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
          const totalQuantity = recipe.quantityUsed * orderItem.quantity;
          const adjustment = {
            inventoryItemId: recipe.inventoryItemId,
            inventoryItemName: recipe.inventoryItemName,
            adjustmentType: 'consumption' as const,
            quantity: -totalQuantity,
            unit: recipe.unit,
            reason: `Completed ${orderItem.quantity}x ${menuItem.name} - Order ${order.orderNumber}`,
            adjustedBy: this.authService.currentUser?.name || 'Kitchen',
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

  getElapsedTime(order: Order): string {
    const now = new Date();
    const created = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
    const diffMs = now.getTime() - created.getTime();
    const minutes = Math.floor(diffMs / 60000);
    return `${minutes} min`;
  }
}
