import { Material, CACHE_TTL } from '../types';
import storageService from './storageService';
import materialsData from '../data/materials_extended.json';

/**
 * MaterialDataService - Manages dental materials database operations
 * 
 * Features:
 * - Load and cache materials database
 * - Search materials by name, category, or properties
 * - Compare materials side-by-side
 * - Get material recommendations based on criteria
 * - Performance optimized with caching
 */
class MaterialDataService {
  private materials: Material[] = [];
  private isLoaded = false;
  private readonly CACHE_KEY = 'dental_cache_materials';

  /**
   * Get all materials
   */
  async getAllMaterials(): Promise<Material[]> {
    try {
      return await this.loadMaterials();
    } catch (error) {
      console.error('Failed to get all materials:', error);
      throw new Error('Failed to load materials database');
    }
  }

  /**
   * Load materials from JSON file
   */
  async loadMaterials(): Promise<Material[]> {
    try {
      if (this.isLoaded && this.materials.length > 0) {
        return this.materials;
      }

      // Try to load from cache first
      const cachedMaterials = this.loadFromCache();
      if (cachedMaterials) {
        this.materials = cachedMaterials;
        this.isLoaded = true;
        return this.materials;
      }

      // Load from JSON data
      this.materials = materialsData.materials.map(material => ({
        ...material,
        // Ensure all materials have proper structure
        indications: material.indications || [],
        contraindications: material.contraindications || [],
        handling_characteristics: material.handling_characteristics || [],
        properties: material.properties || {},
      }));

      this.isLoaded = true;

      // Cache the loaded data
      this.saveToCache(this.materials);

      console.log(`Loaded ${this.materials.length} materials from database`);
      return this.materials;
    } catch (error) {
      console.error('Failed to load materials database:', error);
      throw new Error('Failed to load materials database');
    }
  }

  /**
   * Search materials by query (name, category, properties, or indications)
   */
  async searchMaterial(query: string): Promise<Material[]> {
    try {
      await this.loadMaterials();

      if (!query || query.trim().length === 0) {
        return this.materials;
      }

      const searchTerm = query.toLowerCase().trim();
      
      return this.materials.filter(material => {
        // Search in material name
        if (material.name.toLowerCase().includes(searchTerm)) {
          return true;
        }

        // Search in category
        if (material.category.toLowerCase().includes(searchTerm)) {
          return true;
        }

        // Search in properties
        const hasMatchingProperty = Object.entries(material.properties).some(([key, value]) => {
          if (key.toLowerCase().includes(searchTerm)) {
            return true;
          }
          if (value) {
            if (Array.isArray(value)) {
              return value.some(v => v.toLowerCase().includes(searchTerm));
            } else {
              return value.toLowerCase().includes(searchTerm);
            }
          }
          return false;
        });
        if (hasMatchingProperty) {
          return true;
        }

        // Search in indications
        const hasMatchingIndication = material.indications.some(indication =>
          indication.toLowerCase().includes(searchTerm)
        );
        if (hasMatchingIndication) {
          return true;
        }

        // Search in handling characteristics
        const hasMatchingHandling = material.handling_characteristics.some(characteristic =>
          characteristic.toLowerCase().includes(searchTerm)
        );
        if (hasMatchingHandling) {
          return true;
        }

        return false;
      });
    } catch (error) {
      console.error('Material search failed:', error);
      throw new Error('Failed to search materials');
    }
  }

  /**
   * Get material by ID
   */
  async getMaterialById(id: string): Promise<Material | null> {
    try {
      await this.loadMaterials();

      const material = this.materials.find(m => 
        m.id === id || m.name.toLowerCase() === id.toLowerCase()
      );
      return material || null;
    } catch (error) {
      console.error('Failed to get material by ID:', error);
      return null;
    }
  }

  /**
   * Get materials by category
   */
  async getMaterialsByCategory(category: string): Promise<Material[]> {
    try {
      await this.loadMaterials();

      return this.materials.filter(material =>
        material.category.toLowerCase() === category.toLowerCase()
      );
    } catch (error) {
      console.error('Failed to get materials by category:', error);
      return [];
    }
  }

  /**
   * Compare materials side-by-side
   */
  async compareMaterials(ids: string[]): Promise<{
    materials: Material[];
    comparison: {
      property: string;
      values: { materialId: string; materialName: string; value: string }[];
    }[];
  }> {
    try {
      if (ids.length < 2) {
        throw new Error('At least 2 materials required for comparison');
      }

      if (ids.length > 4) {
        throw new Error('Maximum 4 materials can be compared at once');
      }

      // Get materials
      const materials: Material[] = [];
      for (const id of ids) {
        const material = await this.getMaterialById(id);
        if (material) {
          materials.push(material);
        }
      }

      if (materials.length < 2) {
        throw new Error('Could not find enough materials for comparison');
      }

      // Create comparison table
      const allProperties = new Set<string>();
      materials.forEach(material => {
        Object.keys(material.properties).forEach(prop => allProperties.add(prop));
      });

      // Add standard comparison fields
      allProperties.add('category');
      allProperties.add('longevity');
      allProperties.add('cost_considerations');

      const comparison = Array.from(allProperties).map(property => ({
        property: this.formatPropertyName(property),
        values: materials.map(material => ({
          materialId: material.id,
          materialName: material.name,
          value: this.getPropertyValue(material, property),
        })),
      }));

      return { materials, comparison };
    } catch (error) {
      console.error('Material comparison failed:', error);
      throw error;
    }
  }

  /**
   * Get material recommendations based on criteria
   */
  async getRecommendations(criteria: {
    indication?: string;
    aesthetics?: 'excellent' | 'good' | 'fair' | 'poor';
    strength?: 'very high' | 'high' | 'moderate' | 'low';
    durability?: string;
    category?: string;
  }): Promise<Material[]> {
    try {
      await this.loadMaterials();

      let filtered = [...this.materials];

      // Filter by indication
      if (criteria.indication) {
        const indication = criteria.indication.toLowerCase();
        filtered = filtered.filter(material =>
          material.indications.some(ind => ind.toLowerCase().includes(indication))
        );
      }

      // Filter by category
      if (criteria.category) {
        const categoryFilter = criteria.category.toLowerCase();
        filtered = filtered.filter(material =>
          material.category.toLowerCase() === categoryFilter
        );
      }

      // Filter by aesthetics
      if (criteria.aesthetics) {
        filtered = filtered.filter(material => {
          const aesthetics = material.properties.aesthetics?.toLowerCase();
          return aesthetics?.includes(criteria.aesthetics!.toLowerCase());
        });
      }

      // Filter by strength
      if (criteria.strength) {
        filtered = filtered.filter(material => {
          const strength = material.properties.strength?.toLowerCase();
          return strength?.includes(criteria.strength!.toLowerCase());
        });
      }

      // Filter by durability
      if (criteria.durability) {
        filtered = filtered.filter(material => {
          const durability = material.properties.durability?.toLowerCase();
          const longevity = material.longevity.toLowerCase();
          const searchTerm = criteria.durability!.toLowerCase();
          
          return durability?.includes(searchTerm) || longevity.includes(searchTerm);
        });
      }

      // Sort by relevance (materials with more matching criteria first)
      return filtered.sort((a, b) => {
        const aScore = this.calculateRelevanceScore(a, criteria);
        const bScore = this.calculateRelevanceScore(b, criteria);
        return bScore - aScore;
      });

    } catch (error) {
      console.error('Failed to get material recommendations:', error);
      return [];
    }
  }

  /**
   * Get materials suitable for specific clinical situation
   */
  async getMaterialsForSituation(situation: {
    location: 'anterior' | 'posterior' | 'any';
    stressLevel: 'high' | 'moderate' | 'low';
    aestheticRequirement: 'critical' | 'important' | 'minimal';
    patientAge: 'pediatric' | 'adult' | 'geriatric';
  }): Promise<Material[]> {
    try {
      await this.loadMaterials();

      return this.materials.filter(material => {
        // Location-based filtering
        if (situation.location === 'anterior') {
          // Anterior teeth need good aesthetics
          const aesthetics = material.properties.aesthetics?.toLowerCase();
          if (!aesthetics?.includes('excellent') && !aesthetics?.includes('good')) {
            return false;
          }
        }

        if (situation.location === 'posterior') {
          // Posterior teeth need good strength
          const strength = material.properties.strength?.toLowerCase();
          if (strength?.includes('low')) {
            return false;
          }
        }

        // Stress level filtering
        if (situation.stressLevel === 'high') {
          const strength = material.properties.strength?.toLowerCase();
          if (!strength?.includes('high') && !strength?.includes('very high')) {
            return false;
          }
        }

        // Aesthetic requirement filtering
        if (situation.aestheticRequirement === 'critical') {
          const aesthetics = material.properties.aesthetics?.toLowerCase();
          if (!aesthetics?.includes('excellent')) {
            return false;
          }
        }

        return true;
      });

    } catch (error) {
      console.error('Failed to get materials for situation:', error);
      return [];
    }
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<string[]> {
    try {
      await this.loadMaterials();

      const categories = new Set(this.materials.map(material => material.category));
      return Array.from(categories).sort();
    } catch (error) {
      console.error('Failed to get categories:', error);
      return materialsData.categories || [];
    }
  }

  /**
   * Get all available properties for filtering
   */
  async getAvailableProperties(): Promise<string[]> {
    try {
      await this.loadMaterials();

      const properties = new Set<string>();
      this.materials.forEach(material => {
        Object.keys(material.properties).forEach(prop => properties.add(prop));
      });

      return Array.from(properties).sort();
    } catch (error) {
      console.error('Failed to get available properties:', error);
      return materialsData.properties || [];
    }
  }

  /**
   * Get materials with specific contraindications
   */
  async getMaterialsWithContraindication(contraindication: string): Promise<Material[]> {
    try {
      await this.loadMaterials();

      const searchTerm = contraindication.toLowerCase();

      return this.materials.filter(material =>
        material.contraindications.some(contra =>
          contra.toLowerCase().includes(searchTerm)
        )
      );
    } catch (error) {
      console.error('Failed to get materials with contraindication:', error);
      return [];
    }
  }

  /**
   * Get material statistics
   */
  async getStats(): Promise<{
    totalMaterials: number;
    categoriesCount: number;
    propertiesCount: number;
    lastLoaded: Date | null;
  }> {
    await this.loadMaterials();

    const categories = await this.getCategories();
    const properties = await this.getAvailableProperties();

    return {
      totalMaterials: this.materials.length,
      categoriesCount: categories.length,
      propertiesCount: properties.length,
      lastLoaded: this.isLoaded ? new Date() : null,
    };
  }

  /**
   * Format property name for display
   */
  private formatPropertyName(property: string): string {
    return property
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get property value from material
   */
  private getPropertyValue(material: Material, property: string): string {
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
   * Calculate relevance score for recommendations
   */
  private calculateRelevanceScore(material: Material, criteria: any): number {
    let score = 0;

    // Category match
    if (criteria.category && material.category.toLowerCase() === criteria.category.toLowerCase()) {
      score += 10;
    }

    // Aesthetics match
    if (criteria.aesthetics) {
      const aesthetics = material.properties.aesthetics?.toLowerCase();
      if (aesthetics?.includes(criteria.aesthetics.toLowerCase())) {
        score += 5;
      }
    }

    // Strength match
    if (criteria.strength) {
      const strength = material.properties.strength?.toLowerCase();
      if (strength?.includes(criteria.strength.toLowerCase())) {
        score += 5;
      }
    }

    // Indication match
    if (criteria.indication) {
      const hasMatchingIndication = material.indications.some(ind =>
        ind.toLowerCase().includes(criteria.indication.toLowerCase())
      );
      if (hasMatchingIndication) {
        score += 8;
      }
    }

    return score;
  }

  /**
   * Load materials from cache
   */
  private loadFromCache(): Material[] | null {
    try {
      const cached = storageService.getFromStorage<{
        data: Material[];
        timestamp: string;
      }>(this.CACHE_KEY);

      if (!cached) {
        return null;
      }

      // Check if cache is still valid (1 hour TTL)
      const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
      if (cacheAge > CACHE_TTL.LONG) {
        storageService.removeFromStorage(this.CACHE_KEY);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.error('Failed to load materials from cache:', error);
      return null;
    }
  }

  /**
   * Save materials to cache
   */
  private saveToCache(materials: Material[]): void {
    try {
      storageService.saveToStorage(this.CACHE_KEY, {
        data: materials,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to save materials to cache:', error);
    }
  }

  /**
   * Clear materials cache
   */
  clearCache(): void {
    storageService.removeFromStorage(this.CACHE_KEY);
    this.isLoaded = false;
    this.materials = [];
  }
}

// Export singleton instance
export const materialDataService = new MaterialDataService();
export default materialDataService;