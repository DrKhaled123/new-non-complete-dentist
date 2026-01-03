import { Drug, PatientParameters, Warning, CACHE_TTL } from '../types';
import storageService from './storageService';
import drugDataService from './drugDataService';

export interface DrugInteractionResult {
  drug1: string;
  drug2: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  effect: string;
  management: string;
  evidence: string;
}

export interface InteractionCheckResult {
  interactions: DrugInteractionResult[];
  contraindications: string[];
  warnings: Warning[];
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
}

/**
 * InteractionChecker - Analyzes drug combinations for interactions, contraindications, and warnings
 *
 * Features:
 * - Drug-drug interaction analysis
 * - Patient-specific contraindication checking
 * - Severity classification and management recommendations
 * - Performance optimized with caching
 */
class InteractionChecker {
  private drugCache: Map<string, Drug> = new Map();
  private interactionCache: Map<string, DrugInteractionResult[]> = new Map();
  private readonly CACHE_KEY = 'dental_cache_interactions';

  /**
   * Check interactions for a combination of drugs
   */
  async checkDrugInteractions(
    drugIds: string[],
    patientParams?: PatientParameters
  ): Promise<InteractionCheckResult> {
    try {
      if (drugIds.length < 2) {
        return {
          interactions: [],
          contraindications: [],
          warnings: [],
          overallRisk: 'low',
        };
      }

      // Load all drugs
      const drugs: Drug[] = [];
      for (const drugId of drugIds) {
        const drug = await this.getDrugById(drugId);
        if (drug) {
          drugs.push(drug);
        }
      }

      // Check pairwise interactions
      const interactions = await this.checkPairwiseInteractions(drugs);

      // Check contraindications
      const contraindications = this.checkContraindications(drugs, patientParams);

      // Generate warnings
      const warnings = this.generateInteractionWarnings(interactions, drugs, patientParams);

      // Calculate overall risk
      const overallRisk = this.calculateOverallRisk(interactions, contraindications);

      return {
        interactions,
        contraindications,
        warnings,
        overallRisk,
      };
    } catch (error) {
      console.error('Failed to check drug interactions:', error);
      return {
        interactions: [],
        contraindications: [],
        warnings: [{
          level: 'major',
          message: 'Failed to check drug interactions',
          recommendation: 'Consult pharmacist for interaction screening',
        }],
        overallRisk: 'high',
      };
    }
  }

  /**
   * Check interactions between two specific drugs
   */
  async checkPairInteraction(
    drugId1: string,
    drugId2: string,
    patientParams?: PatientParameters
  ): Promise<DrugInteractionResult | null> {
    try {
      // Check cache first
      const cacheKey = this.getInteractionCacheKey(drugId1, drugId2);
      if (this.interactionCache.has(cacheKey)) {
        const cached = this.interactionCache.get(cacheKey);
        return cached ? cached[0] || null : null;
      }

      const drug1 = await this.getDrugById(drugId1);
      const drug2 = await this.getDrugById(drugId2);

      if (!drug1 || !drug2) {
        return null;
      }

      const interaction = this.findInteraction(drug1, drug2);
      if (interaction) {
        this.interactionCache.set(cacheKey, [interaction]);
        return interaction;
      }

      // Cache empty result
      this.interactionCache.set(cacheKey, []);

      return null;
    } catch (error) {
      console.error(`Failed to check interaction between ${drugId1} and ${drugId2}:`, error);
      return null;
    }
  }

  /**
   * Check pairwise interactions for multiple drugs
   */
  private async checkPairwiseInteractions(drugs: Drug[]): Promise<DrugInteractionResult[]> {
    const interactions: DrugInteractionResult[] = [];

    // Check each pair of drugs
    for (let i = 0; i < drugs.length; i++) {
      for (let j = i + 1; j < drugs.length; j++) {
        const interaction = this.findInteraction(drugs[i], drugs[j]);
        if (interaction) {
          interactions.push(interaction);
        }
      }
    }

    return interactions;
  }

  /**
   * Find interaction between two drugs
   */
  private findInteraction(drug1: Drug, drug2: Drug): DrugInteractionResult | null {
    // Check if drug1 has interactions with drug2
    for (const interaction of drug1.interactions) {
      if (this.matchesDrugName(interaction.drug, drug2.name)) {
        return {
          drug1: drug1.name,
          drug2: drug2.name,
          severity: this.classifySeverity(interaction.effect),
          effect: interaction.effect,
          management: interaction.management,
          evidence: 'Drug interaction database',
        };
      }
    }

    // Check if drug2 has interactions with drug1
    for (const interaction of drug2.interactions) {
      if (this.matchesDrugName(interaction.drug, drug1.name)) {
        return {
          drug1: drug2.name,
          drug2: drug1.name,
          severity: this.classifySeverity(interaction.effect),
          effect: interaction.effect,
          management: interaction.management,
          evidence: 'Drug interaction database',
        };
      }
    }

    // Check for class-based interactions
    return this.checkClassBasedInteractions(drug1, drug2);
  }

  /**
   * Check for interactions based on drug classes
   */
  private checkClassBasedInteractions(drug1: Drug, drug2: Drug): DrugInteractionResult | null {
    const class1 = drug1.class.toLowerCase();
    const class2 = drug2.class.toLowerCase();

    // Common class-based interactions
    if ((class1.includes('nsaids') || class1.includes('analgesics')) &&
        (class2.includes('nsaids') || class2.includes('analgesics'))) {
      return {
        drug1: drug1.name,
        drug2: drug2.name,
        severity: 'moderate',
        effect: 'Increased risk of gastrointestinal bleeding and ulceration',
        management: 'Use lowest effective doses, consider gastroprotection',
        evidence: 'Class-based interaction',
      };
    }

    if ((class1.includes('antibiotic') || class1.includes('penicillin')) &&
        class2.includes('oral contraceptive')) {
      return {
        drug1: drug1.name,
        drug2: drug2.name,
        severity: 'moderate',
        effect: 'Reduced oral contraceptive efficacy',
        management: 'Use backup contraception',
        evidence: 'Class-based interaction',
      };
    }

    if (class1.includes('macrolide') && class2.includes('statin')) {
      return {
        drug1: drug1.name,
        drug2: drug2.name,
        severity: 'major',
        effect: 'Increased risk of rhabdomyolysis and myopathy',
        management: 'Temporarily discontinue statin or choose alternative antibiotic',
        evidence: 'Class-based interaction',
      };
    }

    return null;
  }

  /**
   * Check if drug name matches (case-insensitive, partial matching)
   */
  private matchesDrugName(interactionDrug: string, actualDrug: string): boolean {
    const interactionLower = interactionDrug.toLowerCase();
    const actualLower = actualDrug.toLowerCase();

    // Exact match
    if (interactionLower === actualLower) {
      return true;
    }

    // Partial match (e.g., "warfarin" matches "Warfarin sodium")
    if (actualLower.includes(interactionLower) || interactionLower.includes(actualLower)) {
      return true;
    }

    return false;
  }

  /**
   * Classify interaction severity based on effect description
   */
  private classifySeverity(effect: string): 'minor' | 'moderate' | 'major' | 'contraindicated' {
    const effectLower = effect.toLowerCase();

    if (effectLower.includes('contraindicated') || effectLower.includes('avoid') ||
        effectLower.includes('do not use together')) {
      return 'contraindicated';
    }

    if (effectLower.includes('major') || effectLower.includes('severe') ||
        effectLower.includes('life-threatening') || effectLower.includes('rhabdomyolysis')) {
      return 'major';
    }

    if (effectLower.includes('moderate') || effectLower.includes('significant') ||
        effectLower.includes('increased risk') || effectLower.includes('toxicity')) {
      return 'moderate';
    }

    return 'minor';
  }

  /**
   * Check contraindications for drugs based on patient parameters
   */
  private checkContraindications(drugs: Drug[], patientParams?: PatientParameters): string[] {
    const contraindications: string[] = [];

    if (!patientParams) {
      return contraindications;
    }

    for (const drug of drugs) {
      for (const contraindication of drug.contraindications) {
        const contraLower = contraindication.toLowerCase();

        // Check allergies
        if (contraLower.includes('allergy') || contraLower.includes('hypersensitivity')) {
          const drugClass = drug.class.toLowerCase();
          const drugName = drug.name.toLowerCase();

          const hasAllergy = patientParams.allergies.some(allergy =>
            allergy.toLowerCase().includes(drugClass) ||
            allergy.toLowerCase().includes(drugName.split(' ')[0]) // Check generic name
          );

          if (hasAllergy) {
            contraindications.push(`${drug.name}: ${contraindication}`);
          }
        }

        // Check medical conditions
        for (const condition of patientParams.conditions) {
          if (contraLower.includes(condition.toLowerCase())) {
            contraindications.push(`${drug.name}: ${contraindication}`);
          }
        }

        // Age-specific contraindications
        if (patientParams.age < 18 && (contraLower.includes('children') || contraLower.includes('pediatric'))) {
          contraindications.push(`${drug.name}: ${contraindication}`);
        }

        if (patientParams.age > 65 && contraLower.includes('elderly')) {
          contraindications.push(`${drug.name}: ${contraindication}`);
        }

        // Pregnancy/lactation (if applicable)
        if (patientParams.conditions.some(c => c.toLowerCase().includes('pregnant'))) {
          if (contraLower.includes('pregnancy') || contraLower.includes('lactation')) {
            contraindications.push(`${drug.name}: ${contraindication}`);
          }
        }
      }
    }

    return contraindications;
  }

  /**
   * Generate warnings based on interactions and patient factors
   */
  private generateInteractionWarnings(
    interactions: DrugInteractionResult[],
    drugs: Drug[],
    patientParams?: PatientParameters
  ): Warning[] {
    const warnings: Warning[] = [];

    // Add warnings for each interaction
    for (const interaction of interactions) {
      let level: 'minor' | 'moderate' | 'major' = 'minor';
      let recommendation = interaction.management;

      switch (interaction.severity) {
        case 'contraindicated':
          level = 'major';
          recommendation = `Do not use together. ${interaction.management}`;
          break;
        case 'major':
          level = 'major';
          recommendation = `Monitor closely. ${interaction.management}`;
          break;
        case 'moderate':
          level = 'moderate';
          recommendation = `Use with caution. ${interaction.management}`;
          break;
        case 'minor':
          level = 'minor';
          recommendation = interaction.management;
          break;
      }

      warnings.push({
        level,
        message: `Interaction between ${interaction.drug1} and ${interaction.drug2}: ${interaction.effect}`,
        recommendation,
      });
    }

    // Add general warnings for multiple medications
    if (drugs.length >= 3) {
      warnings.push({
        level: 'moderate',
        message: 'Multiple medications prescribed. Increased risk of adverse effects.',
        recommendation: 'Monitor patient closely for side effects and drug interactions.',
      });
    }

    // Patient-specific warnings
    if (patientParams) {
      if (patientParams.age > 65 && drugs.length >= 2) {
        warnings.push({
          level: 'moderate',
          message: 'Elderly patient on multiple medications.',
          recommendation: 'Consider dose adjustments and monitor for adverse effects.',
        });
      }

      if (patientParams.conditions.some(c => c.toLowerCase().includes('renal'))) {
        warnings.push({
          level: 'moderate',
          message: 'Patient has renal impairment.',
          recommendation: 'Check renal dosing for all medications.',
        });
      }

      if (patientParams.conditions.some(c => c.toLowerCase().includes('hepatic') ||
          c.toLowerCase().includes('liver'))) {
        warnings.push({
          level: 'moderate',
          message: 'Patient has hepatic impairment.',
          recommendation: 'Check hepatic dosing for all medications.',
        });
      }
    }

    return warnings;
  }

  /**
   * Calculate overall risk level
   */
  private calculateOverallRisk(
    interactions: DrugInteractionResult[],
    contraindications: string[]
  ): 'low' | 'moderate' | 'high' | 'critical' {
    // Check for contraindications
    if (contraindications.length > 0) {
      return 'critical';
    }

    // Check interaction severity
    const hasMajor = interactions.some(i => i.severity === 'major' || i.severity === 'contraindicated');
    const hasModerate = interactions.some(i => i.severity === 'moderate');

    if (hasMajor) {
      return 'high';
    }

    if (hasModerate || interactions.length >= 3) {
      return 'moderate';
    }

    if (interactions.length > 0) {
      return 'low';
    }

    return 'low';
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
   * Get cache key for interaction pair
   */
  private getInteractionCacheKey(drugId1: string, drugId2: string): string {
    // Ensure consistent ordering
    const [first, second] = [drugId1, drugId2].sort();
    return `${first}:${second}`;
  }

  /**
   * Get interaction statistics
   */
  async getInteractionStats(): Promise<{
    totalDrugsChecked: number;
    totalInteractionsFound: number;
    riskDistribution: Record<string, number>;
  }> {
    // This would typically track usage statistics
    return {
      totalDrugsChecked: this.drugCache.size,
      totalInteractionsFound: Array.from(this.interactionCache.values())
        .reduce((sum, interactions) => sum + interactions.length, 0),
      riskDistribution: {
        low: 0,
        moderate: 0,
        high: 0,
        critical: 0,
      },
    };
  }

  /**
   * Clear interaction cache
   */
  clearCache(): void {
    this.drugCache.clear();
    this.interactionCache.clear();
    storageService.removeFromStorage(this.CACHE_KEY);
  }

  /**
   * Get all known interactions for a drug
   */
  async getDrugInteractions(drugId: string): Promise<DrugInteractionResult[]> {
    try {
      const drug = await this.getDrugById(drugId);
      if (!drug) {
        return [];
      }

      const results: DrugInteractionResult[] = [];

      for (const interaction of drug.interactions) {
        results.push({
          drug1: drug.name,
          drug2: interaction.drug,
          severity: this.classifySeverity(interaction.effect),
          effect: interaction.effect,
          management: interaction.management,
          evidence: 'Drug interaction database',
        });
      }

      return results;
    } catch (error) {
      console.error(`Failed to get interactions for drug ${drugId}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const interactionChecker = new InteractionChecker();
export default interactionChecker;