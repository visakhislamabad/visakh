import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { User, UserRole } from '../../models/models';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  showAddModal: boolean = false;
  isEditMode: boolean = false;
  currentUser: User = this.getEmptyUser();
  newPassword: string = '';
  
  roles: UserRole[] = ['super_admin', 'admin', 'cashier', 'chef', 'waiter'];

  get availableRoles(): UserRole[] {
    // Only super_admin can see and assign super_admin role
    if (this.authService.currentUser?.role === 'super_admin') {
      return this.roles;
    }
    // Admin and others cannot see super_admin in the dropdown
    return this.roles.filter(role => role !== 'super_admin');
  }

  constructor(private db: DatabaseService, private authService: AuthService) {}

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  getEmptyUser(): User {
    return {
      username: '',
      email: '',
      name: '',
      role: 'cashier',
      isActive: true
    };
  }

  canManageUser(user: User): boolean {
    // Super admin can manage everyone
    if (this.authService.currentUser?.role === 'super_admin') {
      return true;
    }
    // Admin cannot manage super_admin users
    return user.role !== 'super_admin';
  }

  async loadUsers(): Promise<void> {
    try {
      this.users = await this.db.getUsers();
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  openAddModal(): void {
    this.currentUser = this.getEmptyUser();
    this.newPassword = '';
    this.isEditMode = false;
    this.showAddModal = true;
  }

  openEditModal(user: User): void {
    if (!this.canManageUser(user)) {
      alert('You do not have permission to edit this user.');
      return;
    }
    this.currentUser = { ...user };
    this.newPassword = '';
    this.isEditMode = true;
    this.showAddModal = true;
  }

  async saveUser(): Promise<void> {
    if (!this.currentUser.name || !this.currentUser.email) {
      alert('Please fill in all required fields');
      return;
    }

    // Prevent admin from creating super_admin users
    if (this.currentUser.role === 'super_admin' && this.authService.currentUser?.role !== 'super_admin') {
      alert('You do not have permission to create or modify super admin users.');
      return;
    }

    // Validate password for new users only
    if (!this.isEditMode) {
      if (!this.newPassword || this.newPassword.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
      }
    }

    try {
      if (this.isEditMode && this.currentUser.id) {
        // Update existing user (name and role)
        const updateData: any = {
          name: this.currentUser.name,
          role: this.currentUser.role
        };
        // Only include pinCode if it has a value
        if (this.currentUser.pinCode) {
          updateData.pinCode = this.currentUser.pinCode;
        }
        await this.db.updateUser(this.currentUser.id, updateData);
        await this.db.logActivity({
          userId: this.authService.currentUser?.id || '',
          userName: this.authService.currentUser?.name || 'Admin',
          action: 'Edited User',
          details: `Updated ${this.currentUser.name} (${this.currentUser.role})`,
          timestamp: new Date()
        });
        alert('User updated successfully');
      } else {
        // Create new user in Firebase Authentication and Firestore
        const userId = await this.authService.createUserAccount(
          this.currentUser.email,
          this.newPassword,
          this.currentUser
        );
        alert('User created successfully! They can now log in with their email and password.');
      }
      await this.loadUsers();
      this.showAddModal = false;
    } catch (error: any) {
      console.error('Error saving user:', error);
      alert('Error saving user: ' + (error.message || 'Unknown error'));
    }
  }

  async toggleActive(user: User): Promise<void> {
    if (!user.id) return;
    
    if (!this.canManageUser(user)) {
      alert('You do not have permission to change this user\'s status.');
      return;
    }
    
    try {
      await this.db.updateUser(user.id, { isActive: !user.isActive });
      await this.loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }
}
