import { Profile, AuthSession, STORAGE_KEYS, SESSION_TIMEOUT } from '../types';
import { hashPassword, verifyPassword, generateSecureToken } from '../utils/encryption';
import storageService from './storageService';

/**
 * AuthService - Handles user authentication and session management
 * 
 * Features:
 * - User registration with password hashing
 * - Secure login with password verification
 * - Session management with timeout
 * - Profile data isolation
 * - Automatic session cleanup
 */
class AuthService {
  private sessionCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startSessionMonitoring();
  }

  /**
   * Register a new user profile
   */
  async register(email: string, password: string, name: string): Promise<Profile> {
    try {
      // Validate input
      if (!email || !password || !name) {
        throw new Error('All fields are required');
      }

      if (!this.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Check if user already exists
      const existingProfile = storageService.getFromStorage<Profile>(
        `${STORAGE_KEYS.PROFILE_PREFIX}${email}`
      );

      if (existingProfile) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create profile
      const profile: Profile = {
        id: generateSecureToken(16),
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
      };

      // Save profile
      storageService.saveToStorage(
        `${STORAGE_KEYS.PROFILE_PREFIX}${profile.email}`,
        profile
      );

      // Auto-login after registration
      await this.createSession(profile);

      return profile;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<Profile> {
    try {
      // Validate input
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Get profile
      const profile = storageService.getFromStorage<Profile>(
        `${STORAGE_KEYS.PROFILE_PREFIX}${email.toLowerCase().trim()}`
      );

      if (!profile) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, profile.passwordHash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      profile.lastLogin = new Date();
      profile.updatedAt = new Date();

      storageService.saveToStorage(
        `${STORAGE_KEYS.PROFILE_PREFIX}${profile.email}`,
        profile
      );

      // Create session
      await this.createSession(profile);

      return profile;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Logout current user
   */
  logout(): void {
    try {
      // Clear session
      storageService.removeFromStorage(STORAGE_KEYS.CURRENT_SESSION);

      // Stop session monitoring
      if (this.sessionCheckInterval) {
        clearInterval(this.sessionCheckInterval);
        this.sessionCheckInterval = null;
      }

      // Clear any cached data for security
      storageService.clearPrefix(STORAGE_KEYS.CACHE_PREFIX);

      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  /**
   * Get current authenticated profile
   */
  getCurrentProfile(): Profile | null {
    try {
      const session = this.getCurrentSession();
      if (!session) {
        return null;
      }

      // Get full profile data
      const profile = storageService.getFromStorage<Profile>(
        `${STORAGE_KEYS.PROFILE_PREFIX}${session.email}`
      );

      return profile;
    } catch (error) {
      console.error('Failed to get current profile:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const session = this.getCurrentSession();
    return session !== null && !this.isSessionExpired(session);
  }

  /**
   * Get current session
   */
  getCurrentSession(): AuthSession | null {
    try {
      const session = storageService.getFromStorage<AuthSession>(STORAGE_KEYS.CURRENT_SESSION);
      
      if (!session) {
        return null;
      }

      // Check if session is expired
      if (this.isSessionExpired(session)) {
        this.logout();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to get current session:', error);
      return null;
    }
  }

  /**
   * Update profile information
   */
  async updateProfile(updates: Partial<Pick<Profile, 'name' | 'email'>>): Promise<Profile> {
    try {
      const currentProfile = this.getCurrentProfile();
      if (!currentProfile) {
        throw new Error('No authenticated user');
      }

      // Validate email if being updated
      if (updates.email && !this.isValidEmail(updates.email)) {
        throw new Error('Invalid email format');
      }

      // Check if new email already exists
      if (updates.email && updates.email !== currentProfile.email) {
        const existingProfile = storageService.getFromStorage<Profile>(
          `${STORAGE_KEYS.PROFILE_PREFIX}${updates.email.toLowerCase().trim()}`
        );

        if (existingProfile) {
          throw new Error('Email already in use');
        }
      }

      // Update profile
      const updatedProfile: Profile = {
        ...currentProfile,
        ...updates,
        updatedAt: new Date(),
      };

      // If email changed, move the profile to new key
      if (updates.email && updates.email !== currentProfile.email) {
        // Remove old profile
        storageService.removeFromStorage(
          `${STORAGE_KEYS.PROFILE_PREFIX}${currentProfile.email}`
        );

        // Save with new email key
        storageService.saveToStorage(
          `${STORAGE_KEYS.PROFILE_PREFIX}${updatedProfile.email}`,
          updatedProfile
        );

        // Update session
        const session = this.getCurrentSession();
        if (session) {
          session.email = updatedProfile.email;
          storageService.saveToStorage(STORAGE_KEYS.CURRENT_SESSION, session);
        }
      } else {
        // Save updated profile
        storageService.saveToStorage(
          `${STORAGE_KEYS.PROFILE_PREFIX}${updatedProfile.email}`,
          updatedProfile
        );
      }

      return updatedProfile;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const profile = this.getCurrentProfile();
      if (!profile) {
        throw new Error('No authenticated user');
      }

      // Verify current password
      const isValidPassword = await verifyPassword(currentPassword, profile.passwordHash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update profile
      profile.passwordHash = newPasswordHash;
      profile.updatedAt = new Date();

      storageService.saveToStorage(
        `${STORAGE_KEYS.PROFILE_PREFIX}${profile.email}`,
        profile
      );

      console.log('Password changed successfully');
    } catch (error) {
      console.error('Password change failed:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   */
  deleteAccount(): void {
    try {
      const profile = this.getCurrentProfile();
      if (!profile) {
        throw new Error('No authenticated user');
      }

      // Remove profile
      storageService.removeFromStorage(
        `${STORAGE_KEYS.PROFILE_PREFIX}${profile.email}`
      );

      // Remove all user's cases
      const caseKeys = storageService.getKeysWithPrefix(
        `${STORAGE_KEYS.CASE_PREFIX}${profile.id}_`
      );
      caseKeys.forEach(key => storageService.removeFromStorage(key));

      // Logout
      this.logout();

      console.log('Account deleted successfully');
    } catch (error) {
      console.error('Account deletion failed:', error);
      throw error;
    }
  }

  /**
   * Create authentication session
   */
  private async createSession(profile: Profile): Promise<void> {
    const session: AuthSession = {
      profileId: profile.id,
      email: profile.email,
      name: profile.name,
      token: generateSecureToken(32),
      expiresAt: new Date(Date.now() + SESSION_TIMEOUT),
    };

    storageService.saveToStorage(STORAGE_KEYS.CURRENT_SESSION, session);

    // Start session monitoring
    this.startSessionMonitoring();
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: AuthSession): boolean {
    return new Date() > new Date(session.expiresAt);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Start session monitoring for automatic logout
   */
  private startSessionMonitoring(): void {
    // Clear existing interval
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    // Check session every minute
    this.sessionCheckInterval = setInterval(() => {
      const session = storageService.getFromStorage<AuthSession>(STORAGE_KEYS.CURRENT_SESSION);
      
      if (session && this.isSessionExpired(session)) {
        console.log('Session expired, logging out...');
        this.logout();
      }
    }, 60000); // Check every minute
  }

  /**
   * Extend current session
   */
  extendSession(): void {
    try {
      const session = this.getCurrentSession();
      if (session) {
        session.expiresAt = new Date(Date.now() + SESSION_TIMEOUT);
        storageService.saveToStorage(STORAGE_KEYS.CURRENT_SESSION, session);
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
  }

  /**
   * Get session time remaining in minutes
   */
  getSessionTimeRemaining(): number {
    const session = this.getCurrentSession();
    if (!session) {
      return 0;
    }

    const remaining = new Date(session.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(remaining / (1000 * 60)));
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;