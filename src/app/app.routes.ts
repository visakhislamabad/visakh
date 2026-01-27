import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MenuManagementComponent } from './components/menu-management/menu-management.component';
import { InventoryComponent } from './components/inventory/inventory.component';
import { PosComponent } from './components/pos/pos.component';
import { KitchenComponent } from './components/kitchen/kitchen.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { ReportsComponent } from './components/reports/reports.component';
import { WaiterComponent } from './components/waiter/waiter.component';
import { DealManagementComponent } from './components/deal-management/deal-management.component';
import { CustomerManagementComponent } from './components/customer-management/customer-management.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard, adminGuard] },
  { path: 'menu', component: MenuManagementComponent, canActivate: [authGuard, adminGuard] },
  { path: 'deals', component: DealManagementComponent, canActivate: [authGuard, adminGuard] },
  { path: 'inventory', component: InventoryComponent, canActivate: [authGuard, adminGuard] },
  { path: 'customers', component: CustomerManagementComponent, canActivate: [authGuard, adminGuard] },
  { path: 'pos', component: PosComponent, canActivate: [authGuard] },
  { path: 'kitchen', component: KitchenComponent, canActivate: [authGuard] },
  { path: 'waiter', component: WaiterComponent, canActivate: [authGuard] },
  { path: 'users', component: UserManagementComponent, canActivate: [authGuard, adminGuard] },
  { path: 'reports', component: ReportsComponent, canActivate: [authGuard, adminGuard] },
  { path: '**', redirectTo: '/login' }
];
