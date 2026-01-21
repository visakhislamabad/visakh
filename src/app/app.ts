import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'Restaurant Management System';
  showNav: boolean = false;

  constructor(
    public authService: AuthService,
    private router: Router
  ) {
    // Check if current route is login to hide nav
    this.router.events.subscribe(() => {
      this.showNav = !this.router.url.includes('login');
    });
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }
}
