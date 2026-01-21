import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService } from '../../services/database.service';
import { InventoryItem, ActivityLog } from '../../models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  // Stats
  totalSalesToday: number = 0;
  totalOrdersToday: number = 0;
  totalExpensesToday: number = 0;
  profitToday: number = 0;
  lowStockItems: InventoryItem[] = [];
  recentActivities: ActivityLog[] = [];
  
  // Sales vs Expenses data (last 7 days)
  chartData: { date: string; sales: number; expenses: number }[] = [];
  maxChartValue: number = 100;
  weekOrdersCount: number = 0;
  weekPurchasesCount: number = 0;
  weekOrderStatusCounts: Record<string, number> = {};
  
  isLoading: boolean = true;

  constructor(private db: DatabaseService) {}

  async ngOnInit(): Promise<void> {
    await this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    this.isLoading = true;
    
    try {
      // Parallelize independent loads to reduce total latency
      const results = await Promise.allSettled([
        this.db.getTodaySales(),
        this.db.getTodayExpenses(),
        this.db.getTodayOrders(),
        this.db.getLowStockItems(),
        this.db.getRecentActivityLogs(5)
      ]);

      const [salesRes, expensesRes, ordersRes, lowStockRes, activitiesRes] = results;

      if (salesRes.status === 'fulfilled') {
        this.totalSalesToday = salesRes.value;
      } else {
        console.error('Failed to load today sales:', salesRes.reason);
      }

      if (expensesRes.status === 'fulfilled') {
        this.totalExpensesToday = expensesRes.value;
      } else {
        console.error('Failed to load today expenses:', expensesRes.reason);
      }

      this.profitToday = this.totalSalesToday - this.totalExpensesToday;

      if (ordersRes.status === 'fulfilled') {
        this.totalOrdersToday = ordersRes.value.length;
      } else {
        console.error('Failed to load today orders:', ordersRes.reason);
      }

      if (lowStockRes.status === 'fulfilled') {
        this.lowStockItems = lowStockRes.value;
      } else {
        console.error('Failed to load low stock items:', lowStockRes.reason);
      }

      if (activitiesRes.status === 'fulfilled') {
        this.recentActivities = activitiesRes.value;
        console.log('Recent activities loaded:', this.recentActivities.length, this.recentActivities);
      } else {
        console.error('Failed to load recent activities:', activitiesRes.reason);
      }

      // Load last 7 days data for chart
      try {
        await this.loadChartData();
      } catch (chartErr) {
        console.error('Failed to load chart data:', chartErr);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadChartData(): Promise<void> {
    this.chartData = [];
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    console.log('Loading chart data from', start, 'to', end);

    // Fetch orders and purchases for the whole week in two queries
    const [weekOrders, weekPurchases] = await Promise.all([
      this.db.getOrdersByDateRange(start, end),
      this.db.getPurchasesByDateRange(start, end)
    ]);

    console.log('Week orders:', weekOrders.length, weekOrders);
    console.log('Week purchases:', weekPurchases.length, weekPurchases);

    this.weekOrdersCount = weekOrders.length;
    this.weekPurchasesCount = weekPurchases.length;
    this.weekOrderStatusCounts = weekOrders.reduce((acc: Record<string, number>, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    // Helper to normalize Firestore Timestamp/Date/string to Date
    const toDate = (value: any): Date => {
      if (!value) return new Date(NaN);
      if (value.toDate && typeof value.toDate === 'function') return value.toDate();
      if (value instanceof Date) return value as Date;
      return new Date(value);
    };

    // Helper to get local date key (YYYY-MM-DD) without timezone conversion
    const getLocalDateKey = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Initialize buckets for each day
    const buckets: Record<string, { label: string; sales: number; expenses: number }> = {};
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const key = getLocalDateKey(day); // Use local date instead of UTC
      buckets[key] = { label: this.formatDate(day), sales: 0, expenses: 0 };
    }

    // Aggregate sales per day
    for (const order of weekOrders) {
      if (order.status !== 'completed') continue;
      const d = toDate(order.createdAt);
      const key = isNaN(d.getTime()) ? '' : getLocalDateKey(d); // Use local date
      console.log('Order date:', order.createdAt, '-> parsed:', d, '-> key:', key, '-> amount:', order.totalAmount);
      if (key && buckets[key]) {
        buckets[key].sales += order.totalAmount || 0;
      }
    }

    // Aggregate expenses per day
    for (const p of weekPurchases) {
      const d = toDate(p.date);
      const key = isNaN(d.getTime()) ? '' : getLocalDateKey(d); // Use local date
      console.log('Purchase date:', p.date, '-> parsed:', d, '-> key:', key, '-> cost:', p.totalCost);
      if (key && buckets[key]) {
        buckets[key].expenses += p.totalCost || 0;
      }
    }

    // Build chart data in order
    this.chartData = Object.keys(buckets)
      .sort()
      .map(k => ({ date: buckets[k].label, sales: buckets[k].sales, expenses: buckets[k].expenses }));

    console.log('Buckets after aggregation:', JSON.stringify(buckets, null, 2));
    console.log('Chart data array:', JSON.stringify(this.chartData, null, 2));

    // Precompute max chart value for template use
    const allValues = this.chartData.flatMap(d => [d.sales, d.expenses]);
    this.maxChartValue = Math.max(...allValues, 100);
    console.log('Max chart value:', this.maxChartValue, 'All values:', allValues);
  }

  formatDate(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }

  formatCurrency(amount: number): string {
    return `${amount.toFixed(0)}`;
  }

  // maxChartValue is computed after chartData is built

  get debugInfo() {
    const nonZeroDays = this.chartData.filter(d => (d.sales > 0 || d.expenses > 0));
    return {
      maxChartValue: this.maxChartValue,
      chartData: this.chartData,
      nonZeroDays,
      allValues: this.chartData.flatMap(d => [d.sales, d.expenses]),
      recentCount: this.recentActivities.length,
      totals: {
        salesToday: this.totalSalesToday,
        expensesToday: this.totalExpensesToday,
        ordersToday: this.totalOrdersToday,
        profitToday: this.profitToday,
      },
      weekOrdersCount: this.weekOrdersCount,
      weekPurchasesCount: this.weekPurchasesCount,
      weekOrderStatusCounts: this.weekOrderStatusCounts,
    };
  }
}
