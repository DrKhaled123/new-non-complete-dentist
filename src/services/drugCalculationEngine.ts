import { PatientParameters, DoseCalculationResult, Drug, Warning, CACHE_TTL } from '../types';
import storageService from './storageService';
import drugDataService from './drugDataService';

/**
 * DrugCalculationEngine - Calculates drug doses based on patient parameters
 *
 * Features:
 * - Dose calculation algorithms for antibiotics, analgesics, and anesthetics
 * - Creatinine clearance calculation using Cockcroft-Gault formula
 * - Renal and hepatic adjustment algorithms
 * - Pediatric and geriatric dosing considerations
 * - Performance optimized with caching
 */
class DrugCalculationEngine {
  private drugCache: Map<string, Drug> = new Map();
  private readonly CACHE_KEY = 'dental_cache_drug_calculations';

  /**
   * Calculate dose for a specific drug based on patient parameters
   */
  async calculateDrugDose(
    drugId: string,
    patientParams: PatientParameters
  ): Promise<DoseCalculationResult | null> {
    try {
      const drug = await this.getDrugById(drugId);
      if (!drug) {
        throw new Error(`Drug with ID '${drugId}' not found`);
      }

      // Validate patient parameters
      this.validatePatientParameters(patientParams);

      // Calculate creatinine clearance
      const crcl = this.calculateCreatinineClearance(patientParams);

      // Get base dosage based on age
      const baseDosage = this.getBaseDosage(drug, patientParams);

      // Apply renal adjustments
      const renalAdjustments = this.applyRenalAdjustments(drug, crcl);

      // Apply hepatic adjustments
      const hepaticAdjustments = this.applyHepaticAdjustments(drug, patientParams);

      // Check contraindications
      const contraindications = this.checkContraindications(drug, patientParams);

      // Generate warnings
      const warnings = this.generateWarnings(drug, patientParams, crcl);

      // Format final dosage
      const finalDosage = this.formatFinalDosage(baseDosage, renalAdjustments, hepaticAdjustments);

      // Calculate total quantity (assuming 7-10 day course for antibiotics)
      const totalQuantity = this.calculateTotalQuantity(finalDosage, drug.class);

      // Generate clinical notes
      const clinicalNotes = this.generateClinicalNotes(drug, patientParams, renalAdjustments, hepaticAdjustments);

      return {
        drugName: drug.name,
        dosage: finalDosage.dosage,
        frequency: finalDosage.frequency,
        duration: this.getDefaultDuration(drug.class),
        totalQuantity,
        clinicalNotes,
        warnings,
        contraindications,
        adjustments: {
          renal: renalAdjustments.adjustment,
          hepatic: hepaticAdjustments.adjustment,
        },
      };
    } catch (error) {
      console.error(`Failed to calculate dose for drug ${drugId}:`, error);
      return null;
    }
  }

  /**
   * Calculate creatinine clearance using Cockcroft-Gault formula
   * Formula: CrCl = [(140 - age) × weight (kg)] / [72 × SCr (mg/dL)] × 0.85 (for females)
   */
  calculateCreatinineClearance(patientParams: PatientParameters): number {
    if (!patientParams.creatinine || patientParams.creatinine <= 0) {
      // Use default CrCl based on age if creatinine not provided
      return this.getDefaultCreatinineClearance(patientParams.age, patientParams.gender);
    }

    const { age, weight, creatinine, gender } = patientParams;

    // Cockcroft-Gault formula
    let crcl = ((140 - age) * weight) / (72 * creatinine);

    // Adjust for female gender
    if (gender === 'female') {
      crcl *= 0.85;
    }

    // Ensure minimum CrCl of 10 mL/min for dosing calculations
    return Math.max(crcl, 10);
  }

  /**
   * Get default creatinine clearance when not provided
   */
  private getDefaultCreatinineClearance(age: number, gender?: 'male' | 'female'): number {
    // Age-based default CrCl values
    if (age < 40) return gender === 'female' ? 95 : 110;
    if (age < 50) return gender === 'female' ? 85 : 100;
    if (age < 60) return gender === 'female' ? 75 : 90;
    if (age < 70) return gender === 'female' ? 65 : 80;
    return gender === 'female' ? 55 : 70; // 70+
  }

  /**
   * Get base dosage based on patient age
   */
  private getBaseDosage(drug: Drug, patientParams: PatientParameters): { dosage: string; frequency: string } {
    const isPediatric = patientParams.age < 18;
    const isGeriatric = patientParams.age > 65;

    let dosageInfo;

    if (isPediatric) {
      dosageInfo = drug.dosage.pediatrics;
    } else {
      dosageInfo = drug.dosage.adults;
    }

    // Apply geriatric adjustments if needed
    if (isGeriatric && !isPediatric) {
      return this.applyGeriatricAdjustments(dosageInfo);
    }

    return {
      dosage: dosageInfo.dose,
      frequency: dosageInfo.regimen,
    };
  }

  /**
   * Apply geriatric dosing adjustments (generally more conservative)
   */
  private applyGeriatricAdjustments(dosageInfo: any): { dosage: string; frequency: string } {
    // Geriatric patients often need 75-80% of adult dose
    const doseMatch = dosageInfo.dose.match(/(\d+(?:\.\d+)?)/);
    if (doseMatch) {
      const originalDose = parseFloat(doseMatch[1]);
      const adjustedDose = Math.round(originalDose * 0.8 * 100) / 100;
      return {
        dosage: dosageInfo.dose.replace(doseMatch[1], adjustedDose.toString()),
        frequency: dosageInfo.regimen,
      };
    }

    return {
      dosage: dosageInfo.dose,
      frequency: dosageInfo.regimen,
    };
  }

  /**
   * Apply renal adjustments based on creatinine clearance
   */
  private applyRenalAdjustments(drug: Drug, crcl: number): { adjustment: string; doseAmount: string } {
    if (!drug.renal_adjustment || drug.renal_adjustment.length === 0) {
      return { adjustment: 'None required', doseAmount: 'Standard dose' };
    }

    // Find the most appropriate renal adjustment
    for (const adjustment of drug.renal_adjustment) {
      const condition = adjustment.condition.toLowerCase();

      if (condition.includes('>50') && crcl > 50) {
        return { adjustment: adjustment.adjustment, doseAmount: adjustment.dose_amount };
      }
      if (condition.includes('10–50') && crcl >= 10 && crcl <= 50) {
        return { adjustment: adjustment.adjustment, doseAmount: adjustment.dose_amount };
      }
      if (condition.includes('<10') && crcl < 10) {
        return { adjustment: adjustment.adjustment, doseAmount: adjustment.dose_amount };
      }
    }

    return { adjustment: 'None required', doseAmount: 'Standard dose' };
  }

  /**
   * Apply hepatic adjustments based on patient conditions
   */
  private applyHepaticAdjustments(drug: Drug, patientParams: PatientParameters): { adjustment: string; doseAmount: string } {
    if (!drug.hepatic_adjustment || drug.hepatic_adjustment.length === 0) {
      return { adjustment: 'None required', doseAmount: 'Standard dose' };
    }

    // Check for hepatic conditions
    const hasHepaticCondition = patientParams.conditions.some(condition =>
      condition.toLowerCase().includes('hepat') ||
      condition.toLowerCase().includes('liver') ||
      condition.toLowerCase().includes('cirrhosis')
    );

    if (!hasHepaticCondition) {
      // Find Child-Pugh A-B adjustment
      const mildAdjustment = drug.hepatic_adjustment.find(adj =>
        adj.condition.toLowerCase().includes('a-b') ||
        adj.condition.toLowerCase().includes('mild')
      );
      if (mildAdjustment) {
        return { adjustment: mildAdjustment.adjustment, doseAmount: mildAdjustment.dose_amount };
      }
    } else {
      // Find Child-Pugh C adjustment
      const severeAdjustment = drug.hepatic_adjustment.find(adj =>
        adj.condition.toLowerCase().includes('c') ||
        adj.condition.toLowerCase().includes('severe')
      );
      if (severeAdjustment) {
        return { adjustment: severeAdjustment.adjustment, doseAmount: severeAdjustment.dose_amount };
      }
    }

    return { adjustment: 'None required', doseAmount: 'Standard dose' };
  }

  /**
   * Check for contraindications
   */
  private checkContraindications(drug: Drug, patientParams: PatientParameters): string[] {
    const contraindications: string[] = [];

    for (const contraindication of drug.contraindications) {
      const contraLower = contraindication.toLowerCase();

      // Check allergies
      if (contraLower.includes('allergy') || contraLower.includes('hypersensitivity')) {
        const drugClass = drug.class.toLowerCase();
        const hasAllergy = patientParams.allergies.some(allergy =>
          allergy.toLowerCase().includes(drugClass) ||
          allergy.toLowerCase().includes(drug.name.toLowerCase())
        );
        if (hasAllergy) {
          contraindications.push(contraindication);
        }
      }

      // Check conditions
      for (const condition of patientParams.conditions) {
        if (contraLower.includes(condition.toLowerCase())) {
          contraindications.push(contraindication);
        }
      }

      // Age-specific contraindications
      if (patientParams.age < 18 && contraLower.includes('children')) {
        contraindications.push(contraindication);
      }
      if (patientParams.age > 65 && contraLower.includes('elderly')) {
        contraindications.push(contraindication);
      }
    }

    return contraindications;
  }

  /**
   * Generate warnings based on patient parameters and calculated values
   */
  private generateWarnings(
    drug: Drug,
    patientParams: PatientParameters,
    crcl: number
  ): Warning[] {
    const warnings: Warning[] = [];

    // Renal function warnings
    if (crcl < 30 && drug.renal_adjustment.length > 0) {
      warnings.push({
        level: 'moderate',
        message: 'Patient has impaired renal function. Dose adjustment required.',
        recommendation: 'Monitor renal function closely during therapy.',
      });
    }

    // Pediatric warnings
    if (patientParams.age < 12 && drug.dosage.pediatrics.dose === drug.dosage.adults.dose) {
      warnings.push({
        level: 'minor',
        message: 'Pediatric dosing information limited for this drug.',
        recommendation: 'Consult pediatric dosing guidelines or specialist.',
      });
    }

    // Geriatric warnings
    if (patientParams.age > 75) {
      warnings.push({
        level: 'minor',
        message: 'Elderly patient. Consider conservative dosing.',
        recommendation: 'Start with lower dose and titrate carefully.',
      });
    }

    // Drug interaction warnings (basic)
    const interactionWarnings = this.checkBasicInteractions(drug, patientParams);
    warnings.push(...interactionWarnings);

    return warnings;
  }

  /**
   * Check for basic drug interactions
   */
  private checkBasicInteractions(drug: Drug, patientParams: PatientParameters): Warning[] {
    const warnings: Warning[] = [];

    // This is a simplified interaction check - in practice, this would be more comprehensive
    for (const interaction of drug.interactions) {
      const drugLower = interaction.drug.toLowerCase();

      // Check if patient is on interacting medications
      // This is a basic check - real implementation would have comprehensive drug database
      if (drugLower.includes('warfarin') && patientParams.conditions.includes('anticoagulant')) {
        warnings.push({
          level: 'major',
          message: `Potential interaction with ${interaction.drug}`,
          recommendation: interaction.management,
        });
      }
    }

    return warnings;
  }

  /**
   * Format final dosage combining all adjustments
   */
  private formatFinalDosage(
    baseDosage: { dosage: string; frequency: string },
    renalAdj: { adjustment: string; doseAmount: string },
    hepaticAdj: { adjustment: string; doseAmount: string }
  ): { dosage: string; frequency: string } {
    let finalDosage = baseDosage.dosage;
    let finalFrequency = baseDosage.frequency;

    // Apply renal adjustment if needed
    if (renalAdj.adjustment !== 'None required') {
      finalDosage = renalAdj.doseAmount;
    }

    // Apply hepatic adjustment if needed
    if (hepaticAdj.adjustment !== 'None required') {
      finalDosage = hepaticAdj.doseAmount;
    }

    return {
      dosage: finalDosage,
      frequency: finalFrequency,
    };
  }

  /**
   * Calculate total quantity for a course of treatment
   */
  private calculateTotalQuantity(finalDosage: { dosage: string; frequency: string }, drugClass: string): string {
    // Extract dose amount from dosage string
    const doseMatch = finalDosage.dosage.match(/(\d+(?:\.\d+)?)/);
    if (!doseMatch) return 'Consult pharmacist';

    const dosePerAdministration = parseFloat(doseMatch[1]);

    // Parse frequency to get administrations per day
    const freqMatch = finalDosage.frequency.match(/Q(\d+)H/);
    let administrationsPerDay = 1;

    if (freqMatch) {
      const hours = parseInt(freqMatch[1]);
      administrationsPerDay = 24 / hours;
    } else if (finalDosage.frequency.includes('daily') || finalDosage.frequency.includes('QD')) {
      administrationsPerDay = 1;
    } else if (finalDosage.frequency.includes('BID') || finalDosage.frequency.includes('twice')) {
      administrationsPerDay = 2;
    } else if (finalDosage.frequency.includes('TID') || finalDosage.frequency.includes('three')) {
      administrationsPerDay = 3;
    } else if (finalDosage.frequency.includes('QID') || finalDosage.frequency.includes('four')) {
      administrationsPerDay = 4;
    }

    // Default duration based on drug class
    const duration = this.getDefaultDuration(drugClass);

    // Extract days from duration
    const daysMatch = duration.match(/(\d+)/);
    const days = daysMatch ? parseInt(daysMatch[1]) : 7;

    const totalDose = dosePerAdministration * administrationsPerDay * days;

    return `${Math.ceil(totalDose)} ${finalDosage.dosage.split(' ')[1] || 'units'}`;
  }

  /**
   * Get default duration based on drug class
   */
  private getDefaultDuration(drugClass: string): string {
    switch (drugClass.toLowerCase()) {
      case 'antibiotics':
      case 'penicillins':
      case 'macrolides':
      case 'lincosamides':
        return '7-10 days';
      case 'analgesics':
      case 'nsaids':
        return '3-5 days PRN';
      case 'local anesthetics':
        return 'Single dose';
      default:
        return 'As directed';
    }
  }

  /**
   * Generate clinical notes
   */
  private generateClinicalNotes(
    drug: Drug,
    patientParams: PatientParameters,
    renalAdj: any,
    hepaticAdj: any
  ): string[] {
    const notes: string[] = [];

    notes.push(`Calculated for ${patientParams.age} year old ${patientParams.gender || 'patient'} weighing ${patientParams.weight}kg`);

    if (renalAdj.adjustment !== 'None required') {
      notes.push(`Renal adjustment applied: ${renalAdj.adjustment}`);
    }

    if (hepaticAdj.adjustment !== 'None required') {
      notes.push(`Hepatic adjustment applied: ${hepaticAdj.adjustment}`);
    }

    if (patientParams.conditions.length > 0) {
      notes.push(`Patient conditions: ${patientParams.conditions.join(', ')}`);
    }

    if (patientParams.allergies.length > 0) {
      notes.push(`Patient allergies: ${patientParams.allergies.join(', ')}`);
    }

    // Add monitoring recommendations
    if (drug.class.toLowerCase().includes('antibiotic')) {
      notes.push('Monitor for signs of infection resolution and adverse reactions');
    }

    return notes;
  }

  /**
   * Get drug by ID with caching
   */
  private async getDrugById(drugId: string): Promise<Drug | null> {
    // Check cache first
    if (this.drugCache.has(drugId)) {
      return this.drugCache.get(drugId)!;
    }

    // Load from service
    const drug = await drugDataService.getDrugById(drugId);
    if (drug) {
      this.drugCache.set(drugId, drug);
    }

    return drug;
  }

  /**
   * Validate patient parameters
   */
  private validatePatientParameters(params: PatientParameters): void {
    if (params.age < 0 || params.age > 150) {
      throw new Error('Invalid patient age');
    }

    if (params.weight < 1 || params.weight > 500) {
      throw new Error('Invalid patient weight');
    }

    if (params.creatinine && (params.creatinine < 0.1 || params.creatinine > 20)) {
      throw new Error('Invalid creatinine level');
    }
  }

  /**
   * Calculate doses for multiple drugs
   */
  async calculateMultipleDrugDoses(
    drugIds: string[],
    patientParams: PatientParameters
  ): Promise<DoseCalculationResult[]> {
    const results: DoseCalculationResult[] = [];

    for (const drugId of drugIds) {
      const result = await this.calculateDrugDose(drugId, patientParams);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Clear calculation cache
   */
  clearCache(): void {
    this.drugCache.clear();
    storageService.removeFromStorage(this.CACHE_KEY);
  }
}

// Export singleton instance
export const drugCalculationEngine = new DrugCalculationEngine();
export default drugCalculationEngine;