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
  
  roles: UserRole[] = ['admin', 'cashier', 'chef', 'waiter'];

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
    
    try {
      await this.db.updateUser(user.id, { isActive: !user.isActive });
      await this.loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }
}
