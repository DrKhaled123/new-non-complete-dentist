import { Drug, Procedure, Material, CACHE_TTL } from '../../types';
import { drugDataService } from '../drugDataService';
import { procedureDataService } from '../procedureDataService';
import { materialDataService } from '../materialDataService';
import { medicalContentValidator, ValidationResult } from './contentValidator';
import storageService from '../storageService';

/**
 * Medical Data Synchronization Service
 * 
 * Centralized service for fetching, validating, and synchronizing
 * all medical content across the application
 */

export interface SyncStatus {
  isLoading: boolean;
  lastSync: Date | null;
  errors: SyncError[];
  dataQuality: DataQualityReport;
}

export interface SyncError {
  service: 'drugs' | 'procedures' | 'materials';
  message: string;
  timestamp: Date;
  retryCount: number;
}

export interface DataQualityReport {
  drugs: {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
  };
  procedures: {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
  };
  materials: {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
  };
  overallScore: number; // 0-100
}

export interface MedicalDataCache {
  drugs: Drug[];
  procedures: Procedure[];
  materials: Material[];
  validationResults: {
    drugs: ValidationResult[];
    procedures: ValidationResult[];
    materials: ValidationResult[];
  };
  lastUpdated: Date;
  version: string;
}

class MedicalDataSyncService {
  private syncStatus: SyncStatus = {
    isLoading: false,
    lastSync: null,
    errors: [],
    dataQuality: {
      drugs: { total: 0, valid: 0, warnings: 0, errors: 0 },
      procedures: { total: 0, valid: 0, warnings: 0, errors: 0 },
      materials: { total: 0, valid: 0, warnings: 0, errors: 0 },
      overallScore: 0
    }
  };

  private readonly CACHE_KEY = 'medical_data_cache';
  private readonly SYNC_STATUS_KEY = 'medical_sync_status';
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  private listeners: Array<(status: SyncStatus) => void> = [];

  /**
   * Initialize medical data synchronization
   */
  async initialize(): Promise<void> {
    try {
      // Load cached sync status
      const cachedStatus = storageService.getFromStorage<SyncStatus>(this.SYNC_STATUS_KEY);
      if (cachedStatus) {
        this.syncStatus = { ...this.syncStatus, ...cachedStatus };
      }

      // Check if we need to sync
      const needsSync = this.shouldSync();
      
      if (needsSync) {
        await this.syncAllMedicalData();
      } else {
        // Load from cache
        await this.loadFromCache();
      }
    } catch (error) {
      console.error('Failed to initialize medical data sync:', error);
      this.addSyncError('drugs', 'Failed to initialize medical data synchronization');
    }
  }

  /**
   * Sync all medical data with validation
   */
  async syncAllMedicalData(force: boolean = false): Promise<void> {
    if (this.syncStatus.isLoading && !force) {
      return;
    }

    this.updateSyncStatus({ isLoading: true, errors: [] });

    try {
      // Sync drugs
      const drugs = await this.syncDrugs();
      
      // Sync procedures
      const procedures = await this.syncProcedures();
      
      // Sync materials
      const materials = await this.syncMaterials();

      // Validate all data
      const validationResults = await this.validateAllData(drugs, procedures, materials);

      // Generate data quality report
      const dataQuality = this.generateDataQualityReport(validationResults);

      // Cache the synchronized data
      const cache: MedicalDataCache = {
        drugs,
        procedures,
        materials,
        validationResults,
        lastUpdated: new Date(),
        version: this.generateVersion()
      };

      storageService.saveToStorage(this.CACHE_KEY, cache);

      this.updateSyncStatus({
        isLoading: false,
        lastSync: new Date(),
        dataQuality
      });

      console.log('Medical data synchronization completed successfully');
    } catch (error) {
      console.error('Medical data synchronization failed:', error);
      this.updateSyncStatus({ isLoading: false });
      this.addSyncError('drugs', 'Synchronization failed: ' + (error as Error).message);
    }
  }

  /**
   * Sync drug data with retry mechanism
   */
  private async syncDrugs(retryCount: number = 0): Promise<Drug[]> {
    try {
      const drugs = await drugDataService.loadDrugDatabase();
      console.log(`Loaded ${drugs.length} drugs from database`);
      return drugs;
    } catch (error) {
      if (retryCount < this.MAX_RETRY_ATTEMPTS) {
        console.warn(`Drug sync failed, retrying... (${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS})`);
        await this.delay(this.RETRY_DELAY * (retryCount + 1));
        return this.syncDrugs(retryCount + 1);
      }
      
      this.addSyncError('drugs', `Failed to sync drugs after ${this.MAX_RETRY_ATTEMPTS} attempts`);
      throw error;
    }
  }

  /**
   * Sync procedure data with retry mechanism
   */
  private async syncProcedures(retryCount: number = 0): Promise<Procedure[]> {
    try {
      const procedures = await procedureDataService.loadProcedures();
      console.log(`Loaded ${procedures.length} procedures from database`);
      return procedures;
    } catch (error) {
      if (retryCount < this.MAX_RETRY_ATTEMPTS) {
        console.warn(`Procedure sync failed, retrying... (${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS})`);
        await this.delay(this.RETRY_DELAY * (retryCount + 1));
        return this.syncProcedures(retryCount + 1);
      }
      
      this.addSyncError('procedures', `Failed to sync procedures after ${this.MAX_RETRY_ATTEMPTS} attempts`);
      throw error;
    }
  }

  /**
   * Sync material data with retry mechanism
   */
  private async syncMaterials(retryCount: number = 0): Promise<Material[]> {
    try {
      const materials = await materialDataService.loadMaterials();
      console.log(`Loaded ${materials.length} materials from database`);
      return materials;
    } catch (error) {
      if (retryCount < this.MAX_RETRY_ATTEMPTS) {
        console.warn(`Material sync failed, retrying... (${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS})`);
        await this.delay(this.RETRY_DELAY * (retryCount + 1));
        return this.syncMaterials(retryCount + 1);
      }
      
      this.addSyncError('materials', `Failed to sync materials after ${this.MAX_RETRY_ATTEMPTS} attempts`);
      throw error;
    }
  }

  /**
   * Validate all medical data
   */
  private async validateAllData(
    drugs: Drug[], 
    procedures: Procedure[], 
    materials: Material[]
  ): Promise<{
    drugs: ValidationResult[];
    procedures: ValidationResult[];
    materials: ValidationResult[];
  }> {
    console.log('Validating medical data...');

    const drugValidations = drugs.map(drug => medicalContentValidator.validateDrug(drug));
    const procedureValidations = procedures.map(procedure => medicalContentValidator.validateProcedure(procedure));
    const materialValidations = materials.map(material => medicalContentValidator.validateMaterial(material));

    console.log(`Validation completed: ${drugValidations.length} drugs, ${procedureValidations.length} procedures, ${materialValidations.length} materials`);

    return {
      drugs: drugValidations,
      procedures: procedureValidations,
      materials: materialValidations
    };
  }

  /**
   * Generate data quality report
   */
  private generateDataQualityReport(validationResults: {
    drugs: ValidationResult[];
    procedures: ValidationResult[];
    materials: ValidationResult[];
  }): DataQualityReport {
    const drugStats = this.calculateValidationStats(validationResults.drugs);
    const procedureStats = this.calculateValidationStats(validationResults.procedures);
    const materialStats = this.calculateValidationStats(validationResults.materials);

    const totalItems = drugStats.total + procedureStats.total + materialStats.total;
    const totalValid = drugStats.valid + procedureStats.valid + materialStats.valid;
    const overallScore = totalItems > 0 ? Math.round((totalValid / totalItems) * 100) : 0;

    return {
      drugs: drugStats,
      procedures: procedureStats,
      materials: materialStats,
      overallScore
    };
  }

  /**
   * Calculate validation statistics
   */
  private calculateValidationStats(validations: ValidationResult[]): {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
  } {
    const total = validations.length;
    const valid = validations.filter(v => v.isValid).length;
    const warnings = validations.reduce((sum, v) => sum + v.warnings.length, 0);
    const errors = validations.reduce((sum, v) => sum + v.errors.length, 0);

    return { total, valid, warnings, errors };
  }

  /**
   * Load data from cache
   */
  private async loadFromCache(): Promise<void> {
    try {
      const cache = storageService.getFromStorage<MedicalDataCache>(this.CACHE_KEY);
      
      if (cache) {
        const dataQuality = this.generateDataQualityReport(cache.validationResults);
        
        this.updateSyncStatus({
          lastSync: cache.lastUpdated,
          dataQuality
        });

        console.log('Medical data loaded from cache');
      }
    } catch (error) {
      console.error('Failed to load medical data from cache:', error);
      // If cache loading fails, trigger a fresh sync
      await this.syncAllMedicalData();
    }
  }

  /**
   * Check if synchronization is needed
   */
  private shouldSync(): boolean {
    const cache = storageService.getFromStorage<MedicalDataCache>(this.CACHE_KEY);
    
    if (!cache) {
      return true; // No cache, need to sync
    }

    // Check if cache is expired (24 hours)
    const cacheAge = Date.now() - new Date(cache.lastUpdated).getTime();
    if (cacheAge > CACHE_TTL.VERY_LONG) {
      return true;
    }

    // Check if we have sync errors that need retry
    if (this.syncStatus.errors.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Get cached medical data
   */
  getCachedData(): MedicalDataCache | null {
    return storageService.getFromStorage<MedicalDataCache>(this.CACHE_KEY);
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Subscribe to sync status updates
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Force refresh of all medical data
   */
  async forceRefresh(): Promise<void> {
    // Clear cache
    storageService.removeFromStorage(this.CACHE_KEY);
    
    // Clear errors
    this.updateSyncStatus({ errors: [] });
    
    // Sync fresh data
    await this.syncAllMedicalData(true);
  }

  /**
   * Get data freshness information
   */
  getDataFreshness(): {
    lastSync: Date | null;
    age: number; // in milliseconds
    isStale: boolean;
  } {
    const lastSync = this.syncStatus.lastSync;
    const age = lastSync ? Date.now() - lastSync.getTime() : 0;
    const isStale = age > CACHE_TTL.VERY_LONG;

    return { lastSync, age, isStale };
  }

  /**
   * Get validation summary for all data
   */
  getValidationSummary(): string {
    const { dataQuality } = this.syncStatus;
    const totalItems = dataQuality.drugs.total + dataQuality.procedures.total + dataQuality.materials.total;
    const totalErrors = dataQuality.drugs.errors + dataQuality.procedures.errors + dataQuality.materials.errors;
    const totalWarnings = dataQuality.drugs.warnings + dataQuality.procedures.warnings + dataQuality.materials.warnings;

    if (totalErrors > 0) {
      return `${totalErrors} validation errors found in medical data`;
    }

    if (totalWarnings > 0) {
      return `${totalWarnings} validation warnings in medical data`;
    }

    return `All ${totalItems} medical items validated successfully (${dataQuality.overallScore}% quality score)`;
  }

  /**
   * Clear all cached data and sync status
   */
  clearCache(): void {
    storageService.removeFromStorage(this.CACHE_KEY);
    storageService.removeFromStorage(this.SYNC_STATUS_KEY);
    
    this.syncStatus = {
      isLoading: false,
      lastSync: null,
      errors: [],
      dataQuality: {
        drugs: { total: 0, valid: 0, warnings: 0, errors: 0 },
        procedures: { total: 0, valid: 0, warnings: 0, errors: 0 },
        materials: { total: 0, valid: 0, warnings: 0, errors: 0 },
        overallScore: 0
      }
    };
  }

  /**
   * Update sync status and notify listeners
   */
  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates };
    
    // Save to storage
    storageService.saveToStorage(this.SYNC_STATUS_KEY, this.syncStatus);
    
    // Notify listeners
    this.listeners.forEach(callback => {
      try {
        callback(this.syncStatus);
      } catch (error) {
        console.error('Error in sync status listener:', error);
      }
    });
  }

  /**
   * Add sync error
   */
  private addSyncError(service: 'drugs' | 'procedures' | 'materials', message: string): void {
    const existingError = this.syncStatus.errors.find(e => e.service === service && e.message === message);
    
    if (existingError) {
      existingError.retryCount++;
      existingError.timestamp = new Date();
    } else {
      this.syncStatus.errors.push({
        service,
        message,
        timestamp: new Date(),
        retryCount: 1
      });
    }

    this.updateSyncStatus({ errors: [...this.syncStatus.errors] });
  }

  /**
   * Generate version string for cache
   */
  private generateVersion(): string {
    return `v${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Delay utility for retry mechanism
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const medicalDataSyncService = new MedicalDataSyncService();
export default medicalDataSyncService;