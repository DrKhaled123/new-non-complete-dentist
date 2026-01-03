import { useState, useEffect, useCallback } from 'react';
import { Drug, Procedure, Material } from '../types';
import { drugDataService } from '../services/drugDataService';
import { procedureDataService } from '../services/procedureDataService';
import { materialDataService } from '../services/materialDataService';
import { medicalDataSyncService, SyncStatus } from '../services/medical/medicalDataSync';

/**
 * Custom hook for accessing medical content with caching and validation
 * 
 * Provides centralized access to all medical data with:
 * - Automatic data loading and caching
 * - Real-time sync status
 * - Error handling
 * - Data freshness checking
 */

export interface UseMedicalContentReturn {
  // Data
  drugs: Drug[];
  procedures: Procedure[];
  materials: Material[];
  
  // Loading states
  isLoading: boolean;
  isDrugsLoading: boolean;
  isProceduresLoading: boolean;
  isMaterialsLoading: boolean;
  
  // Sync status
  syncStatus: SyncStatus;
  
  // Error states
  error: string | null;
  
  // Actions
  refreshData: () => Promise<void>;
  searchDrugs: (query: string) => Promise<Drug[]>;
  searchProcedures: (query: string) => Promise<Procedure[]>;
  searchMaterials: (query: string) => Promise<Material[]>;
  
  // Data quality
  dataQualityScore: number;
  validationSummary: string;
}

export const useMedicalContent = (): UseMedicalContentReturn => {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  
  const [isDrugsLoading, setIsDrugsLoading] = useState(false);
  const [isProceduresLoading, setIsProceduresLoading] = useState(false);
  const [isMaterialsLoading, setIsMaterialsLoading] = useState(false);
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(medicalDataSyncService.getSyncStatus());
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize medical data sync service
   */
  useEffect(() => {
    const initializeSync = async () => {
      try {
        await medicalDataSyncService.initialize();
      } catch (err) {
        console.error('Failed to initialize medical data sync:', err);
        setError('Failed to initialize medical data synchronization');
      }
    };

    initializeSync();

    // Subscribe to sync status updates
    const unsubscribe = medicalDataSyncService.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Load drugs data
   */
  const loadDrugs = useCallback(async () => {
    try {
      setIsDrugsLoading(true);
      setError(null);
      const drugList = await drugDataService.loadDrugDatabase();
      setDrugs(drugList);
    } catch (err) {
      console.error('Failed to load drugs:', err);
      setError('Failed to load drug database');
      setDrugs([]);
    } finally {
      setIsDrugsLoading(false);
    }
  }, []);

  /**
   * Load procedures data
   */
  const loadProcedures = useCallback(async () => {
    try {
      setIsProceduresLoading(true);
      setError(null);
      const procedureList = await procedureDataService.loadProcedures();
      setProcedures(procedureList);
    } catch (err) {
      console.error('Failed to load procedures:', err);
      setError('Failed to load procedures database');
      setProcedures([]);
    } finally {
      setIsProceduresLoading(false);
    }
  }, []);

  /**
   * Load materials data
   */
  const loadMaterials = useCallback(async () => {
    try {
      setIsMaterialsLoading(true);
      setError(null);
      const materialList = await materialDataService.loadMaterials();
      setMaterials(materialList);
    } catch (err) {
      console.error('Failed to load materials:', err);
      setError('Failed to load materials database');
      setMaterials([]);
    } finally {
      setIsMaterialsLoading(false);
    }
  }, []);

  /**
   * Load all medical data on mount
   */
  useEffect(() => {
    loadDrugs();
    loadProcedures();
    loadMaterials();
  }, [loadDrugs, loadProcedures, loadMaterials]);

  /**
   * Refresh all medical data
   */
  const refreshData = useCallback(async () => {
    try {
      setError(null);
      await medicalDataSyncService.forceRefresh();
      await Promise.all([
        loadDrugs(),
        loadProcedures(),
        loadMaterials()
      ]);
    } catch (err) {
      console.error('Failed to refresh medical data:', err);
      setError('Failed to refresh medical data');
    }
  }, [loadDrugs, loadProcedures, loadMaterials]);

  /**
   * Search drugs
   */
  const searchDrugs = useCallback(async (query: string): Promise<Drug[]> => {
    try {
      return await drugDataService.searchDrug(query);
    } catch (err) {
      console.error('Drug search failed:', err);
      return [];
    }
  }, []);

  /**
   * Search procedures
   */
  const searchProcedures = useCallback(async (query: string): Promise<Procedure[]> => {
    try {
      return await procedureDataService.searchProcedure(query);
    } catch (err) {
      console.error('Procedure search failed:', err);
      return [];
    }
  }, []);

  /**
   * Search materials
   */
  const searchMaterials = useCallback(async (query: string): Promise<Material[]> => {
    try {
      return await materialDataService.searchMaterial(query);
    } catch (err) {
      console.error('Material search failed:', err);
      return [];
    }
  }, []);

  /**
   * Calculate overall loading state
   */
  const isLoading = isDrugsLoading || isProceduresLoading || isMaterialsLoading || syncStatus.isLoading;

  /**
   * Get data quality score
   */
  const dataQualityScore = syncStatus.dataQuality.overallScore;

  /**
   * Get validation summary
   */
  const validationSummary = medicalDataSyncService.getValidationSummary();

  return {
    // Data
    drugs,
    procedures,
    materials,
    
    // Loading states
    isLoading,
    isDrugsLoading,
    isProceduresLoading,
    isMaterialsLoading,
    
    // Sync status
    syncStatus,
    
    // Error states
    error,
    
    // Actions
    refreshData,
    searchDrugs,
    searchProcedures,
    searchMaterials,
    
    // Data quality
    dataQualityScore,
    validationSummary
  };
};

export default useMedicalContent;
