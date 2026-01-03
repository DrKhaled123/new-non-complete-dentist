import { useState, useCallback, useMemo } from 'react';
import { Drug, Procedure, Material, PatientParameters } from '../types';
import { 
  medicalContentValidator, 
  ValidationResult,
  ClinicalAlert 
} from '../services/medical/contentValidator';

/**
 * Custom hook for real-time medical content verification
 * 
 * Provides:
 * - Real-time validation of medical data
 * - Clinical alert notifications
 * - Drug-patient safety checks
 * - Comprehensive workflow validation
 */

export interface UseContentVerificationReturn {
  // Validation functions
  validateDrug: (drug: Drug) => ValidationResult;
  validateProcedure: (procedure: Procedure) => ValidationResult;
  validateMaterial: (material: Material) => ValidationResult;
  validatePatient: (patient: PatientParameters) => ValidationResult;
  validateDrugPatient: (drug: Drug, patient: PatientParameters) => ValidationResult;
  validateWorkflow: (data: {
    drug?: Drug;
    procedure?: Procedure;
    material?: Material;
    patient: PatientParameters;
  }) => ValidationResult;
  
  // Validation state
  lastValidation: ValidationResult | null;
  criticalAlerts: ClinicalAlert[];
  hasErrors: boolean;
  hasWarnings: boolean;
  hasCriticalAlerts: boolean;
  
  // Validation summary
  getValidationSummary: (result: ValidationResult) => string;
  
  // Alert filtering
  getCriticalAlerts: (result: ValidationResult) => ClinicalAlert[];
  getMajorAlerts: (result: ValidationResult) => ClinicalAlert[];
  getModerateAlerts: (result: ValidationResult) => ClinicalAlert[];
}

export const useContentVerification = (): UseContentVerificationReturn => {
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(null);

  /**
   * Validate drug data
   */
  const validateDrug = useCallback((drug: Drug): ValidationResult => {
    const result = medicalContentValidator.validateDrug(drug);
    setLastValidation(result);
    return result;
  }, []);

  /**
   * Validate procedure data
   */
  const validateProcedure = useCallback((procedure: Procedure): ValidationResult => {
    const result = medicalContentValidator.validateProcedure(procedure);
    setLastValidation(result);
    return result;
  }, []);

  /**
   * Validate material data
   */
  const validateMaterial = useCallback((material: Material): ValidationResult => {
    const result = medicalContentValidator.validateMaterial(material);
    setLastValidation(result);
    return result;
  }, []);

  /**
   * Validate patient parameters
   */
  const validatePatient = useCallback((patient: PatientParameters): ValidationResult => {
    const result = medicalContentValidator.validatePatientParameters(patient);
    setLastValidation(result);
    return result;
  }, []);

  /**
   * Validate drug-patient combination
   */
  const validateDrugPatient = useCallback((drug: Drug, patient: PatientParameters): ValidationResult => {
    const result = medicalContentValidator.validateDrugPatientCombination(drug, patient);
    setLastValidation(result);
    return result;
  }, []);

  /**
   * Validate complete medical workflow
   */
  const validateWorkflow = useCallback((data: {
    drug?: Drug;
    procedure?: Procedure;
    material?: Material;
    patient: PatientParameters;
  }): ValidationResult => {
    const result = medicalContentValidator.validateMedicalWorkflow(data);
    setLastValidation(result);
    return result;
  }, []);

  /**
   * Get validation summary
   */
  const getValidationSummary = useCallback((result: ValidationResult): string => {
    return medicalContentValidator.getValidationSummary(result);
  }, []);

  /**
   * Get critical alerts
   */
  const getCriticalAlerts = useCallback((result: ValidationResult): ClinicalAlert[] => {
    return result.clinicalAlerts.filter(alert => alert.severity === 'critical');
  }, []);

  /**
   * Get major alerts
   */
  const getMajorAlerts = useCallback((result: ValidationResult): ClinicalAlert[] => {
    return result.clinicalAlerts.filter(alert => alert.severity === 'major');
  }, []);

  /**
   * Get moderate alerts
   */
  const getModerateAlerts = useCallback((result: ValidationResult): ClinicalAlert[] => {
    return result.clinicalAlerts.filter(alert => alert.severity === 'moderate');
  }, []);

  /**
   * Extract critical alerts from last validation
   */
  const criticalAlerts = useMemo(() => {
    if (!lastValidation) return [];
    return getCriticalAlerts(lastValidation);
  }, [lastValidation, getCriticalAlerts]);

  /**
   * Check if last validation has errors
   */
  const hasErrors = useMemo(() => {
    return lastValidation ? lastValidation.errors.length > 0 : false;
  }, [lastValidation]);

  /**
   * Check if last validation has warnings
   */
  const hasWarnings = useMemo(() => {
    return lastValidation ? lastValidation.warnings.length > 0 : false;
  }, [lastValidation]);

  /**
   * Check if last validation has critical alerts
   */
  const hasCriticalAlerts = useMemo(() => {
    return criticalAlerts.length > 0;
  }, [criticalAlerts]);

  return {
    // Validation functions
    validateDrug,
    validateProcedure,
    validateMaterial,
    validatePatient,
    validateDrugPatient,
    validateWorkflow,
    
    // Validation state
    lastValidation,
    criticalAlerts,
    hasErrors,
    hasWarnings,
    hasCriticalAlerts,
    
    // Validation summary
    getValidationSummary,
    
    // Alert filtering
    getCriticalAlerts,
    getMajorAlerts,
    getModerateAlerts
  };
};

export default useContentVerification;
