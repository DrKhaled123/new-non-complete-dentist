import { STORAGE_KEYS } from '../types';

/**
 * StorageService - Handles all localStorage operations with error handling
 * 
 * Features:
 * - Type-safe storage operations
 * - Quota exceeded error handling
 * - JSON serialization/deserialization
 * - Prefix-based key management
 * - Storage cleanup utilities
 */
class StorageService {
  /**
   * Save data to localStorage with JSON serialization
   */
  saveToStorage<T>(key: string, data: T): void {
    try {
      const serializedData = JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(key, serializedData);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded. Attempting cleanup...');
        this.cleanupOldEntries();
        
        // Retry once after cleanup
        try {
          const serializedData = JSON.stringify({
            data,
            timestamp: new Date().toISOString(),
          });
          localStorage.setItem(key, serializedData);
        } catch (retryError) {
          console.error('Failed to save to localStorage after cleanup:', retryError);
          throw new Error('Storage quota exceeded. Please clear browser data.');
        }
      } else {
        console.error('Failed to save to localStorage:', error);
        throw error;
      }
    }
  }

  /**
   * Get data from localStorage with JSON deserialization
   */
  getFromStorage<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) {
        return null;
      }

      const parsed = JSON.parse(item);
      
      // Handle both new format (with timestamp) and legacy format
      if (parsed && typeof parsed === 'object' && 'data' in parsed) {
        return parsed.data as T;
      } else {
        // Legacy format - just return the data directly
        return parsed as T;
      }
    } catch (error) {
      console.error(`Failed to parse localStorage item "${key}":`, error);
      // Remove corrupted item
      this.removeFromStorage(key);
      return null;
    }
  }

  /**
   * Remove item from localStorage
   */
  removeFromStorage(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove localStorage item "${key}":`, error);
    }
  }

  /**
   * Clear all localStorage data
   */
  clearStorage(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }

  /**
   * Get all keys with a specific prefix
   */
  getKeysWithPrefix(prefix: string): string[] {
    const keys: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }
    } catch (error) {
      console.error('Failed to get keys from localStorage:', error);
    }
    return keys;
  }

  /**
   * Remove all items with a specific prefix
   */
  clearPrefix(prefix: string): void {
    const keys = this.getKeysWithPrefix(prefix);
    keys.forEach(key => this.removeFromStorage(key));
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; available: number; total: number } {
    let used = 0;
    try {
      // Calculate used space
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            used += key.length + value.length;
          }
        }
      }
    } catch (error) {
      console.error('Failed to calculate storage usage:', error);
    }

    // Estimate total available space (varies by browser, typically 5-10MB)
    const total = 10 * 1024 * 1024; // 10MB estimate
    const available = total - used;

    return { used, available, total };
  }

  /**
   * Check if localStorage is available
   */
  isStorageAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up old entries to free space
   * Removes entries older than 30 days
   */
  private cleanupOldEntries(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEYS.CACHE_PREFIX)) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const parsed = JSON.parse(item);
              if (parsed.timestamp) {
                const itemDate = new Date(parsed.timestamp);
                if (itemDate < thirtyDaysAgo) {
                  keysToRemove.push(key);
                }
              }
            } catch {
              // If we can't parse it, it's probably old format - remove it
              keysToRemove.push(key);
            }
          }
        }
      }

      keysToRemove.forEach(key => this.removeFromStorage(key));
      console.log(`Cleaned up ${keysToRemove.length} old cache entries`);
    } catch (error) {
      console.error('Failed to cleanup old entries:', error);
    }
  }

  /**
   * Export all data for backup
   */
  exportData(): string {
    const data: Record<string, any> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            data[key] = value;
          }
        }
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    }
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from backup
   */
  importData(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'string') {
          localStorage.setItem(key, value);
        }
      });
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error('Invalid backup data format');
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
export default storageService;