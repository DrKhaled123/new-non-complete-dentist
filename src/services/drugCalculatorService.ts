import { PatientParameters, DoseCalculationResult, Warning, Drug } from '../types';
import drugDataService from './drugDataService';

/**
 * DrugCalculatorService - Core calculation engine for drug dosing
 * 
 * Features:
 * - Age/weight-based dosing calculations
 * - Renal adjustment using Cockcroft-Gault formula
 * - Hepatic adjustment based on Child-Pugh score
 * - Contraindication checking
 * - Drug interaction warnings
 * - Clinical notes generation
 */
class DrugCalculatorService {

  /**
   * Calculate drug dose for patient
   */
  async calculateDose(
    patientParams: PatientParameters,
    drugName: string,
    procedure: string = ''
  ): Promise<DoseCalculationResult> {
    try {
      // Validate inputs
      this.validatePatientParameters(patientParams);

      // Get drug data
      const drug = await drugDataService.getDrugByName(drugName);
      if (!drug) {
        throw new Error(`Drug "${drugName}" not found in database`);
      }

      // Check contraindications first
      const contraindications = await this.checkContraindications(drug, patientParams);
      if (contraindications.length > 0) {
        return {
          drugName: drug.name,
          dosage: 'CONTRAINDICATED',
          frequency: 'N/A',
          duration: 'N/A',
          totalQuantity: 'N/A',
          clinicalNotes: [`CONTRAINDICATED: ${contraindications.join(', ')}`],
          warnings: [],
          contraindications,
          adjustments: {},
        };
      }

      // Calculate base dose
      const baseDose = this.calculateBaseDose(drug, patientParams);

      // Apply renal adjustments
      const renalAdjustment = await this.applyRenalAdjustment(drug, patientParams, baseDose);

      // Apply hepatic adjustments
      const hepaticAdjustment = await this.applyHepaticAdjustment(drug, patientParams, renalAdjustment);

      // Generate warnings
      const warnings = await this.generateWarnings(drug, patientParams);

      // Calculate total quantity
      const totalQuantity = this.calculateTotalQuantity(
        hepaticAdjustment.dosage,
        hepaticAdjustment.frequency,
        hepaticAdjustment.duration
      );

      // Generate clinical notes
      const clinicalNotes = this.generateClinicalNotes(drug, patientParams, hepaticAdjustment, procedure);

      return {
        drugName: drug.name,
        dosage: hepaticAdjustment.dosage,
        frequency: hepaticAdjustment.frequency,
        duration: hepaticAdjustment.duration,
        totalQuantity,
        clinicalNotes,
        warnings,
        contraindications: [],
        adjustments: {
          renal: renalAdjustment.adjustment,
          hepatic: hepaticAdjustment.adjustment,
        },
      };

    } catch (error) {
      console.error('Dose calculation failed:', error);
      throw error;
    }
  }

  /**
   * Check contraindications for patient
   */
  async checkContraindications(drug: Drug, patientParams: PatientParameters): Promise<string[]> {
    const contraindications: string[] = [];

    // Check allergies
    const drugAllergies = patientParams.allergies.filter(allergy => {
      const lowerAllergy = allergy.toLowerCase();
      const lowerDrugName = drug.name.toLowerCase();
      const lowerDrugClass = drug.class.toLowerCase();

      return lowerAllergy.includes(lowerDrugName) ||
             lowerAllergy.includes(lowerDrugClass) ||
             lowerDrugName.includes(lowerAllergy) ||
             lowerDrugClass.includes(lowerAllergy);
    });

    if (drugAllergies.length > 0) {
      contraindications.push(`Allergy to ${drugAllergies.join(', ')}`);
    }

    // Check medical conditions against drug contraindications
    const conditionContraindications = await drugDataService.checkContraindications(
      drug.name,
      patientParams.conditions
    );

    contraindications.push(...conditionContraindications);

    return contraindications;
  }

  /**
   * Calculate base dose based on age and weight
   */
  private calculateBaseDose(drug: Drug, patientParams: PatientParameters): {
    dosage: string;
    frequency: string;
    duration: string;
  } {
    const { age, weight } = patientParams;

    // Determine if pediatric or adult dosing
    if (age < 18) {
      // Pediatric dosing (weight-based)
      const pediatricDose = drug.dosage.pediatrics;
      
      // Extract mg/kg/day from dose string
      const doseMatch = pediatricDose.dose.match(/(\d+)(?:–(\d+))?\s*mg\/kg\/day/);
      if (doseMatch) {
        const minDose = parseInt(doseMatch[1]);
        const maxDose = doseMatch[2] ? parseInt(doseMatch[2]) : minDose;
        
        // Use middle of range for calculation
        const avgDosePerKg = (minDose + maxDose) / 2;
        const totalDailyDose = avgDosePerKg * weight;
        
        // Calculate individual dose based on frequency
        const frequency = pediatricDose.regimen;
        const dosesPerDay = this.extractDosesPerDay(frequency);
        const individualDose = Math.round(totalDailyDose / dosesPerDay);

        return {
          dosage: `${individualDose} mg`,
          frequency: frequency,
          duration: '7 days', // Default duration
        };
      }
    }

    // Adult dosing
    const adultDose = drug.dosage.adults;
    return {
      dosage: adultDose.dose,
      frequency: adultDose.regimen.split(' × ')[0], // Extract frequency part
      duration: adultDose.regimen.includes('×') ? 
                adultDose.regimen.split(' × ')[1] : '7 days',
    };
  }

  /**
   * Apply renal adjustment based on creatinine clearance
   */
  private async applyRenalAdjustment(
    drug: Drug,
    patientParams: PatientParameters,
    baseDose: { dosage: string; frequency: string; duration: string }
  ): Promise<{ dosage: string; frequency: string; duration: string; adjustment?: string }> {
    
    // Calculate creatinine clearance if creatinine is provided
    if (patientParams.creatinine) {
      const crCl = drugDataService.calculateCreatinineClearance(
        patientParams.age,
        patientParams.weight,
        patientParams.creatinine,
        patientParams.gender === 'female'
      );

      const renalAdjustment = await drugDataService.getRenalAdjustment(drug.name, crCl);
      
      if (renalAdjustment && renalAdjustment.adjustment !== 'None') {
        // Parse the adjusted dose
        const adjustedDose = this.parseAdjustedDose(renalAdjustment.dose_amount);
        
        return {
          ...adjustedDose,
          duration: baseDose.duration,
          adjustment: `Renal adjustment for CrCl ${crCl} mL/min: ${renalAdjustment.adjustment}`,
        };
      }
    }

    return { ...baseDose };
  }

  /**
   * Apply hepatic adjustment based on conditions
   */
  private async applyHepaticAdjustment(
    drug: Drug,
    patientParams: PatientParameters,
    currentDose: { dosage: string; frequency: string; duration: string; adjustment?: string }
  ): Promise<{ dosage: string; frequency: string; duration: string; adjustment?: string }> {
    
    // Check for liver disease in conditions
    const hasLiverDisease = patientParams.conditions.some(condition =>
      condition.toLowerCase().includes('liver') ||
      condition.toLowerCase().includes('hepatic') ||
      condition.toLowerCase().includes('cirrhosis')
    );

    if (hasLiverDisease && drug.hepatic_adjustment) {
      // For simplicity, assume moderate hepatic impairment (Child-Pugh B)
      const hepaticAdjustment = drug.hepatic_adjustment.find(adj =>
        adj.condition.toLowerCase().includes('child-pugh b') ||
        adj.condition.toLowerCase().includes('moderate')
      );

      if (hepaticAdjustment && hepaticAdjustment.adjustment !== 'None required') {
        const adjustedDose = this.parseAdjustedDose(hepaticAdjustment.dose_amount);
        
        return {
          ...adjustedDose,
          duration: currentDose.duration,
          adjustment: currentDose.adjustment ? 
            `${currentDose.adjustment}; Hepatic adjustment: ${hepaticAdjustment.adjustment}` :
            `Hepatic adjustment: ${hepaticAdjustment.adjustment}`,
        };
      }
    }

    return currentDose;
  }

  /**
   * Generate warnings for drug interactions and side effects
   */
  private async generateWarnings(drug: Drug, patientParams: PatientParameters): Promise<Warning[]> {
    const warnings: Warning[] = [];

    // Age-related warnings
    if (patientParams.age >= 65) {
      warnings.push({
        level: 'moderate',
        message: 'Elderly patient - monitor for increased sensitivity to drug effects',
        recommendation: 'Consider dose reduction and increased monitoring',
      });
    }

    if (patientParams.age < 18) {
      warnings.push({
        level: 'moderate',
        message: 'Pediatric patient - weight-based dosing applied',
        recommendation: 'Verify weight is accurate and current',
      });
    }

    // Renal function warnings
    if (patientParams.creatinine && patientParams.creatinine > 1.5) {
      warnings.push({
        level: 'major',
        message: 'Elevated creatinine - renal function may be impaired',
        recommendation: 'Consider dose adjustment and monitor renal function',
      });
    }

    // Condition-specific warnings
    if (patientParams.conditions.includes('diabetes')) {
      warnings.push({
        level: 'minor',
        message: 'Diabetic patient - monitor for drug interactions with diabetes medications',
        recommendation: 'Check blood glucose more frequently if indicated',
      });
    }

    // Drug-specific warnings based on side effects
    if (drug.side_effects.serious.length > 0) {
      warnings.push({
        level: 'moderate',
        message: `Monitor for serious side effects: ${drug.side_effects.serious.slice(0, 2).join(', ')}`,
        recommendation: 'Educate patient on warning signs and when to seek medical attention',
      });
    }

    return warnings;
  }

  /**
   * Calculate total quantity needed for course
   */
  private calculateTotalQuantity(dosage: string, frequency: string, duration: string): string {
    try {
      // Extract numeric dose
      const doseMatch = dosage.match(/(\d+(?:\.\d+)?)/);
      if (!doseMatch) return 'Calculate manually';

      const dose = parseFloat(doseMatch[1]);

      // Extract doses per day
      const dosesPerDay = this.extractDosesPerDay(frequency);

      // Extract duration in days
      const durationMatch = duration.match(/(\d+)/);
      if (!durationMatch) return 'Calculate manually';

      const days = parseInt(durationMatch[1]);

      // Calculate total
      const totalDose = dose * dosesPerDay * days;

      // Determine unit
      const unit = dosage.includes('mg') ? 'mg' : 'tablets';

      return `${totalDose} ${unit}`;
    } catch (error) {
      console.error('Failed to calculate total quantity:', error);
      return 'Calculate manually';
    }
  }

  /**
   * Generate clinical notes
   */
  private generateClinicalNotes(
    drug: Drug,
    patientParams: PatientParameters,
    finalDose: { dosage: string; frequency: string; duration: string; adjustment?: string },
    procedure: string
  ): string[] {
    const notes: string[] = [];

    // Administration instructions
    if (drug.administration.instructions) {
      notes.push(`Administration: ${drug.administration.instructions}`);
    }

    // Procedure-specific notes
    if (procedure) {
      notes.push(`Indication: ${procedure}`);
    }

    // Patient-specific notes
    if (patientParams.age < 18) {
      notes.push(`Pediatric dosing based on weight: ${patientParams.weight} kg`);
    }

    if (patientParams.age >= 65) {
      notes.push('Elderly patient - monitor for increased drug sensitivity');
    }

    // Adjustment notes
    if (finalDose.adjustment) {
      notes.push(finalDose.adjustment);
    }

    // Monitoring parameters
    if (drug.name.toLowerCase().includes('clindamycin')) {
      notes.push('Monitor for C. difficile-associated diarrhea');
    }

    if (drug.class.toLowerCase().includes('penicillin')) {
      notes.push('Monitor for allergic reactions, especially during first dose');
    }

    // General notes
    notes.push('Complete full course even if symptoms improve');
    notes.push('Take with full glass of water');

    return notes;
  }

  /**
   * Extract number of doses per day from frequency string
   */
  private extractDosesPerDay(frequency: string): number {
    const freq = frequency.toLowerCase();
    
    if (freq.includes('q6h') || freq.includes('qid')) return 4;
    if (freq.includes('q8h') || freq.includes('tid')) return 3;
    if (freq.includes('q12h') || freq.includes('bid')) return 2;
    if (freq.includes('q24h') || freq.includes('qd') || freq.includes('daily')) return 1;
    
    // Try to extract number directly
    const match = freq.match(/(\d+)\s*times?\s*(?:per\s*)?day/);
    if (match) return parseInt(match[1]);
    
    return 3; // Default to TID
  }

  /**
   * Parse adjusted dose string into components
   */
  private parseAdjustedDose(doseAmount: string): { dosage: string; frequency: string } {
    // Examples: "250 mg Q12H", "500 mg Q8H", "Standard dose"
    if (doseAmount.toLowerCase().includes('standard')) {
      return { dosage: 'Standard dose', frequency: 'As prescribed' };
    }

    const parts = doseAmount.split(' ');
    if (parts.length >= 3) {
      return {
        dosage: `${parts[0]} ${parts[1]}`, // e.g., "250 mg"
        frequency: parts[2], // e.g., "Q12H"
      };
    }

    return { dosage: doseAmount, frequency: 'As prescribed' };
  }

  /**
   * Validate patient parameters
   */
  private validatePatientParameters(params: PatientParameters): void {
    if (!params.age || params.age <= 0 || params.age > 120) {
      throw new Error('Invalid age: must be between 1 and 120 years');
    }

    if (!params.weight || params.weight <= 0 || params.weight > 300) {
      throw new Error('Invalid weight: must be between 1 and 300 kg');
    }

    if (params.creatinine && (params.creatinine <= 0 || params.creatinine > 20)) {
      throw new Error('Invalid creatinine: must be between 0.1 and 20 mg/dL');
    }
  }

  /**
   * Get dosing recommendations for common procedures
   */
  getProceduralRecommendations(): Record<string, string[]> {
    return {
      'tooth_extraction': [
        'Consider prophylaxis for high-risk patients',
        'Post-operative antibiotics only if signs of infection',
        'Amoxicillin 500mg TID x 5-7 days if indicated',
      ],
      'root_canal': [
        'Antibiotics not routinely indicated',
        'Consider if systemic signs of infection present',
        'Clindamycin for penicillin-allergic patients',
      ],
      'periodontal_surgery': [
        'Prophylaxis may be indicated for certain patients',
        'Post-operative antibiotics controversial',
        'Consider patient risk factors',
      ],
      'implant_placement': [
        'Prophylactic antibiotics commonly used',
        'Amoxicillin 2g 1 hour pre-procedure',
        'Post-operative course may be beneficial',
      ],
    };
  }
}

// Export singleton instance
export const drugCalculatorService = new DrugCalculatorService();
export default drugCalculatorService;