import { Material, CACHE_TTL } from '../types';
import storageService from './storageService';
import materialDataService from './materialDataService';

export interface MaterialRecommendationCriteria {
  procedureType?: string;
  location?: 'anterior' | 'posterior' | 'any';
  stressLevel?: 'high' | 'moderate' | 'low';
  aestheticRequirement?: 'critical' | 'important' | 'minimal';
  patientAge?: 'pediatric' | 'adult' | 'geriatric';
  budget?: 'low' | 'medium' | 'high';
  clinicalIndications?: string[];
  contraindications?: string[];
}

export interface MaterialRecommendation {
  material: Material;
  suitabilityScore: number;
  reasoning: string[];
  alternatives: string[];
  warnings: string[];
}

export interface MaterialComparison {
  recommended: Material;
  alternatives: Material[];
  comparisonMatrix: {
    property: string;
    values: Array<{
      materialName: string;
      value: string;
      score: number;
    }>;
  };
}

/**
 * MaterialRecommendationEngine - Provides intelligent material recommendations based on clinical criteria
 *
 * Features:
 * - Procedure-specific material recommendations
 * - Multi-factor scoring algorithm
 * - Material comparison and ranking
 * - Clinical decision support
 * - Performance optimized with caching
 */
class MaterialRecommendationEngine {
  private materialCache: Map<string, Material> = new Map();
  private recommendationCache: Map<string, MaterialRecommendation[]> = new Map();
  private readonly CACHE_KEY = 'dental_cache_material_recommendations';

  /**
   * Get material recommendations based on clinical criteria
   */
  async getRecommendations(
    criteria: MaterialRecommendationCriteria,
    limit: number = 5
  ): Promise<MaterialRecommendation[]> {
    try {
      const cacheKey = this.generateCriteriaKey(criteria);
      if (this.recommendationCache.has(cacheKey)) {
        return this.recommendationCache.get(cacheKey)!.slice(0, limit);
      }

      // Get all materials
      const allMaterials = await materialDataService.getAllMaterials();

      // Score each material
      const recommendations: MaterialRecommendation[] = [];

      for (const material of allMaterials) {
        const score = this.calculateSuitabilityScore(material, criteria);
        if (score > 0) { // Only include materials with some suitability
          const recommendation = await this.createRecommendation(material, criteria, score, allMaterials);
          recommendations.push(recommendation);
        }
      }

      // Sort by suitability score (descending)
      recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

      // Cache results
      this.recommendationCache.set(cacheKey, recommendations);

      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Failed to get material recommendations:', error);
      return [];
    }
  }

  /**
   * Get best material recommendation with alternatives
   */
  async getBestRecommendation(
    criteria: MaterialRecommendationCriteria
  ): Promise<MaterialComparison | null> {
    try {
      const recommendations = await this.getRecommendations(criteria, 3);

      if (recommendations.length === 0) {
        return null;
      }

      const recommended = recommendations[0].material;
      const alternatives = recommendations.slice(1).map(r => r.material);

      // Create comparison matrix
      const comparisonMatrix = await this.createComparisonMatrix([recommended, ...alternatives]);

      return {
        recommended,
        alternatives,
        comparisonMatrix,
      };
    } catch (error) {
      console.error('Failed to get best material recommendation:', error);
      return null;
    }
  }

  /**
   * Get materials specifically for a dental procedure
   */
  async getMaterialsForProcedure(
    procedureId: string,
    additionalCriteria?: Partial<MaterialRecommendationCriteria>
  ): Promise<MaterialRecommendation[]> {
    try {
      // Map common procedures to criteria
      const procedureCriteria = this.mapProcedureToCriteria(procedureId);

      // Merge with additional criteria
      const criteria: MaterialRecommendationCriteria = {
        ...procedureCriteria,
        ...additionalCriteria,
      };

      return await this.getRecommendations(criteria);
    } catch (error) {
      console.error(`Failed to get materials for procedure ${procedureId}:`, error);
      return [];
    }
  }

  /**
   * Compare specific materials side-by-side
   */
  async compareMaterials(
    materialIds: string[],
    criteria?: MaterialRecommendationCriteria
  ): Promise<MaterialComparison | null> {
    try {
      if (materialIds.length < 2) {
        throw new Error('At least 2 materials required for comparison');
      }

      const materials: Material[] = [];
      for (const id of materialIds) {
        const material = await this.getMaterialById(id);
        if (material) {
          materials.push(material);
        }
      }

      if (materials.length < 2) {
        return null;
      }

      // Find best recommendation based on criteria
      const recommended = criteria ?
        await this.selectBestMaterial(materials, criteria) :
        materials[0];

      const alternatives = materials.filter(m => m.id !== recommended.id);

      const comparisonMatrix = await this.createComparisonMatrix(materials);

      return {
        recommended,
        alternatives,
        comparisonMatrix,
      };
    } catch (error) {
      console.error('Failed to compare materials:', error);
      return null;
    }
  }

  /**
   * Calculate suitability score for a material based on criteria
   */
  private calculateSuitabilityScore(material: Material, criteria: MaterialRecommendationCriteria): number {
    let score = 0;
    let maxScore = 0;

    // Procedure type matching (high weight)
    if (criteria.procedureType) {
      maxScore += 30;
      if (material.indications.some(ind =>
        ind.toLowerCase().includes(criteria.procedureType!.toLowerCase())
      )) {
        score += 30;
      } else if (material.category.toLowerCase().includes(criteria.procedureType!.toLowerCase())) {
        score += 15;
      }
    }

    // Location-based scoring
    if (criteria.location) {
      maxScore += 20;
      score += this.scoreLocationSuitability(material, criteria.location);
    }

    // Stress level scoring
    if (criteria.stressLevel) {
      maxScore += 15;
      score += this.scoreStressLevelSuitability(material, criteria.stressLevel);
    }

    // Aesthetic requirement scoring
    if (criteria.aestheticRequirement) {
      maxScore += 15;
      score += this.scoreAestheticSuitability(material, criteria.aestheticRequirement);
    }

    // Patient age consideration
    if (criteria.patientAge) {
      maxScore += 10;
      score += this.scoreAgeSuitability(material, criteria.patientAge);
    }

    // Budget consideration
    if (criteria.budget) {
      maxScore += 5;
      score += this.scoreBudgetSuitability(material, criteria.budget);
    }

    // Clinical indications matching
    if (criteria.clinicalIndications && criteria.clinicalIndications.length > 0) {
      maxScore += 10;
      const matches = criteria.clinicalIndications.filter(indication =>
        material.indications.some(matInd =>
          matInd.toLowerCase().includes(indication.toLowerCase())
        )
      ).length;
      score += (matches / criteria.clinicalIndications.length) * 10;
    }

    // Check contraindications (can reduce score significantly)
    if (criteria.contraindications && criteria.contraindications.length > 0) {
      const hasContraindications = criteria.contraindications.some(contraindication =>
        material.contraindications.some(matContra =>
          matContra.toLowerCase().includes(contraindication.toLowerCase())
        )
      );

      if (hasContraindications) {
        score *= 0.3; // Reduce score by 70% if contraindicated
      }
    }

    return maxScore > 0 ? (score / maxScore) * 100 : 0;
  }

  /**
   * Score material suitability based on location
   */
  private scoreLocationSuitability(material: Material, location: 'anterior' | 'posterior' | 'any'): number {
    if (location === 'any') return 20;

    const indications = material.indications.join(' ').toLowerCase();
    const properties = Object.values(material.properties).join(' ').toLowerCase();

    if (location === 'anterior') {
      // Anterior teeth need aesthetics
      const hasAesthetics = properties.includes('excellent') ||
                          properties.includes('good') ||
                          indications.includes('anterior') ||
                          indications.includes('esthetic');

      return hasAesthetics ? 20 : 5;
    } else { // posterior
      // Posterior teeth need strength
      const hasStrength = properties.includes('high') ||
                         properties.includes('very high') ||
                         indications.includes('posterior') ||
                         indications.includes('molar');

      return hasStrength ? 20 : 8;
    }
  }

  /**
   * Score material suitability based on stress level
   */
  private scoreStressLevelSuitability(material: Material, stressLevel: 'high' | 'moderate' | 'low'): number {
    const strength = material.properties.strength?.toLowerCase();

    switch (stressLevel) {
      case 'high':
        return (strength?.includes('very high') || strength?.includes('high')) ? 15 : 3;
      case 'moderate':
        return (strength?.includes('high') || strength?.includes('moderate')) ? 15 : 5;
      case 'low':
        return 15; // Most materials suitable for low stress
      default:
        return 7;
    }
  }

  /**
   * Score material suitability based on aesthetic requirements
   */
  private scoreAestheticSuitability(material: Material, aestheticReq: 'critical' | 'important' | 'minimal'): number {
    const aesthetics = material.properties.aesthetics?.toLowerCase();

    switch (aestheticReq) {
      case 'critical':
        return aesthetics?.includes('excellent') ? 15 : 2;
      case 'important':
        return (aesthetics?.includes('excellent') || aesthetics?.includes('good')) ? 15 : 5;
      case 'minimal':
        return 15; // Most materials acceptable
      default:
        return 7;
    }
  }

  /**
   * Score material suitability based on patient age
   */
  private scoreAgeSuitability(material: Material, age: 'pediatric' | 'adult' | 'geriatric'): number {
    const indications = material.indications.join(' ').toLowerCase();

    switch (age) {
      case 'pediatric':
        // Pediatric materials should be durable and easy to maintain
        return indications.includes('pediatric') ||
               material.properties.durability?.includes('high') ? 10 : 5;
      case 'geriatric':
        // Geriatric considerations: ease of placement, maintenance
        return material.handling_characteristics.some(char =>
          char.toLowerCase().includes('easy') ||
          char.toLowerCase().includes('simple')
        ) ? 10 : 6;
      case 'adult':
        return 10; // Standard suitability
      default:
        return 5;
    }
  }

  /**
   * Score material suitability based on budget
   */
  private scoreBudgetSuitability(material: Material, budget: 'low' | 'medium' | 'high'): number {
    const cost = material.cost_considerations.toLowerCase();

    switch (budget) {
      case 'low':
        return cost.includes('low') || cost.includes('economical') ? 5 : 1;
      case 'medium':
        return cost.includes('moderate') || cost.includes('reasonable') ? 5 : 2;
      case 'high':
        return cost.includes('high') || cost.includes('premium') ? 5 : 3;
      default:
        return 3;
    }
  }

  /**
   * Create a detailed recommendation object
   */
  private async createRecommendation(
    material: Material,
    criteria: MaterialRecommendationCriteria,
    score: number,
    allMaterials: Material[]
  ): Promise<MaterialRecommendation> {
    const reasoning: string[] = [];
    const warnings: string[] = [];

    // Generate reasoning based on criteria matches
    if (criteria.procedureType) {
      const matchesProcedure = material.indications.some(ind =>
        ind.toLowerCase().includes(criteria.procedureType!.toLowerCase())
      );
      if (matchesProcedure) {
        reasoning.push(`Well-suited for ${criteria.procedureType} procedures`);
      }
    }

    if (criteria.location === 'anterior') {
      const aesthetics = material.properties.aesthetics;
      if (aesthetics && (aesthetics.includes('excellent') || aesthetics.includes('good'))) {
        reasoning.push(`Good aesthetic properties for anterior placement`);
      }
    }

    if (criteria.stressLevel === 'high') {
      const strength = material.properties.strength;
      if (strength && strength.includes('high')) {
        reasoning.push(`High strength suitable for high-stress applications`);
      }
    }

    // Check for contraindications
    if (criteria.contraindications) {
      const hasContraindications = criteria.contraindications.some(contraindication =>
        material.contraindications.some(matContra =>
          matContra.toLowerCase().includes(contraindication.toLowerCase())
        )
      );

      if (hasContraindications) {
        warnings.push('Material has contraindications that match patient conditions');
      }
    }

    // Find alternatives (similar materials with slightly lower scores)
    const alternatives = allMaterials
      .filter(m => m.id !== material.id)
      .filter(m => this.calculateSuitabilityScore(m, criteria) > score * 0.7)
      .slice(0, 3)
      .map(m => m.name);

    return {
      material,
      suitabilityScore: Math.round(score),
      reasoning,
      alternatives,
      warnings,
    };
  }

  /**
   * Create comparison matrix for materials
   */
  private async createComparisonMatrix(materials: Material[]): Promise<{
    property: string;
    values: Array<{ materialName: string; value: string; score: number }>;
  }> {
    const properties = [
      'category',
      'strength',
      'aesthetics',
      'durability',
      'biocompatibility',
      'longevity',
      'cost_considerations'
    ];

    const matrix: Array<{
      property: string;
      values: Array<{ materialName: string; value: string; score: number }>;
    }> = [];

    for (const prop of properties) {
      const values = materials.map(material => ({
        materialName: material.name,
        value: this.getMaterialPropertyValue(material, prop),
        score: this.scoreProperty(material, prop),
      }));

      matrix.push({
        property: prop.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        values,
      });
    }

    return matrix[0]; // Return first for simplicity, in practice might want all
  }

  /**
   * Get material property value for comparison
   */
  private getMaterialPropertyValue(material: Material, property: string): string {
    switch (property) {
      case 'category':
        return material.category;
      case 'longevity':
        return material.longevity;
      case 'cost_considerations':
        return material.cost_considerations;
      default:
        const value = material.properties[property];
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return value || 'N/A';
    }
  }

  /**
   * Score a material property for comparison
   */
  private scoreProperty(material: Material, property: string): number {
    const value = this.getMaterialPropertyValue(material, property).toLowerCase();

    // Simple scoring based on qualitative terms
    if (value.includes('excellent') || value.includes('very high')) return 5;
    if (value.includes('good') || value.includes('high')) return 4;
    if (value.includes('fair') || value.includes('moderate')) return 3;
    if (value.includes('poor') || value.includes('low')) return 2;
    return 3; // Neutral score
  }

  /**
   * Map procedure ID to recommendation criteria
   */
  private mapProcedureToCriteria(procedureId: string): MaterialRecommendationCriteria {
    const criteria: MaterialRecommendationCriteria = {};

    // This is a simplified mapping - in practice, this would be more comprehensive
    const procedureLower = procedureId.toLowerCase();

    if (procedureLower.includes('filling') || procedureLower.includes('restoration')) {
      criteria.procedureType = 'restoration';
    }

    if (procedureLower.includes('crown') || procedureLower.includes('bridge')) {
      criteria.procedureType = 'crown';
      criteria.stressLevel = 'high';
    }

    if (procedureLower.includes('veneer') || procedureLower.includes('anterior')) {
      criteria.location = 'anterior';
      criteria.aestheticRequirement = 'critical';
    }

    if (procedureLower.includes('posterior') || procedureLower.includes('molar')) {
      criteria.location = 'posterior';
      criteria.stressLevel = 'high';
    }

    return criteria;
  }

  /**
   * Select best material from a list based on criteria
   */
  private async selectBestMaterial(materials: Material[], criteria: MaterialRecommendationCriteria): Promise<Material> {
    let bestMaterial = materials[0];
    let bestScore = 0;

    for (const material of materials) {
      const score = this.calculateSuitabilityScore(material, criteria);
      if (score > bestScore) {
        bestScore = score;
        bestMaterial = material;
      }
    }

    return bestMaterial;
  }

  /**
   * Get material by ID with caching
   */
  private async getMaterialById(materialId: string): Promise<Material | null> {
    if (this.materialCache.has(materialId)) {
      return this.materialCache.get(materialId)!;
    }

    const material = await materialDataService.getMaterialById(materialId);
    if (material) {
      this.materialCache.set(materialId, material);
    }

    return material;
  }

  /**
   * Generate cache key for criteria
   */
  private generateCriteriaKey(criteria: MaterialRecommendationCriteria): string {
    return JSON.stringify(criteria, Object.keys(criteria).sort());
  }

  /**
   * Clear recommendation cache
   */
  clearCache(): void {
    this.materialCache.clear();
    this.recommendationCache.clear();
    storageService.removeFromStorage(this.CACHE_KEY);
  }

  /**
   * Get recommendation statistics
   */
  getRecommendationStats(): {
    cachedMaterials: number;
    cachedRecommendations: number;
  } {
    return {
      cachedMaterials: this.materialCache.size,
      cachedRecommendations: this.recommendationCache.size,
    };
  }
}

// Export singleton instance
export const materialRecommendationEngine = new MaterialRecommendationEngine();
export default materialRecommendationEngine;