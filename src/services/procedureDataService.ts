import { Procedure, CACHE_TTL } from '../types';
import storageService from './storageService';
import proceduresData from '../data/procedures_extended.json';

/**
 * ProcedureDataService - Manages dental procedure database operations
 * 
 * Features:
 * - Load and cache procedure database
 * - Search procedures by name, category, or condition
 * - Get procedure details with management plans
 * - Category-based filtering
 * - Performance optimized with caching
 */
class ProcedureDataService {
  private procedures: Procedure[] = [];
  private isLoaded = false;
  private readonly CACHE_KEY = 'dental_cache_procedures';

  /**
   * Get all procedures
   */
  async getAllProcedures(): Promise<Procedure[]> {
    try {
      return await this.loadProcedures();
    } catch (error) {
      console.error('Failed to get all procedures:', error);
      throw new Error('Failed to load procedures database');
    }
  }

  /**
   * Load procedures from JSON file
   */
  async loadProcedures(): Promise<Procedure[]> {
    try {
      if (this.isLoaded && this.procedures.length > 0) {
        return this.procedures;
      }

      // Try to load from cache first
      const cachedProcedures = this.loadFromCache();
      if (cachedProcedures) {
        this.procedures = cachedProcedures;
        this.isLoaded = true;
        return this.procedures;
      }

      // Load from JSON data
      this.procedures = proceduresData.procedures.map(procedure => ({
        ...procedure,
        // Ensure all procedures have proper structure
        management_plan: procedure.management_plan || [],
        differential_diagnosis: procedure.differential_diagnosis || [],
        investigations: procedure.investigations || [],
        references: procedure.references || [],
      }));

      this.isLoaded = true;

      // Cache the loaded data
      this.saveToCache(this.procedures);

      console.log(`Loaded ${this.procedures.length} procedures from database`);
      return this.procedures;
    } catch (error) {
      console.error('Failed to load procedures database:', error);
      throw new Error('Failed to load procedures database');
    }
  }

  /**
   * Search procedures by query (name, category, diagnosis, or management)
   */
  async searchProcedure(query: string): Promise<Procedure[]> {
    try {
      await this.loadProcedures();

      if (!query || query.trim().length === 0) {
        return this.procedures;
      }

      const searchTerm = query.toLowerCase().trim();
      
      return this.procedures.filter(procedure => {
        // Search in procedure name
        if (procedure.name.toLowerCase().includes(searchTerm)) {
          return true;
        }

        // Search in category
        if (procedure.category.toLowerCase().includes(searchTerm)) {
          return true;
        }

        // Search in diagnosis
        if (procedure.diagnosis.toLowerCase().includes(searchTerm)) {
          return true;
        }

        // Search in differential diagnosis
        const hasMatchingDifferential = procedure.differential_diagnosis.some(diff =>
          diff.toLowerCase().includes(searchTerm)
        );
        if (hasMatchingDifferential) {
          return true;
        }

        // Search in investigations
        const hasMatchingInvestigation = procedure.investigations.some(inv =>
          inv.toLowerCase().includes(searchTerm)
        );
        if (hasMatchingInvestigation) {
          return true;
        }

        // Search in management plan
        const hasMatchingManagement = procedure.management_plan.some(step =>
          step.title.toLowerCase().includes(searchTerm) ||
          step.description.toLowerCase().includes(searchTerm)
        );
        if (hasMatchingManagement) {
          return true;
        }

        return false;
      });
    } catch (error) {
      console.error('Procedure search failed:', error);
      throw new Error('Failed to search procedures');
    }
  }

  /**
   * Get procedure by ID
   */
  async getProcedureById(id: string): Promise<Procedure | null> {
    try {
      await this.loadProcedures();

      const procedure = this.procedures.find(p => 
        p.id === id || p.name.toLowerCase() === id.toLowerCase()
      );
      return procedure || null;
    } catch (error) {
      console.error('Failed to get procedure by ID:', error);
      return null;
    }
  }

  /**
   * Get procedures by category
   */
  async getProceduresByCategory(category: string): Promise<Procedure[]> {
    try {
      await this.loadProcedures();

      return this.procedures.filter(procedure =>
        procedure.category.toLowerCase() === category.toLowerCase()
      );
    } catch (error) {
      console.error('Failed to get procedures by category:', error);
      return [];
    }
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<string[]> {
    try {
      await this.loadProcedures();

      const categories = new Set(this.procedures.map(procedure => procedure.category));
      return Array.from(categories).sort();
    } catch (error) {
      console.error('Failed to get categories:', error);
      return proceduresData.categories || [];
    }
  }

  /**
   * Search procedures by condition/symptom
   */
  async searchByCondition(condition: string): Promise<Procedure[]> {
    try {
      await this.loadProcedures();

      const searchTerm = condition.toLowerCase().trim();

      return this.procedures.filter(procedure => {
        // Check diagnosis
        if (procedure.diagnosis.toLowerCase().includes(searchTerm)) {
          return true;
        }

        // Check differential diagnosis
        const hasMatchingDifferential = procedure.differential_diagnosis.some(diff =>
          diff.toLowerCase().includes(searchTerm)
        );

        return hasMatchingDifferential;
      });
    } catch (error) {
      console.error('Failed to search by condition:', error);
      return [];
    }
  }

  /**
   * Get procedures requiring specific investigations
   */
  async getProceduresWithInvestigation(investigation: string): Promise<Procedure[]> {
    try {
      await this.loadProcedures();

      const searchTerm = investigation.toLowerCase().trim();

      return this.procedures.filter(procedure =>
        procedure.investigations.some(inv =>
          inv.toLowerCase().includes(searchTerm)
        )
      );
    } catch (error) {
      console.error('Failed to get procedures with investigation:', error);
      return [];
    }
  }

  /**
   * Get emergency procedures
   */
  async getEmergencyProcedures(): Promise<Procedure[]> {
    try {
      return await this.getProceduresByCategory('Emergency');
    } catch (error) {
      console.error('Failed to get emergency procedures:', error);
      return [];
    }
  }

  /**
   * Get procedures with multiple management approaches
   */
  async getProceduresWithMultipleApproaches(): Promise<Procedure[]> {
    try {
      await this.loadProcedures();

      return this.procedures.filter(procedure => {
        // Check if management plan has multiple distinct approaches
        const approaches = procedure.management_plan.filter(step =>
          step.description.toLowerCase().includes('approach') ||
          step.description.toLowerCase().includes('option') ||
          step.description.toLowerCase().includes('alternative')
        );

        return approaches.length > 0 || procedure.management_plan.length > 3;
      });
    } catch (error) {
      console.error('Failed to get procedures with multiple approaches:', error);
      return [];
    }
  }

  /**
   * Get procedure recommendations based on patient age
   */
  async getProceduresByAge(age: number): Promise<{
    pediatric: Procedure[];
    adult: Procedure[];
    geriatric: Procedure[];
  }> {
    try {
      await this.loadProcedures();

      const pediatric: Procedure[] = [];
      const adult: Procedure[] = [];
      const geriatric: Procedure[] = [];

      this.procedures.forEach(procedure => {
        const name = procedure.name.toLowerCase();
        const diagnosis = procedure.diagnosis.toLowerCase();
        const management = procedure.management_plan.map(step => 
          step.description.toLowerCase()
        ).join(' ');

        // Pediatric indicators
        if (name.includes('pediatric') || 
            diagnosis.includes('child') || 
            management.includes('pediatric') ||
            management.includes('child')) {
          pediatric.push(procedure);
        }

        // Geriatric indicators
        if (name.includes('geriatric') || 
            diagnosis.includes('elderly') || 
            management.includes('elderly') ||
            management.includes('geriatric')) {
          geriatric.push(procedure);
        }

        // Most procedures are suitable for adults
        adult.push(procedure);
      });

      return { pediatric, adult, geriatric };
    } catch (error) {
      console.error('Failed to get procedures by age:', error);
      return { pediatric: [], adult: [], geriatric: [] };
    }
  }

  /**
   * Get related procedures based on category and symptoms
   */
  async getRelatedProcedures(procedureId: string): Promise<Procedure[]> {
    try {
      const mainProcedure = await this.getProcedureById(procedureId);
      if (!mainProcedure) {
        return [];
      }

      await this.loadProcedures();

      // Find procedures in same category or with similar diagnosis
      const related = this.procedures.filter(procedure => {
        if (procedure.id === procedureId) {
          return false; // Exclude the main procedure
        }

        // Same category
        if (procedure.category === mainProcedure.category) {
          return true;
        }

        // Similar diagnosis keywords
        const mainKeywords = this.extractKeywords(mainProcedure.diagnosis);
        const procKeywords = this.extractKeywords(procedure.diagnosis);
        
        const commonKeywords = mainKeywords.filter(keyword =>
          procKeywords.includes(keyword)
        );

        return commonKeywords.length > 0;
      });

      // Sort by relevance (same category first, then by keyword matches)
      return related.sort((a, b) => {
        const aScore = this.calculateRelevanceScore(a, mainProcedure);
        const bScore = this.calculateRelevanceScore(b, mainProcedure);
        return bScore - aScore;
      }).slice(0, 5); // Return top 5 related procedures

    } catch (error) {
      console.error('Failed to get related procedures:', error);
      return [];
    }
  }

  /**
   * Get procedure statistics
   */
  async getStats(): Promise<{
    totalProcedures: number;
    categoriesCount: number;
    emergencyProcedures: number;
    lastLoaded: Date | null;
  }> {
    await this.loadProcedures();

    const emergencyProcedures = await this.getEmergencyProcedures();
    const categories = await this.getCategories();

    return {
      totalProcedures: this.procedures.length,
      categoriesCount: categories.length,
      emergencyProcedures: emergencyProcedures.length,
      lastLoaded: this.isLoaded ? new Date() : null,
    };
  }

  /**
   * Extract keywords from diagnosis text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 10); // Limit to 10 keywords
  }

  /**
   * Calculate relevance score between procedures
   */
  private calculateRelevanceScore(procedure: Procedure, mainProcedure: Procedure): number {
    let score = 0;

    // Same category gets high score
    if (procedure.category === mainProcedure.category) {
      score += 10;
    }

    // Common keywords in diagnosis
    const mainKeywords = this.extractKeywords(mainProcedure.diagnosis);
    const procKeywords = this.extractKeywords(procedure.diagnosis);
    const commonKeywords = mainKeywords.filter(keyword =>
      procKeywords.includes(keyword)
    );
    score += commonKeywords.length * 2;

    // Common differential diagnosis
    const commonDifferential = procedure.differential_diagnosis.filter(diff =>
      mainProcedure.differential_diagnosis.some(mainDiff =>
        mainDiff.toLowerCase().includes(diff.toLowerCase()) ||
        diff.toLowerCase().includes(mainDiff.toLowerCase())
      )
    );
    score += commonDifferential.length;

    return score;
  }

  /**
   * Load procedures from cache
   */
  private loadFromCache(): Procedure[] | null {
    try {
      const cached = storageService.getFromStorage<{
        data: Procedure[];
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
      console.error('Failed to load procedures from cache:', error);
      return null;
    }
  }

  /**
   * Save procedures to cache
   */
  private saveToCache(procedures: Procedure[]): void {
    try {
      storageService.saveToStorage(this.CACHE_KEY, {
        data: procedures,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to save procedures to cache:', error);
    }
  }

  /**
   * Clear procedure cache
   */
  clearCache(): void {
    storageService.removeFromStorage(this.CACHE_KEY);
    this.isLoaded = false;
    this.procedures = [];
  }
}

// Export singleton instance
export const procedureDataService = new ProcedureDataService();
export default procedureDataService;