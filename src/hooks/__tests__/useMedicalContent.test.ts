import { renderHook, waitFor } from '@testing-library/react';
import { useMedicalContent } from '../useMedicalContent';

// Mock the services
jest.mock('../../services/drugDataService', () => ({
  drugDataService: {
    loadDrugDatabase: jest.fn().mockResolvedValue([
      {
        id: 'test-drug',
        name: 'Test Drug',
        class: 'Antibiotic',
        indications: [{ type: 'Treatment', description: 'Test', evidence_level: 'A' }],
        dosage: {
          adults: { dose: '500 mg', regimen: 'TID', max_daily: '1500 mg' },
          pediatrics: { dose: '250 mg', regimen: 'TID', max_daily: '750 mg' }
        },
        administration: { route: 'Oral', instructions: 'Test', bioavailability: '90%' },
        renal_adjustment: [],
        hepatic_adjustment: [],
        contraindications: [],
        side_effects: { common: [], serious: [] },
        interactions: []
      }
    ]),
    searchDrug: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('../../services/procedureDataService', () => ({
  procedureDataService: {
    loadProcedures: jest.fn().mockResolvedValue([
      {
        id: 'test-procedure',
        name: 'Test Procedure',
        category: 'Restorative',
        diagnosis: 'Test diagnosis',
        differential_diagnosis: [],
        investigations: [],
        management_plan: [],
        references: []
      }
    ]),
    searchProcedure: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('../../services/materialDataService', () => ({
  materialDataService: {
    loadMaterials: jest.fn().mockResolvedValue([
      {
        id: 'test-material',
        name: 'Test Material',
        category: 'Restorative',
        properties: { strength: 'High' },
        indications: [],
        contraindications: [],
        handling_characteristics: [],
        longevity: '10 years',
        cost_considerations: 'Moderate'
      }
    ]),
    searchMaterial: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('../../services/medical/medicalDataSync', () => ({
  medicalDataSyncService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getSyncStatus: jest.fn().mockReturnValue({
      isLoading: false,
      lastSync: new Date(),
      errors: [],
      dataQuality: {
        drugs: { total: 1, valid: 1, warnings: 0, errors: 0 },
        procedures: { total: 1, valid: 1, warnings: 0, errors: 0 },
        materials: { total: 1, valid: 1, warnings: 0, errors: 0 },
        overallScore: 100
      }
    }),
    onSyncStatusChange: jest.fn().mockReturnValue(() => {}),
    forceRefresh: jest.fn().mockResolvedValue(undefined),
    getValidationSummary: jest.fn().mockReturnValue('All items validated successfully')
  }
}));

describe('useMedicalContent Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loads medical data on mount', async () => {
    const { result } = renderHook(() => useMedicalContent());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });

    expect(result.current.drugs.length).toBeGreaterThan(0);
    expect(result.current.procedures.length).toBeGreaterThan(0);
    expect(result.current.materials.length).toBeGreaterThan(0);
  });

  test('provides data quality score', async () => {
    const { result } = renderHook(() => useMedicalContent());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.dataQualityScore).toBeGreaterThanOrEqual(0);
    expect(result.current.dataQualityScore).toBeLessThanOrEqual(100);
  });

  test('provides sync status', async () => {
    const { result } = renderHook(() => useMedicalContent());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.syncStatus).toBeDefined();
    expect(result.current.syncStatus.dataQuality).toBeDefined();
  });

  test('provides search functions', async () => {
    const { result } = renderHook(() => useMedicalContent());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.searchDrugs).toBe('function');
    expect(typeof result.current.searchProcedures).toBe('function');
    expect(typeof result.current.searchMaterials).toBe('function');
  });

  test('provides refresh function', async () => {
    const { result } = renderHook(() => useMedicalContent());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refreshData).toBe('function');
    
    // Test refresh function
    await result.current.refreshData();
    // Should not throw error
  });

  test('handles errors gracefully', async () => {
    // Mock error for one service
    const mockError = new Error('Test error');
    require('../../services/drugDataService').drugDataService.loadDrugDatabase.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useMedicalContent());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});