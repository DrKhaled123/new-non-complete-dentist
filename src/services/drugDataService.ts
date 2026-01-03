import { Drug, DrugInteraction, CACHE_TTL } from '../types';
import storageService from './storageService';
import drugsData from '../data/drugs_extended.json';

/**
 * DrugDataService - Manages drug database operations
 * 
 * Features:
 * - Load and cache drug database
 * - Search drugs by name, class, or indication
 * - Check drug interactions
 * - Get drug details by ID
 * - Performance optimized with caching
 */
class DrugDataService {
  private drugs: Drug[] = [];
  private isLoaded = false;
  private readonly CACHE_KEY = 'dental_cache_drugs';

  /**
   * Load drug database from JSON file
   */
  async loadDrugDatabase(): Promise<Drug[]> {
    try {
      if (this.isLoaded && this.drugs.length > 0) {
        return this.drugs;
      }

      // Try to load from cache first
      const cachedDrugs = this.loadFromCache();
      if (cachedDrugs) {
        this.drugs = cachedDrugs;
        this.isLoaded = true;
        return this.drugs;
      }

      // Load from JSON data - combine all drug categories
      const allDrugs = [
        ...drugsData.antibiotics,
        ...(drugsData.analgesics || []),
        ...(drugsData.local_anesthetics || [])
      ];

      this.drugs = allDrugs.map(drug => ({
        ...drug,
        // Ensure all drugs have an ID
        id: drug.id || drug.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        // Type assertion for indications
        indications: drug.indications.map(indication => ({
          ...indication,
          type: indication.type as "Prophylaxis" | "Treatment"
        }))
      })) as Drug[];

      this.isLoaded = true;

      // Cache the loaded data
      this.saveToCache(this.drugs);

      console.log(`Loaded ${this.drugs.length} drugs from database`);
      return this.drugs;
    } catch (error) {
      console.error('Failed to load drug database:', error);
      throw new Error('Failed to load drug database');
    }
  }

  /**
   * Search drugs by query (name, class, or indication)
   */
  async searchDrug(query: string): Promise<Drug[]> {
    try {
      await this.loadDrugDatabase();

      if (!query || query.trim().length === 0) {
        return this.drugs;
      }

      const searchTerm = query.toLowerCase().trim();
      
      return this.drugs.filter(drug => {
        // Search in drug name
        if (drug.name.toLowerCase().includes(searchTerm)) {
          return true;
        }

        // Search in drug class
        if (drug.class.toLowerCase().includes(searchTerm)) {
          return true;
        }

        // Search in indications
        const hasMatchingIndication = drug.indications.some(indication =>
          indication.description.toLowerCase().includes(searchTerm) ||
          indication.type.toLowerCase().includes(searchTerm)
        );

        if (hasMatchingIndication) {
          return true;
        }

        return false;
      });
    } catch (error) {
      console.error('Drug search failed:', error);
      throw new Error('Failed to search drugs');
    }
  }

  /**
   * Get drug by ID
   */
  async getDrugById(id: string): Promise<Drug | null> {
    try {
      await this.loadDrugDatabase();

      const drug = this.drugs.find(d => d.id === id || d.name.toLowerCase() === id.toLowerCase());
      return drug || null;
    } catch (error) {
      console.error('Failed to get drug by ID:', error);
      return null;
    }
  }

  /**
   * Get drug by name (case-insensitive)
   */
  async getDrugByName(name: string): Promise<Drug | null> {
    try {
      await this.loadDrugDatabase();

      const drug = this.drugs.find(d => 
        d.name.toLowerCase() === name.toLowerCase()
      );
      return drug || null;
    } catch (error) {
      console.error('Failed to get drug by name:', error);
      return null;
    }
  }

  /**
   * Check interaction between two drugs
   */
  async checkInteraction(drug1Name: string, drug2Name: string): Promise<DrugInteraction | null> {
    try {
      const drug1 = await this.getDrugByName(drug1Name);
      if (!drug1) {
        return null;
      }

      // Check if drug1 has any interactions with drug2
      const interaction = drug1.interactions.find(interaction =>
        interaction.drug.toLowerCase() === drug2Name.toLowerCase()
      );

      if (interaction) {
        return interaction;
      }

      // Check reverse interaction (drug2 with drug1)
      const drug2 = await this.getDrugByName(drug2Name);
      if (!drug2) {
        return null;
      }

      const reverseInteraction = drug2.interactions.find(interaction =>
        interaction.drug.toLowerCase() === drug1Name.toLowerCase()
      );

      return reverseInteraction || null;
    } catch (error) {
      console.error('Failed to check drug interaction:', error);
      return null;
    }
  }

  /**
   * Get all drugs in a specific class
   */
  async getDrugsByClass(drugClass: string): Promise<Drug[]> {
    try {
      await this.loadDrugDatabase();

      return this.drugs.filter(drug =>
        drug.class.toLowerCase() === drugClass.toLowerCase()
      );
    } catch (error) {
      console.error('Failed to get drugs by class:', error);
      return [];
    }
  }

  /**
   * Get drugs suitable for specific indication
   */
  async getDrugsForIndication(indication: string): Promise<Drug[]> {
    try {
      await this.loadDrugDatabase();

      const searchTerm = indication.toLowerCase();

      return this.drugs.filter(drug =>
        drug.indications.some(ind =>
          ind.description.toLowerCase().includes(searchTerm) ||
          ind.type.toLowerCase().includes(searchTerm)
        )
      );
    } catch (error) {
      console.error('Failed to get drugs for indication:', error);
      return [];
    }
  }

  /**
   * Get all available drug classes
   */
  async getDrugClasses(): Promise<string[]> {
    try {
      await this.loadDrugDatabase();

      const classes = new Set(this.drugs.map(drug => drug.class));
      return Array.from(classes).sort();
    } catch (error) {
      console.error('Failed to get drug classes:', error);
      return [];
    }
  }

  /**
   * Check if drug has contraindications for given conditions
   */
  async checkContraindications(drugName: string, conditions: string[]): Promise<string[]> {
    try {
      const drug = await this.getDrugByName(drugName);
      if (!drug) {
        return [];
      }

      const contraindications: string[] = [];
      const lowerConditions = conditions.map(c => c.toLowerCase());

      drug.contraindications.forEach(contraindication => {
        const lowerContraindication = contraindication.toLowerCase();
        
        // Check if any patient condition matches contraindication
        const hasContraindication = lowerConditions.some(condition =>
          lowerContraindication.includes(condition) || condition.includes(lowerContraindication)
        );

        if (hasContraindication) {
          contraindications.push(contraindication);
        }
      });

      return contraindications;
    } catch (error) {
      console.error('Failed to check contraindications:', error);
      return [];
    }
  }

  /**
   * Get clinical pearls and guidelines
   */
  getClinicalPearls(): any {
    return drugsData.clinical_pearls || {};
  }

  /**
   * Get empiric therapy recommendations
   */
  getEmpiricTherapy(): any {
    const pearls = this.getClinicalPearls();
    return pearls.empiric_therapy_recommendations || {};
  }

  /**
   * Calculate creatinine clearance using Cockcroft-Gault formula
   */
  calculateCreatinineClearance(age: number, weight: number, creatinine: number, isFemale: boolean = false): number {
    try {
      // Cockcroft-Gault formula: CrCl = [(140 - age) × weight] / [72 × SCr] (× 0.85 for females)
      let crCl = ((140 - age) * weight) / (72 * creatinine);
      
      if (isFemale) {
        crCl *= 0.85;
      }

      return Math.round(crCl * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      console.error('Failed to calculate creatinine clearance:', error);
      return 0;
    }
  }

  /**
   * Get renal dosing adjustment for drug
   */
  async getRenalAdjustment(drugName: string, creatinineClearance: number): Promise<any> {
    try {
      const drug = await this.getDrugByName(drugName);
      if (!drug || !drug.renal_adjustment) {
        return null;
      }

      // Find appropriate adjustment based on CrCl
      for (const adjustment of drug.renal_adjustment) {
        const condition = adjustment.condition.toLowerCase();
        
        if (condition.includes('>') && condition.includes('ml/min')) {
          const threshold = parseFloat(condition.match(/(\d+)/)?.[1] || '0');
          if (creatinineClearance > threshold) {
            return adjustment;
          }
        } else if (condition.includes('<') && condition.includes('ml/min')) {
          const threshold = parseFloat(condition.match(/(\d+)/)?.[1] || '0');
          if (creatinineClearance < threshold) {
            return adjustment;
          }
        } else if (condition.includes('–') && condition.includes('ml/min')) {
          const range = condition.match(/(\d+)–(\d+)/);
          if (range) {
            const min = parseFloat(range[1]);
            const max = parseFloat(range[2]);
            if (creatinineClearance >= min && creatinineClearance <= max) {
              return adjustment;
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get renal adjustment:', error);
      return null;
    }
  }

  /**
   * Load drugs from cache
   */
  private loadFromCache(): Drug[] | null {
    try {
      const cached = storageService.getFromStorage<{
        data: Drug[];
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
      console.error('Failed to load drugs from cache:', error);
      return null;
    }
  }

  /**
   * Save drugs to cache
   */
  private saveToCache(drugs: Drug[]): void {
    try {
      storageService.saveToStorage(this.CACHE_KEY, {
        data: drugs,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to save drugs to cache:', error);
    }
  }

  /**
   * Clear drug cache
   */
  clearCache(): void {
    storageService.removeFromStorage(this.CACHE_KEY);
    this.isLoaded = false;
    this.drugs = [];
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalDrugs: number;
    drugClasses: number;
    lastLoaded: Date | null;
  }> {
    await this.loadDrugDatabase();

    return {
      totalDrugs: this.drugs.length,
      drugClasses: (await this.getDrugClasses()).length,
      lastLoaded: this.isLoaded ? new Date() : null,
    };
  }
}

// Export singleton instance
export const drugDataService = new DrugDataService();
export default drugDataService;