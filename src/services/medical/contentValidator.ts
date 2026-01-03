import { Drug, Procedure, Material, PatientParameters } from '../../types';

/**
 * Medical Content Validator
 * 
 * Provides comprehensive validation for all medical data types
 * Ensures clinical safety and data integrity across the application
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  clinicalAlerts: ClinicalAlert[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  recommendation: string;
}

export interface ClinicalAlert {
  type: 'contraindication' | 'interaction' | 'dosage' | 'allergy' | 'age_restriction';
  message: string;
  severity: 'critical' | 'major' | 'moderate' | 'minor';
  action: string;
}

class MedicalContentValidator {
  /**
   * Validate drug data for completeness and clinical accuracy
   */
  validateDrug(drug: Drug): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const clinicalAlerts: ClinicalAlert[] = [];

    // Required field validation
    if (!drug.name || drug.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Drug name is required',
        severity: 'critical',
        code: 'DRUG_NAME_MISSING'
      });
    }

    if (!drug.class || drug.class.trim().length === 0) {
      errors.push({
        field: 'class',
        message: 'Drug class is required for clinical classification',
        severity: 'high',
        code: 'DRUG_CLASS_MISSING'
      });
    }

    // Dosage validation
    if (!drug.dosage?.adults?.dose) {
      errors.push({
        field: 'dosage.adults.dose',
        message: 'Adult dosage is required',
        severity: 'critical',
        code: 'ADULT_DOSE_MISSING'
      });
    }

    if (!drug.dosage?.adults?.regimen) {
      errors.push({
        field: 'dosage.adults.regimen',
        message: 'Dosing regimen is required',
        severity: 'high',
        code: 'DOSING_REGIMEN_MISSING'
      });
    }

    // Validate dosage format
    if (drug.dosage?.adults?.dose && !this.isValidDosageFormat(drug.dosage.adults.dose)) {
      warnings.push({
        field: 'dosage.adults.dose',
        message: 'Dosage format may not be standard',
        recommendation: 'Use format like "500 mg" or "10 mg/kg"'
      });
    }

    // Contraindications validation
    if (!drug.contraindications || drug.contraindications.length === 0) {
      warnings.push({
        field: 'contraindications',
        message: 'No contraindications listed',
        recommendation: 'Verify if drug has any contraindications'
      });
    }

    // Indications validation
    if (!drug.indications || drug.indications.length === 0) {
      errors.push({
        field: 'indications',
        message: 'Drug indications are required',
        severity: 'high',
        code: 'INDICATIONS_MISSING'
      });
    }

    // Validate indication evidence levels
    drug.indications?.forEach((indication, index) => {
      if (!indication.evidence_level) {
        warnings.push({
          field: `indications[${index}].evidence_level`,
          message: 'Evidence level not specified',
          recommendation: 'Add evidence level for clinical decision support'
        });
      }
    });

    // Administration route validation
    if (!drug.administration?.route) {
      errors.push({
        field: 'administration.route',
        message: 'Administration route is required',
        severity: 'high',
        code: 'ADMIN_ROUTE_MISSING'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      clinicalAlerts
    };
  }

  /**
   * Validate procedure data for clinical completeness
   */
  validateProcedure(procedure: Procedure): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const clinicalAlerts: ClinicalAlert[] = [];

    // Required field validation
    if (!procedure.name || procedure.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Procedure name is required',
        severity: 'critical',
        code: 'PROCEDURE_NAME_MISSING'
      });
    }

    if (!procedure.diagnosis || procedure.diagnosis.trim().length === 0) {
      errors.push({
        field: 'diagnosis',
        message: 'Diagnostic criteria are required',
        severity: 'critical',
        code: 'DIAGNOSIS_MISSING'
      });
    }

    // Management plan validation
    if (!procedure.management_plan || procedure.management_plan.length === 0) {
      errors.push({
        field: 'management_plan',
        message: 'Management plan is required',
        severity: 'critical',
        code: 'MANAGEMENT_PLAN_MISSING'
      });
    } else {
      // Validate management plan steps
      procedure.management_plan.forEach((step, index) => {
        if (!step.title || step.title.trim().length === 0) {
          errors.push({
            field: `management_plan[${index}].title`,
            message: `Management step ${index + 1} title is required`,
            severity: 'high',
            code: 'MANAGEMENT_STEP_TITLE_MISSING'
          });
        }

        if (!step.description || step.description.trim().length === 0) {
          errors.push({
            field: `management_plan[${index}].description`,
            message: `Management step ${index + 1} description is required`,
            severity: 'high',
            code: 'MANAGEMENT_STEP_DESC_MISSING'
          });
        }
      });
    }

    // Differential diagnosis validation
    if (!procedure.differential_diagnosis || procedure.differential_diagnosis.length === 0) {
      warnings.push({
        field: 'differential_diagnosis',
        message: 'No differential diagnoses listed',
        recommendation: 'Consider adding differential diagnoses for comprehensive clinical assessment'
      });
    }

    // Investigations validation
    if (!procedure.investigations || procedure.investigations.length === 0) {
      warnings.push({
        field: 'investigations',
        message: 'No investigations specified',
        recommendation: 'Add required investigations for proper diagnosis'
      });
    }

    // References validation
    if (!procedure.references || procedure.references.length === 0) {
      warnings.push({
        field: 'references',
        message: 'No clinical references provided',
        recommendation: 'Add evidence-based references for clinical validation'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      clinicalAlerts
    };
  }

  /**
   * Validate material data for clinical appropriateness
   */
  validateMaterial(material: Material): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const clinicalAlerts: ClinicalAlert[] = [];

    // Required field validation
    if (!material.name || material.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Material name is required',
        severity: 'critical',
        code: 'MATERIAL_NAME_MISSING'
      });
    }

    if (!material.category || material.category.trim().length === 0) {
      errors.push({
        field: 'category',
        message: 'Material category is required',
        severity: 'high',
        code: 'MATERIAL_CATEGORY_MISSING'
      });
    }

    // Properties validation
    if (!material.properties || Object.keys(material.properties).length === 0) {
      errors.push({
        field: 'properties',
        message: 'Material properties are required',
        severity: 'critical',
        code: 'MATERIAL_PROPERTIES_MISSING'
      });
    }

    // Essential properties check
    const essentialProperties = ['strength', 'aesthetics', 'durability', 'biocompatibility'];
    essentialProperties.forEach(prop => {
      if (!material.properties[prop]) {
        warnings.push({
          field: `properties.${prop}`,
          message: `${prop} property not specified`,
          recommendation: `Add ${prop} information for complete clinical assessment`
        });
      }
    });

    // Indications validation
    if (!material.indications || material.indications.length === 0) {
      errors.push({
        field: 'indications',
        message: 'Material indications are required',
        severity: 'high',
        code: 'MATERIAL_INDICATIONS_MISSING'
      });
    }

    // Contraindications validation
    if (!material.contraindications || material.contraindications.length === 0) {
      warnings.push({
        field: 'contraindications',
        message: 'No contraindications listed',
        recommendation: 'Verify if material has any contraindications'
      });
    }

    // Handling characteristics validation
    if (!material.handling_characteristics || material.handling_characteristics.length === 0) {
      warnings.push({
        field: 'handling_characteristics',
        message: 'No handling characteristics specified',
        recommendation: 'Add handling instructions for proper clinical use'
      });
    }

    // Longevity validation
    if (!material.longevity || material.longevity.trim().length === 0) {
      warnings.push({
        field: 'longevity',
        message: 'Material longevity not specified',
        recommendation: 'Add expected lifespan for treatment planning'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      clinicalAlerts
    };
  }

  /**
   * Validate patient parameters for clinical calculations
   */
  validatePatientParameters(params: PatientParameters): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const clinicalAlerts: ClinicalAlert[] = [];

    // Age validation
    if (!params.age || params.age <= 0) {
      errors.push({
        field: 'age',
        message: 'Valid patient age is required',
        severity: 'critical',
        code: 'INVALID_AGE'
      });
    } else {
      if (params.age < 18) {
        clinicalAlerts.push({
          type: 'age_restriction',
          message: 'Pediatric patient - special dosing considerations may apply',
          severity: 'major',
          action: 'Review pediatric dosing guidelines'
        });
      }

      if (params.age > 65) {
        clinicalAlerts.push({
          type: 'age_restriction',
          message: 'Geriatric patient - dose adjustments may be required',
          severity: 'moderate',
          action: 'Consider renal function and drug clearance'
        });
      }
    }

    // Weight validation
    if (!params.weight || params.weight <= 0) {
      errors.push({
        field: 'weight',
        message: 'Valid patient weight is required for dosage calculations',
        severity: 'critical',
        code: 'INVALID_WEIGHT'
      });
    } else {
      if (params.weight < 40) {
        warnings.push({
          field: 'weight',
          message: 'Low body weight detected',
          recommendation: 'Consider weight-based dosing adjustments'
        });
      }

      if (params.weight > 120) {
        warnings.push({
          field: 'weight',
          message: 'High body weight detected',
          recommendation: 'Consider maximum dose limitations'
        });
      }
    }

    // Allergies validation
    if (params.allergies && params.allergies.length > 0) {
      params.allergies.forEach(allergy => {
        if (allergy.toLowerCase().includes('penicillin')) {
          clinicalAlerts.push({
            type: 'allergy',
            message: 'Penicillin allergy detected',
            severity: 'critical',
            action: 'Avoid all beta-lactam antibiotics'
          });
        }

        if (allergy.toLowerCase().includes('sulfa')) {
          clinicalAlerts.push({
            type: 'allergy',
            message: 'Sulfa allergy detected',
            severity: 'major',
            action: 'Avoid sulfonamide-containing medications'
          });
        }
      });
    }

    // Medical conditions validation
    if (params.conditions && params.conditions.length > 0) {
      params.conditions.forEach(condition => {
        const lowerCondition = condition.toLowerCase();

        if (lowerCondition.includes('kidney') || lowerCondition.includes('renal')) {
          clinicalAlerts.push({
            type: 'dosage',
            message: 'Renal impairment detected',
            severity: 'major',
            action: 'Consider dose adjustment based on creatinine clearance'
          });
        }

        if (lowerCondition.includes('liver') || lowerCondition.includes('hepatic')) {
          clinicalAlerts.push({
            type: 'dosage',
            message: 'Hepatic impairment detected',
            severity: 'major',
            action: 'Consider dose adjustment for hepatically metabolized drugs'
          });
        }

        if (lowerCondition.includes('heart') || lowerCondition.includes('cardiac')) {
          clinicalAlerts.push({
            type: 'contraindication',
            message: 'Cardiac condition detected',
            severity: 'moderate',
            action: 'Monitor for drug interactions with cardiac medications'
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      clinicalAlerts
    };
  }

  /**
   * Validate drug-patient combination for safety
   */
  validateDrugPatientCombination(drug: Drug, patient: PatientParameters): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const clinicalAlerts: ClinicalAlert[] = [];

    // Check contraindications against patient conditions
    if (drug.contraindications && patient.conditions) {
      drug.contraindications.forEach(contraindication => {
        const lowerContra = contraindication.toLowerCase();
        
        patient.conditions.forEach(condition => {
          const lowerCondition = condition.toLowerCase();
          
          if (lowerContra.includes(lowerCondition) || lowerCondition.includes(lowerContra)) {
            clinicalAlerts.push({
              type: 'contraindication',
              message: `Drug contraindicated in ${condition}`,
              severity: 'critical',
              action: 'Select alternative medication'
            });
          }
        });
      });
    }

    // Check allergies
    if (patient.allergies) {
      patient.allergies.forEach(allergy => {
        const lowerAllergy = allergy.toLowerCase();
        const lowerDrugName = drug.name.toLowerCase();
        const lowerDrugClass = drug.class.toLowerCase();

        if (lowerDrugName.includes(lowerAllergy) || lowerDrugClass.includes(lowerAllergy)) {
          clinicalAlerts.push({
            type: 'allergy',
            message: `Patient allergic to ${allergy}`,
            severity: 'critical',
            action: 'Do not prescribe - select alternative'
          });
        }
      });
    }

    // Age-specific considerations
    if (patient.age < 18 && !drug.dosage.pediatrics) {
      warnings.push({
        field: 'pediatric_dosing',
        message: 'Pediatric dosing information not available',
        recommendation: 'Consult pediatric dosing guidelines'
      });
    }

    return {
      isValid: clinicalAlerts.filter(alert => alert.severity === 'critical').length === 0,
      errors,
      warnings,
      clinicalAlerts
    };
  }

  /**
   * Comprehensive validation of complete medical workflow
   */
  validateMedicalWorkflow(data: {
    drug?: Drug;
    procedure?: Procedure;
    material?: Material;
    patient: PatientParameters;
  }): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    const allClinicalAlerts: ClinicalAlert[] = [];

    // Validate patient parameters
    const patientValidation = this.validatePatientParameters(data.patient);
    allErrors.push(...patientValidation.errors);
    allWarnings.push(...patientValidation.warnings);
    allClinicalAlerts.push(...patientValidation.clinicalAlerts);

    // Validate drug if provided
    if (data.drug) {
      const drugValidation = this.validateDrug(data.drug);
      allErrors.push(...drugValidation.errors);
      allWarnings.push(...drugValidation.warnings);
      allClinicalAlerts.push(...drugValidation.clinicalAlerts);

      // Validate drug-patient combination
      const combinationValidation = this.validateDrugPatientCombination(data.drug, data.patient);
      allErrors.push(...combinationValidation.errors);
      allWarnings.push(...combinationValidation.warnings);
      allClinicalAlerts.push(...combinationValidation.clinicalAlerts);
    }

    // Validate procedure if provided
    if (data.procedure) {
      const procedureValidation = this.validateProcedure(data.procedure);
      allErrors.push(...procedureValidation.errors);
      allWarnings.push(...procedureValidation.warnings);
      allClinicalAlerts.push(...procedureValidation.clinicalAlerts);
    }

    // Validate material if provided
    if (data.material) {
      const materialValidation = this.validateMaterial(data.material);
      allErrors.push(...materialValidation.errors);
      allWarnings.push(...materialValidation.warnings);
      allClinicalAlerts.push(...materialValidation.clinicalAlerts);
    }

    return {
      isValid: allErrors.length === 0 && allClinicalAlerts.filter(alert => alert.severity === 'critical').length === 0,
      errors: allErrors,
      warnings: allWarnings,
      clinicalAlerts: allClinicalAlerts
    };
  }

  /**
   * Helper method to validate dosage format
   */
  private isValidDosageFormat(dosage: string): boolean {
    // Common dosage patterns: "500 mg", "10 mg/kg", "1-2 tablets", etc.
    const dosagePatterns = [
      /^\d+(\.\d+)?\s*(mg|g|ml|tablets?|capsules?|units?)$/i,
      /^\d+(\.\d+)?\s*(mg|g|ml)\/kg$/i,
      /^\d+-\d+\s*(mg|g|ml|tablets?|capsules?)$/i
    ];

    return dosagePatterns.some(pattern => pattern.test(dosage.trim()));
  }

  /**
   * Get validation summary for reporting
   */
  getValidationSummary(result: ValidationResult): string {
    const criticalErrors = result.errors.filter(e => e.severity === 'critical').length;
    const highErrors = result.errors.filter(e => e.severity === 'high').length;
    const criticalAlerts = result.clinicalAlerts.filter(a => a.severity === 'critical').length;
    const majorAlerts = result.clinicalAlerts.filter(a => a.severity === 'major').length;

    if (criticalErrors > 0 || criticalAlerts > 0) {
      return `CRITICAL: ${criticalErrors + criticalAlerts} critical issues require immediate attention`;
    }

    if (highErrors > 0 || majorAlerts > 0) {
      return `WARNING: ${highErrors + majorAlerts} major issues should be addressed`;
    }

    if (result.warnings.length > 0) {
      return `INFO: ${result.warnings.length} recommendations for improvement`;
    }

    return 'VALID: All validations passed successfully';
  }
}

// Export singleton instance
export const medicalContentValidator = new MedicalContentValidator();
export default medicalContentValidator;