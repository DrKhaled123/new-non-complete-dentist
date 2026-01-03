import { medicalContentValidator } from '../contentValidator';
import { Drug, Procedure, Material, PatientParameters } from '../../../types';

describe('Medical Content Validator', () => {
  describe('Drug Validation', () => {
    test('validates complete drug successfully', () => {
      const drug: Drug = {
        id: 'test-drug',
        name: 'Test Drug',
        class: 'Antibiotic',
        indications: [{ type: 'Treatment', description: 'Test infection', evidence_level: 'A' }],
        dosage: {
          adults: { dose: '500 mg', regimen: 'TID', max_daily: '1500 mg' },
          pediatrics: { dose: '250 mg', regimen: 'TID', max_daily: '750 mg' }
        },
        administration: { route: 'Oral', instructions: 'With food', bioavailability: '90%' },
        renal_adjustment: [],
        hepatic_adjustment: [],
        contraindications: ['Allergy to penicillin'],
        side_effects: { common: ['Nausea'], serious: ['Anaphylaxis'] },
        interactions: []
      };

      const result = medicalContentValidator.validateDrug(drug);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('detects missing drug name', () => {
      const drug: any = {
        id: 'test-drug',
        name: '',
        class: 'Antibiotic',
        indications: [],
        dosage: { adults: {}, pediatrics: {} },
        administration: {},
        renal_adjustment: [],
        hepatic_adjustment: [],
        contraindications: [],
        side_effects: { common: [], serious: [] },
        interactions: []
      };

      const result = medicalContentValidator.validateDrug(drug);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          code: 'DRUG_NAME_MISSING'
        })
      );
    });

    test('detects missing adult dosage', () => {
      const drug: any = {
        id: 'test-drug',
        name: 'Test Drug',
        class: 'Antibiotic',
        indications: [{ type: 'Treatment', description: 'Test', evidence_level: 'A' }],
        dosage: { adults: {}, pediatrics: {} },
        administration: { route: 'Oral' },
        renal_adjustment: [],
        hepatic_adjustment: [],
        contraindications: [],
        side_effects: { common: [], serious: [] },
        interactions: []
      };

      const result = medicalContentValidator.validateDrug(drug);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'dosage.adults.dose',
          code: 'ADULT_DOSE_MISSING'
        })
      );
    });
  });

  describe('Patient Validation', () => {
    test('validates adult patient successfully', () => {
      const patient: PatientParameters = {
        age: 30,
        weight: 70,
        conditions: [],
        allergies: []
      };

      const result = medicalContentValidator.validatePatientParameters(patient);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('detects pediatric patient and creates alert', () => {
      const patient: PatientParameters = {
        age: 10,
        weight: 30,
        conditions: [],
        allergies: []
      };

      const result = medicalContentValidator.validatePatientParameters(patient);
      
      expect(result.clinicalAlerts).toContainEqual(
        expect.objectContaining({
          type: 'age_restriction',
          severity: 'major',
          message: 'Pediatric patient - special dosing considerations may apply'
        })
      );
    });

    test('detects geriatric patient and creates alert', () => {
      const patient: PatientParameters = {
        age: 70,
        weight: 65,
        conditions: [],
        allergies: []
      };

      const result = medicalContentValidator.validatePatientParameters(patient);
      
      expect(result.clinicalAlerts).toContainEqual(
        expect.objectContaining({
          type: 'age_restriction',
          severity: 'moderate',
          message: 'Geriatric patient - dose adjustments may be required'
        })
      );
    });

    test('detects penicillin allergy', () => {
      const patient: PatientParameters = {
        age: 30,
        weight: 70,
        conditions: [],
        allergies: ['Penicillin']
      };

      const result = medicalContentValidator.validatePatientParameters(patient);
      
      expect(result.clinicalAlerts).toContainEqual(
        expect.objectContaining({
          type: 'allergy',
          severity: 'critical',
          message: 'Penicillin allergy detected'
        })
      );
    });

    test('detects renal condition', () => {
      const patient: PatientParameters = {
        age: 30,
        weight: 70,
        conditions: ['Kidney Disease'],
        allergies: []
      };

      const result = medicalContentValidator.validatePatientParameters(patient);
      
      expect(result.clinicalAlerts).toContainEqual(
        expect.objectContaining({
          type: 'dosage',
          severity: 'major',
          message: 'Renal impairment detected'
        })
      );
    });

    test('validates invalid age', () => {
      const patient: PatientParameters = {
        age: 0,
        weight: 70,
        conditions: [],
        allergies: []
      };

      const result = medicalContentValidator.validatePatientParameters(patient);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'age',
          code: 'INVALID_AGE'
        })
      );
    });
  });

  describe('Drug-Patient Combination', () => {
    test('detects contraindication', () => {
      const drug: Drug = {
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
        contraindications: ['Kidney Disease'],
        side_effects: { common: [], serious: [] },
        interactions: []
      };

      const patient: PatientParameters = {
        age: 30,
        weight: 70,
        conditions: ['Kidney Disease'],
        allergies: []
      };

      const result = medicalContentValidator.validateDrugPatientCombination(drug, patient);
      
      expect(result.isValid).toBe(false);
      expect(result.clinicalAlerts).toContainEqual(
        expect.objectContaining({
          type: 'contraindication',
          severity: 'critical',
          message: 'Drug contraindicated in Kidney Disease'
        })
      );
    });

    test('detects allergy conflict', () => {
      const drug: Drug = {
        id: 'amoxicillin',
        name: 'Amoxicillin',
        class: 'Penicillin',
        indications: [{ type: 'Treatment', description: 'Bacterial infection', evidence_level: 'A' }],
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
      };

      const patient: PatientParameters = {
        age: 30,
        weight: 70,
        conditions: [],
        allergies: ['Penicillin']
      };

      const result = medicalContentValidator.validateDrugPatientCombination(drug, patient);
      
      expect(result.isValid).toBe(false);
      expect(result.clinicalAlerts).toContainEqual(
        expect.objectContaining({
          type: 'allergy',
          severity: 'critical',
          message: 'Patient allergic to Penicillin'
        })
      );
    });
  });

  describe('Procedure Validation', () => {
    test('validates complete procedure successfully', () => {
      const procedure: Procedure = {
        id: 'test-procedure',
        name: 'Test Procedure',
        category: 'Restorative',
        diagnosis: 'Test diagnosis',
        differential_diagnosis: ['Alternative diagnosis'],
        investigations: ['X-ray'],
        management_plan: [
          { step: 1, title: 'Step 1', description: 'First step' }
        ],
        references: ['Reference 1']
      };

      const result = medicalContentValidator.validateProcedure(procedure);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('detects missing procedure name', () => {
      const procedure: any = {
        id: 'test-procedure',
        name: '',
        category: 'Restorative',
        diagnosis: 'Test diagnosis',
        differential_diagnosis: [],
        investigations: [],
        management_plan: [],
        references: []
      };

      const result = medicalContentValidator.validateProcedure(procedure);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          code: 'PROCEDURE_NAME_MISSING'
        })
      );
    });
  });

  describe('Material Validation', () => {
    test('validates complete material successfully', () => {
      const material: Material = {
        id: 'test-material',
        name: 'Test Material',
        category: 'Restorative',
        properties: {
          strength: 'High',
          aesthetics: 'Good',
          durability: 'Excellent',
          biocompatibility: 'Excellent'
        },
        indications: ['Posterior restorations'],
        contraindications: ['Metal allergies'],
        handling_characteristics: ['Easy to handle'],
        longevity: '10-15 years',
        cost_considerations: 'Moderate cost'
      };

      const result = medicalContentValidator.validateMaterial(material);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('detects missing material name', () => {
      const material: any = {
        id: 'test-material',
        name: '',
        category: 'Restorative',
        properties: {},
        indications: [],
        contraindications: [],
        handling_characteristics: [],
        longevity: '',
        cost_considerations: ''
      };

      const result = medicalContentValidator.validateMaterial(material);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          code: 'MATERIAL_NAME_MISSING'
        })
      );
    });
  });

  describe('Validation Summary', () => {
    test('returns correct summary for valid result', () => {
      const result = {
        isValid: true,
        errors: [],
        warnings: [],
        clinicalAlerts: []
      };

      const summary = medicalContentValidator.getValidationSummary(result);
      
      expect(summary).toBe('VALID: All validations passed successfully');
    });

    test('returns correct summary for critical errors', () => {
      const result = {
        isValid: false,
        errors: [
          { field: 'name', message: 'Required', severity: 'critical' as const, code: 'REQUIRED' }
        ],
        warnings: [],
        clinicalAlerts: []
      };

      const summary = medicalContentValidator.getValidationSummary(result);
      
      expect(summary).toBe('CRITICAL: 1 critical issues require immediate attention');
    });

    test('returns correct summary for warnings', () => {
      const result = {
        isValid: true,
        errors: [],
        warnings: [
          { field: 'description', message: 'Missing', recommendation: 'Add description' }
        ],
        clinicalAlerts: []
      };

      const summary = medicalContentValidator.getValidationSummary(result);
      
      expect(summary).toBe('INFO: 1 recommendations for improvement');
    });
  });
});