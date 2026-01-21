import { Injectable, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, user, User as FirebaseUser, setPersistence, browserLocalPersistence, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { User, ActivityLog } from '../models/models';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Observable of the current Firebase user
  user$: Observable<FirebaseUser | null>;
  currentUser: User | null = null;

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router,
    private envInjector: EnvironmentInjector,
    private db: DatabaseService
  ) {
    // Set persistence to keep session across page refreshes
    setPersistence(this.auth, browserLocalPersistence).catch((error) => {
      console.error('Failed to set auth persistence:', error);
    });
    
    this.user$ = user(this.auth);
    
    // Listen to auth state changes and load user data
    this.user$.subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        await this.loadUserData(firebaseUser.uid);
      } else {
        this.currentUser = null;
      }
    });
  }

  // Login with email and password
  async login(email: string, password: string): Promise<void> {
    try {
      console.log('Starting login for:', email);
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('Firebase auth successful, UID:', credential.user.uid);
      
      await this.loadUserData(credential.user.uid);
      console.log('User data loaded:', this.currentUser);
      
      if (!this.currentUser) {
        throw new Error('Failed to load user profile');
      }
      
      this.logActivity('Logged in');
      
      // Redirect based on role
      console.log('Redirecting user with role:', this.currentUser.role);
      if (this.currentUser?.role === 'admin') {
        this.router.navigate(['/dashboard']);
      } else if (this.currentUser?.role === 'cashier') {
        this.router.navigate(['/pos']);
      } else if (this.currentUser?.role === 'chef') {
        this.router.navigate(['/kitchen']);
      } else if (this.currentUser?.role === 'waiter') {
        this.router.navigate(['/waiter']);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message);
    }
  }

  // Load user data from Firestore
  private async loadUserData(uid: string): Promise<void> {
    try {
      const userDoc = doc(this.firestore, `users/${uid}`);
      const userSnapshot = await runInInjectionContext(this.envInjector, () => getDoc(userDoc));
      
      if (userSnapshot.exists()) {
        this.currentUser = { id: uid, ...userSnapshot.data() } as User;
      } else {
        console.error('User profile not found in Firestore for UID:', uid);
        throw new Error('User profile not found. Please contact administrator.');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      throw error;
    }
  }

  // Expose a safe method for guards to ensure profile is loaded
  async ensureUserLoaded(uid: string): Promise<void> {
    if (!this.currentUser || this.currentUser.id !== uid) {
      await this.loadUserData(uid);
    }
  }

  // Logout
  async logout(): Promise<void> {
    await signOut(this.auth);
    this.currentUser = null;
    this.router.navigate(['/login']);
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  // Check if user has a specific role
  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  // Create a new user account in Firebase Auth and Firestore
  async createUserAccount(email: string, password: string, userData: User): Promise<string> {
    try {
      // Create user in Firebase Authentication
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      const uid = credential.user.uid;

      // Create user document in Firestore
      const userDoc = doc(this.firestore, `users/${uid}`);
      await setDoc(userDoc, {
        ...userData,
        createdAt: new Date()
      });

      return uid;
    } catch (error: any) {
      console.error('Error creating user account:', error);
      throw new Error(error.message || 'Failed to create user account');
    }
  }

  // Log user activity
  private async logActivity(action: string, details?: string): Promise<void> {
    if (!this.currentUser) return;
    const log: ActivityLog = {
      userId: this.currentUser.id!,
      userName: this.currentUser.name,
      action,
      timestamp: new Date(),
      details,
    };
    try {
      await this.db.logActivity(log);
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  }
}
