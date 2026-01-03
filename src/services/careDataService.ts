import { Procedure } from '../types';
import careInstructionsData from '../data/care-instructions.json';
import procedureDataService from './procedureDataService';
import storageService from './storageService';

export interface CareInstruction {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface PostOperativeInstructions {
  immediate: CareInstruction[];
  first24Hours: CareInstruction[];
  firstWeek: CareInstruction[];
  ongoing: CareInstruction[];
}

export interface CareInstructions {
  preOperative: CareInstruction[];
  postOperative: PostOperativeInstructions;
  nutrition: {
    foodsToEat: string[];
    foodsToAvoid: string[];
    hydrationGuidelines: string[];
    supplements?: string[];
  };
  oralHygiene: CareInstruction[];
  painManagement: CareInstruction[];
  warningSigns: CareInstruction[];
}

export interface ProcedureCareData {
  [procedureId: string]: CareInstructions;
}

export interface FilteredCareInstructions {
  procedure: string;
  careInstructions: CareInstructions;
  completedInstructions: string[];
  emergencyContacts: {
    situation: string;
    action: string;
    contact: string;
  }[];
  medicationReminders: {
    medication: string;
    dosage: string;
    timing: string;
  }[];
  followUpAppointments: {
    type: string;
    timing: string;
    purpose: string;
  }[];
}

/**
 * CareDataService - Manages patient care instructions and data integration
 * 
 * Features:
 * - Load care instructions from care-instructions.json
 * - Filter instructions by procedure type
 * - Track instruction completion
 * - Generate emergency contact information
 * - Provide medication reminders
 * - Schedule follow-up appointments
 */
class CareDataService {
  private careInstructions: ProcedureCareData = {};
  private isLoaded = false;
  private readonly CACHE_KEY = 'dental_cache_care_instructions';

  /**
   * Get all care instructions
   */
  async getAllCareInstructions(): Promise<ProcedureCareData> {
    try {
      return await this.loadCareInstructions();
    } catch (error) {
      console.error('Failed to get all care instructions:', error);
      throw new Error('Failed to load care instructions');
    }
  }

  /**
   * Load care instructions from JSON file
   */
  async loadCareInstructions(): Promise<ProcedureCareData> {
    try {
      if (this.isLoaded && Object.keys(this.careInstructions).length > 0) {
        return this.careInstructions;
      }

      // Try to load from cache first
      const cachedInstructions = this.loadFromCache();
      if (cachedInstructions) {
        this.careInstructions = cachedInstructions;
        this.isLoaded = true;
        return this.careInstructions;
      }

      // Load from JSON data
      this.careInstructions = careInstructionsData as ProcedureCareData;
      this.isLoaded = true;

      // Cache the loaded data
      this.saveToCache(this.careInstructions);

      console.log(`Loaded care instructions for ${Object.keys(this.careInstructions).length} procedures`);
      return this.careInstructions;
    } catch (error) {
      console.error('Failed to load care instructions:', error);
      throw new Error('Failed to load care instructions database');
    }
  }

  /**
   * Get care instructions for a specific procedure
   */
  async getCareInstructionsByProcedure(procedureId: string): Promise<CareInstructions | null> {
    try {
      await this.loadCareInstructions();

      // Try exact match first
      let instructions = this.careInstructions[procedureId];

      // If no exact match, try to find by procedure name
      if (!instructions) {
        const matchingKey = Object.keys(this.careInstructions).find(key => {
          const procedure = key.toLowerCase().replace(/-/g, ' ');
          const searchTerm = procedureId.toLowerCase();
          return procedure.includes(searchTerm) || searchTerm.includes(procedure);
        });

        if (matchingKey) {
          instructions = this.careInstructions[matchingKey];
        }
      }

      return instructions || null;
    } catch (error) {
      console.error('Failed to get care instructions for procedure:', error);
      return null;
    }
  }

  /**
   * Get filtered care instructions with additional data
   */
  async getFilteredCareInstructions(procedureId: string, patientAge?: number): Promise<FilteredCareInstructions | null> {
    try {
      const careInstructions = await this.getCareInstructionsByProcedure(procedureId);
      if (!careInstructions) {
        return null;
      }

      const procedure = await procedureDataService.getProcedureById(procedureId);
      
      return {
        procedure: procedure?.name || procedureId,
        careInstructions,
        completedInstructions: this.getCompletedInstructions(procedureId),
        emergencyContacts: this.generateEmergencyContacts(careInstructions),
        medicationReminders: this.generateMedicationReminders(careInstructions),
        followUpAppointments: this.generateFollowUpAppointments(careInstructions, procedure)
      };
    } catch (error) {
      console.error('Failed to get filtered care instructions:', error);
      return null;
    }
  }

  /**
   * Get care instructions by category
   */
  async getCareInstructionsByCategory(category: string): Promise<Array<{ procedure: string; instructions: CareInstructions }>> {
    try {
      await this.loadCareInstructions();

      const procedures = await procedureDataService.getProceduresByCategory(category);
      const result: Array<{ procedure: string; instructions: CareInstructions }> = [];

      for (const procedure of procedures) {
        const instructions = this.careInstructions[procedure.id];
        if (instructions) {
          result.push({
            procedure: procedure.name,
            instructions
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to get care instructions by category:', error);
      return [];
    }
  }

  /**
   * Mark instruction as completed
   */
  markInstructionCompleted(procedureId: string, instructionId: string): void {
    try {
      const completed = this.getCompletedInstructions(procedureId);
      if (!completed.includes(instructionId)) {
        completed.push(instructionId);
        this.saveCompletedInstructions(procedureId, completed);
      }
    } catch (error) {
      console.error('Failed to mark instruction as completed:', error);
    }
  }

  /**
   * Mark instruction as incomplete
   */
  markInstructionIncomplete(procedureId: string, instructionId: string): void {
    try {
      const completed = this.getCompletedInstructions(procedureId);
      const filtered = completed.filter(id => id !== instructionId);
      this.saveCompletedInstructions(procedureId, filtered);
    } catch (error) {
      console.error('Failed to mark instruction as incomplete:', error);
    }
  }

  /**
   * Get completed instructions for a procedure
   */
  getCompletedInstructions(procedureId: string): string[] {
    try {
      const key = `${this.CACHE_KEY}_completed_${procedureId}`;
      const completed = storageService.getFromStorage<string[]>(key);
      return completed || [];
    } catch (error) {
      console.error('Failed to get completed instructions:', error);
      return [];
    }
  }

  /**
   * Save completed instructions for a procedure
   */
  private saveCompletedInstructions(procedureId: string, completed: string[]): void {
    try {
      const key = `${this.CACHE_KEY}_completed_${procedureId}`;
      storageService.saveToStorage(key, completed);
    } catch (error) {
      console.error('Failed to save completed instructions:', error);
    }
  }

  /**
   * Generate emergency contacts based on care instructions
   */
  private generateEmergencyContacts(careInstructions: CareInstructions): Array<{
    situation: string;
    action: string;
    contact: string;
  }> {
    const emergencyContacts: Array<{
      situation: string;
      action: string;
      contact: string;
    }> = [];

    // Extract emergency situations from warning signs
    careInstructions.warningSigns.forEach(warning => {
      emergencyContacts.push({
        situation: warning.title,
        action: warning.description,
        contact: 'Contact your dental office immediately or visit the emergency room if severe'
      });
    });

    // Add common emergency situations
    emergencyContacts.push(
      {
        situation: 'Excessive Bleeding',
        action: 'Apply firm pressure with gauze for 20-30 minutes',
        contact: 'If bleeding continues, contact your dental office immediately'
      },
      {
        situation: 'Severe Pain Not Controlled by Medication',
        action: 'Take prescribed pain medication as directed',
        contact: 'Contact your dental office if pain persists or worsens'
      },
      {
        situation: 'Signs of Infection',
        action: 'Monitor for fever, increasing swelling, or pus',
        contact: 'Contact your dental office immediately for evaluation'
      },
      {
        situation: 'Difficulty Breathing or Swelling of Face/Lips',
        action: 'This may indicate allergic reaction',
        contact: 'Call 911 immediately, then contact your dental office'
      }
    );

    return emergencyContacts;
  }

  /**
   * Generate medication reminders
   */
  private generateMedicationReminders(careInstructions: CareInstructions): Array<{
    medication: string;
    dosage: string;
    timing: string;
  }> {
    const reminders: Array<{
      medication: string;
      dosage: string;
      timing: string;
    }> = [];

    // Extract from pain management instructions
    careInstructions.painManagement.forEach(medication => {
      if (medication.description.toLowerCase().includes('ibuprofen')) {
        reminders.push({
          medication: 'Ibuprofen',
          dosage: '400-600mg',
          timing: 'Every 6-8 hours with food'
        });
      }
      if (medication.description.toLowerCase().includes('acetaminophen')) {
        reminders.push({
          medication: 'Acetaminophen',
          dosage: '500-1000mg',
          timing: 'Every 6 hours as needed'
        });
      }
    });

    // Add standard reminders
    reminders.push({
      medication: 'Prescribed Antibiotics',
      dosage: 'As prescribed',
      timing: 'Complete full course even if symptoms improve'
    });

    return reminders;
  }

  /**
   * Generate follow-up appointments
   */
  private generateFollowUpAppointments(careInstructions: CareInstructions, procedure?: Procedure | null): Array<{
    type: string;
    timing: string;
    purpose: string;
  }> {
    const appointments: Array<{
      type: string;
      timing: string;
      purpose: string;
    }> = [];

    // Add standard follow-up appointments based on procedure type
    if (procedure?.category === 'Oral Surgery') {
      appointments.push(
        {
          type: 'Post-operative Check',
          timing: '1 week after surgery',
          purpose: 'Monitor healing and remove sutures if needed'
        },
        {
          type: 'Healing Assessment',
          timing: '2-4 weeks after surgery',
          purpose: 'Evaluate socket healing and discuss next steps'
        }
      );
    }

    if (procedure?.category === 'Endodontic') {
      appointments.push({
        type: 'Permanent Restoration',
        timing: '2-4 weeks after root canal',
        purpose: 'Place permanent crown or restoration'
      });
    }

    if (procedure?.category === 'Periodontal') {
      appointments.push({
        type: 'Periodontal Maintenance',
        timing: '3-4 months after therapy',
        purpose: 'Monitor healing and provide supportive care'
      });
    }

    // Add routine check-up
    appointments.push({
      type: 'Routine Check-up',
      timing: '6 months after treatment',
      purpose: 'Monitor overall oral health and treatment success'
    });

    return appointments;
  }

  /**
   * Get instructions by priority level
   */
  getInstructionsByPriority(instructions: CareInstruction[], priority: 'high' | 'medium' | 'low'): CareInstruction[] {
    return instructions.filter(instruction => instruction.priority === priority);
  }

  /**
   * Get instructions by timeframe
   */
  getInstructionsByTimeframe(
    careInstructions: CareInstructions, 
    timeframe: 'preOperative' | 'immediate' | 'first24Hours' | 'firstWeek' | 'ongoing'
  ): CareInstruction[] {
    if (timeframe === 'preOperative') {
      return careInstructions.preOperative;
    }

    const postOpKey = timeframe as keyof PostOperativeInstructions;
    return careInstructions.postOperative[postOpKey] || [];
  }

  /**
   * Search care instructions
   */
  async searchCareInstructions(query: string): Promise<Array<{
    procedure: string;
    matchingInstructions: CareInstruction[];
  }>> {
    try {
      await this.loadCareInstructions();

      if (!query || query.trim().length === 0) {
        return [];
      }

      const searchTerm = query.toLowerCase().trim();
      const results: Array<{
        procedure: string;
        matchingInstructions: CareInstruction[];
      }> = [];

      for (const [procedureId, instructions] of Object.entries(this.careInstructions)) {
        const matchingInstructions: CareInstruction[] = [];

        // Search in pre-operative instructions
        matchingInstructions.push(...instructions.preOperative.filter(inst =>
          inst.title.toLowerCase().includes(searchTerm) ||
          inst.description.toLowerCase().includes(searchTerm)
        ));

        // Search in post-operative instructions
        Object.values(instructions.postOperative).forEach(timeframeInstructions => {
          matchingInstructions.push(...timeframeInstructions.filter((inst: CareInstruction) =>
            inst.title.toLowerCase().includes(searchTerm) ||
            inst.description.toLowerCase().includes(searchTerm)
          ));
        });

        // Search in oral hygiene instructions
        matchingInstructions.push(...instructions.oralHygiene.filter(inst =>
          inst.title.toLowerCase().includes(searchTerm) ||
          inst.description.toLowerCase().includes(searchTerm)
        ));

        // Search in pain management
        matchingInstructions.push(...instructions.painManagement.filter(inst =>
          inst.title.toLowerCase().includes(searchTerm) ||
          inst.description.toLowerCase().includes(searchTerm)
        ));

        // Search in warning signs
        matchingInstructions.push(...instructions.warningSigns.filter(inst =>
          inst.title.toLowerCase().includes(searchTerm) ||
          inst.description.toLowerCase().includes(searchTerm)
        ));

        if (matchingInstructions.length > 0) {
          const procedure = await procedureDataService.getProcedureById(procedureId);
          const uniqueInstructions: CareInstruction[] = [];
          const seenIds = new Set<string>();
          
          matchingInstructions.forEach(item => {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              uniqueInstructions.push(item);
            }
          });
          
          results.push({
            procedure: procedure?.name || procedureId,
            matchingInstructions: uniqueInstructions
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to search care instructions:', error);
      return [];
    }
  }

  /**
   * Get care statistics
   */
  async getStats(): Promise<{
    totalProceduresWithCare: number;
    categoriesCovered: string[];
    averageInstructionsCount: number;
    lastLoaded: Date | null;
  }> {
    await this.loadCareInstructions();

    const proceduresWithCare = Object.keys(this.careInstructions);
    const procedures = await procedureDataService.getAllProcedures();
    
    const categoriesCovered: string[] = [];
    procedures
      .filter(proc => proceduresWithCare.includes(proc.id))
      .forEach(proc => {
        if (!categoriesCovered.includes(proc.category)) {
          categoriesCovered.push(proc.category);
        }
      });

    const averageInstructionsCount = proceduresWithCare.reduce((total, procedureId) => {
      const instructions = this.careInstructions[procedureId];
      const count = instructions.preOperative.length +
        Object.values(instructions.postOperative).flat().length +
        instructions.oralHygiene.length +
        instructions.painManagement.length +
        instructions.warningSigns.length;
      return total + count;
    }, 0) / proceduresWithCare.length;

    return {
      totalProceduresWithCare: proceduresWithCare.length,
      categoriesCovered,
      averageInstructionsCount: Math.round(averageInstructionsCount),
      lastLoaded: this.isLoaded ? new Date() : null,
    };
  }

  /**
   * Load care instructions from cache
   */
  private loadFromCache(): ProcedureCareData | null {
    try {
      const cached = storageService.getFromStorage<{
        data: ProcedureCareData;
        timestamp: string;
      }>(this.CACHE_KEY);

      if (!cached) {
        return null;
      }

      // Check if cache is still valid (24 hours TTL)
      const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
      const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

      if (cacheAge > CACHE_TTL) {
        storageService.removeFromStorage(this.CACHE_KEY);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.error('Failed to load care instructions from cache:', error);
      return null;
    }
  }

  /**
   * Save care instructions to cache
   */
  private saveToCache(careInstructions: ProcedureCareData): void {
    try {
      storageService.saveToStorage(this.CACHE_KEY, {
        data: careInstructions,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to save care instructions to cache:', error);
    }
  }

  /**
   * Clear care instructions cache
   */
  clearCache(): void {
    storageService.removeFromStorage(this.CACHE_KEY);
    this.isLoaded = false;
    this.careInstructions = {};
  }
}

// Export singleton instance
export const careDataService = new CareDataService();
export default careDataService;