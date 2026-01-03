import { Case, CaseVersion, Note, Treatment, Dose, STORAGE_KEYS } from '../types';
import { generateSecureToken, encryptData, decryptData } from '../utils/encryption';
import storageService from './storageService';
import authService from './authService';

/**
 * CaseService - Manages patient case data and version history
 * 
 * Features:
 * - Save and retrieve patient cases
 * - Version history tracking
 * - Follow-up notes management
 * - Data encryption for sensitive information
 * - Profile-based data isolation
 * - Search and filtering capabilities
 */
class CaseService {

  /**
   * Save a new case or update existing case
   */
  async saveCase(caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>): Promise<Case> {
    try {
      const currentProfile = authService.getCurrentProfile();
      if (!currentProfile) {
        throw new Error('No authenticated user');
      }

      // Validate case data
      this.validateCaseData(caseData);

      // Create new case
      const newCase: Case = {
        ...caseData,
        id: generateSecureToken(16),
        profileId: currentProfile.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        followUpNotes: caseData.followUpNotes || [],
      };

      // Encrypt sensitive data
      const encryptedCase = this.encryptSensitiveData(newCase);

      // Save case
      const caseKey = `${STORAGE_KEYS.CASE_PREFIX}${currentProfile.id}_${newCase.id}`;
      storageService.saveToStorage(caseKey, encryptedCase);

      // Create initial version entry
      await this.createVersionEntry(newCase.id, newCase, 'Case created');

      console.log(`Case ${newCase.id} saved successfully`);
      return newCase;

    } catch (error) {
      console.error('Failed to save case:', error);
      throw error;
    }
  }

  /**
   * Get all cases for current user
   */
  async getCases(profileId?: string): Promise<Case[]> {
    try {
      const currentProfile = authService.getCurrentProfile();
      if (!currentProfile) {
        throw new Error('No authenticated user');
      }

      const targetProfileId = profileId || currentProfile.id;

      // Ensure user can only access their own cases
      if (targetProfileId !== currentProfile.id) {
        throw new Error('Access denied: Cannot access other user\'s cases');
      }

      // Get all case keys for this profile
      const caseKeys = storageService.getKeysWithPrefix(
        `${STORAGE_KEYS.CASE_PREFIX}${targetProfileId}_`
      );

      const cases: Case[] = [];

      for (const key of caseKeys) {
        try {
          const encryptedCase = storageService.getFromStorage<Case>(key);
          if (encryptedCase) {
            const decryptedCase = this.decryptSensitiveData(encryptedCase);
            cases.push(decryptedCase);
          }
        } catch (error) {
          console.error(`Failed to load case from key ${key}:`, error);
          // Continue loading other cases
        }
      }

      // Sort by creation date (newest first)
      cases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return cases;

    } catch (error) {
      console.error('Failed to get cases:', error);
      throw error;
    }
  }

  /**
   * Get case by ID
   */
  async getCaseById(caseId: string): Promise<Case | null> {
    try {
      const currentProfile = authService.getCurrentProfile();
      if (!currentProfile) {
        throw new Error('No authenticated user');
      }

      const caseKey = `${STORAGE_KEYS.CASE_PREFIX}${currentProfile.id}_${caseId}`;
      const encryptedCase = storageService.getFromStorage<Case>(caseKey);

      if (!encryptedCase) {
        return null;
      }

      return this.decryptSensitiveData(encryptedCase);

    } catch (error) {
      console.error('Failed to get case by ID:', error);
      return null;
    }
  }

  /**
   * Update existing case
   */
  async updateCase(caseId: string, updates: Partial<Case>): Promise<Case> {
    try {
      const existingCase = await this.getCaseById(caseId);
      if (!existingCase) {
        throw new Error('Case not found');
      }

      const currentProfile = authService.getCurrentProfile();
      if (!currentProfile) {
        throw new Error('No authenticated user');
      }

      // Ensure user owns the case
      if (existingCase.profileId !== currentProfile.id) {
        throw new Error('Access denied: Cannot update other user\'s case');
      }

      // Create updated case
      const updatedCase: Case = {
        ...existingCase,
        ...updates,
        id: existingCase.id, // Preserve original ID
        profileId: existingCase.profileId, // Preserve original profile ID
        createdAt: existingCase.createdAt, // Preserve creation date
        updatedAt: new Date(),
      };

      // Validate updated data
      this.validateCaseData(updatedCase);

      // Encrypt and save
      const encryptedCase = this.encryptSensitiveData(updatedCase);
      const caseKey = `${STORAGE_KEYS.CASE_PREFIX}${currentProfile.id}_${caseId}`;
      storageService.saveToStorage(caseKey, encryptedCase);

      // Create version entry
      await this.createVersionEntry(caseId, updatedCase, 'Case updated', existingCase);

      console.log(`Case ${caseId} updated successfully`);
      return updatedCase;

    } catch (error) {
      console.error('Failed to update case:', error);
      throw error;
    }
  }

  /**
   * Add follow-up note to case
   */
  async addFollowUpNote(caseId: string, noteContent: string): Promise<Case> {
    try {
      const existingCase = await this.getCaseById(caseId);
      if (!existingCase) {
        throw new Error('Case not found');
      }

      const currentProfile = authService.getCurrentProfile();
      if (!currentProfile) {
        throw new Error('No authenticated user');
      }

      // Create new note
      const newNote: Note = {
        id: generateSecureToken(12),
        content: noteContent.trim(),
        createdAt: new Date(),
        createdBy: currentProfile.name,
      };

      // Add note to case
      const updatedCase: Case = {
        ...existingCase,
        followUpNotes: [...existingCase.followUpNotes, newNote],
        updatedAt: new Date(),
      };

      // Save updated case
      const encryptedCase = this.encryptSensitiveData(updatedCase);
      const caseKey = `${STORAGE_KEYS.CASE_PREFIX}${currentProfile.id}_${caseId}`;
      storageService.saveToStorage(caseKey, encryptedCase);

      // Create version entry
      await this.createVersionEntry(caseId, updatedCase, `Follow-up note added: ${noteContent.substring(0, 50)}...`);

      console.log(`Follow-up note added to case ${caseId}`);
      return updatedCase;

    } catch (error) {
      console.error('Failed to add follow-up note:', error);
      throw error;
    }
  }

  /**
   * Get case version history
   */
  async getCaseHistory(caseId: string): Promise<CaseVersion[]> {
    try {
      const currentProfile = authService.getCurrentProfile();
      if (!currentProfile) {
        throw new Error('No authenticated user');
      }

      // Verify user owns the case
      const caseExists = await this.getCaseById(caseId);
      if (!caseExists) {
        throw new Error('Case not found or access denied');
      }

      // Get version history
      const versionKeys = storageService.getKeysWithPrefix(
        `${STORAGE_KEYS.CASE_PREFIX}${currentProfile.id}_${caseId}_version_`
      );

      const versions: CaseVersion[] = [];

      for (const key of versionKeys) {
        try {
          const version = storageService.getFromStorage<CaseVersion>(key);
          if (version) {
            versions.push(version);
          }
        } catch (error) {
          console.error(`Failed to load version from key ${key}:`, error);
        }
      }

      // Sort by version number (newest first)
      versions.sort((a, b) => b.versionNumber - a.versionNumber);

      return versions;

    } catch (error) {
      console.error('Failed to get case history:', error);
      throw error;
    }
  }

  /**
   * Delete case
   */
  async deleteCase(caseId: string): Promise<void> {
    try {
      const currentProfile = authService.getCurrentProfile();
      if (!currentProfile) {
        throw new Error('No authenticated user');
      }

      // Verify case exists and user owns it
      const existingCase = await this.getCaseById(caseId);
      if (!existingCase) {
        throw new Error('Case not found');
      }

      if (existingCase.profileId !== currentProfile.id) {
        throw new Error('Access denied: Cannot delete other user\'s case');
      }

      // Delete case
      const caseKey = `${STORAGE_KEYS.CASE_PREFIX}${currentProfile.id}_${caseId}`;
      storageService.removeFromStorage(caseKey);

      // Delete version history
      const versionKeys = storageService.getKeysWithPrefix(
        `${STORAGE_KEYS.CASE_PREFIX}${currentProfile.id}_${caseId}_version_`
      );
      versionKeys.forEach(key => storageService.removeFromStorage(key));

      console.log(`Case ${caseId} deleted successfully`);

    } catch (error) {
      console.error('Failed to delete case:', error);
      throw error;
    }
  }

  /**
   * Search cases by patient identifier or clinical notes
   */
  async searchCases(query: string): Promise<Case[]> {
    try {
      const allCases = await this.getCases();
      
      if (!query || query.trim().length === 0) {
        return allCases;
      }

      const searchTerm = query.toLowerCase().trim();

      return allCases.filter(caseItem => {
        // Search in patient identifier
        if (caseItem.patientIdentifier.toLowerCase().includes(searchTerm)) {
          return true;
        }

        // Search in clinical notes
        if (caseItem.clinicalNotes.toLowerCase().includes(searchTerm)) {
          return true;
        }

        // Search in conditions
        const hasMatchingCondition = caseItem.conditions.some(condition =>
          condition.toLowerCase().includes(searchTerm)
        );
        if (hasMatchingCondition) {
          return true;
        }

        // Search in treatments
        const hasMatchingTreatment = caseItem.selectedTreatments.some(treatment =>
          treatment.name.toLowerCase().includes(searchTerm)
        );
        if (hasMatchingTreatment) {
          return true;
        }

        // Search in follow-up notes
        const hasMatchingNote = caseItem.followUpNotes.some(note =>
          note.content.toLowerCase().includes(searchTerm)
        );
        if (hasMatchingNote) {
          return true;
        }

        return false;
      });

    } catch (error) {
      console.error('Failed to search cases:', error);
      throw error;
    }
  }

  /**
   * Get cases by date range
   */
  async getCasesByDateRange(startDate: Date, endDate: Date): Promise<Case[]> {
    try {
      const allCases = await this.getCases();

      return allCases.filter(caseItem => {
        const caseDate = new Date(caseItem.createdAt);
        return caseDate >= startDate && caseDate <= endDate;
      });

    } catch (error) {
      console.error('Failed to get cases by date range:', error);
      throw error;
    }
  }

  /**
   * Get case statistics
   */
  async getCaseStats(): Promise<{
    totalCases: number;
    casesThisMonth: number;
    casesThisWeek: number;
    averageAge: number;
    commonConditions: { condition: string; count: number }[];
  }> {
    try {
      const allCases = await this.getCases();

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const casesThisMonth = allCases.filter(c => new Date(c.createdAt) >= thisMonth).length;
      const casesThisWeek = allCases.filter(c => new Date(c.createdAt) >= thisWeek).length;

      const totalAge = allCases.reduce((sum, c) => sum + c.patientAge, 0);
      const averageAge = allCases.length > 0 ? Math.round(totalAge / allCases.length) : 0;

      // Count conditions
      const conditionCounts: Record<string, number> = {};
      allCases.forEach(caseItem => {
        caseItem.conditions.forEach(condition => {
          conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
        });
      });

      const commonConditions = Object.entries(conditionCounts)
        .map(([condition, count]) => ({ condition, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalCases: allCases.length,
        casesThisMonth,
        casesThisWeek,
        averageAge,
        commonConditions,
      };

    } catch (error) {
      console.error('Failed to get case statistics:', error);
      throw error;
    }
  }

  /**
   * Validate case data
   */
  private validateCaseData(caseData: Partial<Case>): void {
    if (!caseData.patientIdentifier || caseData.patientIdentifier.trim().length === 0) {
      throw new Error('Patient identifier is required');
    }

    if (!caseData.patientAge || caseData.patientAge <= 0 || caseData.patientAge > 120) {
      throw new Error('Valid patient age is required (1-120 years)');
    }

    if (!caseData.patientWeight || caseData.patientWeight <= 0 || caseData.patientWeight > 300) {
      throw new Error('Valid patient weight is required (1-300 kg)');
    }

    if (!caseData.conditions) {
      throw new Error('Patient conditions are required');
    }

    if (!caseData.allergies) {
      throw new Error('Patient allergies information is required (can be empty array)');
    }
  }

  /**
   * Encrypt sensitive case data
   */
  private encryptSensitiveData(caseData: Case): Case {
    try {
      return {
        ...caseData,
        patientIdentifier: encryptData(caseData.patientIdentifier),
        clinicalNotes: encryptData(caseData.clinicalNotes),
        followUpNotes: caseData.followUpNotes.map(note => ({
          ...note,
          content: encryptData(note.content),
        })),
      };
    } catch (error) {
      console.error('Failed to encrypt case data:', error);
      // Return original data if encryption fails (for development)
      return caseData;
    }
  }

  /**
   * Decrypt sensitive case data
   */
  private decryptSensitiveData(encryptedCase: Case): Case {
    try {
      return {
        ...encryptedCase,
        patientIdentifier: decryptData(encryptedCase.patientIdentifier),
        clinicalNotes: decryptData(encryptedCase.clinicalNotes),
        followUpNotes: encryptedCase.followUpNotes.map(note => ({
          ...note,
          content: decryptData(note.content),
        })),
      };
    } catch (error) {
      console.error('Failed to decrypt case data:', error);
      // Return original data if decryption fails (for development)
      return encryptedCase;
    }
  }

  /**
   * Create version history entry
   */
  private async createVersionEntry(
    caseId: string,
    caseData: Case,
    changeDescription: string,
    previousCase?: Case
  ): Promise<void> {
    try {
      const currentProfile = authService.getCurrentProfile();
      if (!currentProfile) {
        return;
      }

      // Get existing versions to determine version number
      const existingVersions = await this.getCaseHistory(caseId);
      const versionNumber = existingVersions.length + 1;

      // Calculate changes
      const changes: Record<string, any> = {};
      if (previousCase) {
        // Compare with previous version
        Object.keys(caseData).forEach(key => {
          const currentValue = (caseData as any)[key];
          const previousValue = (previousCase as any)[key];
          
          if (JSON.stringify(currentValue) !== JSON.stringify(previousValue)) {
            changes[key] = {
              from: previousValue,
              to: currentValue,
            };
          }
        });
      } else {
        changes.created = true;
      }

      const version: CaseVersion = {
        id: generateSecureToken(12),
        caseId,
        versionNumber,
        changes,
        changedBy: currentProfile.name,
        changedAt: new Date(),
      };

      // Save version
      const versionKey = `${STORAGE_KEYS.CASE_PREFIX}${currentProfile.id}_${caseId}_version_${versionNumber}`;
      storageService.saveToStorage(versionKey, version);

    } catch (error) {
      console.error('Failed to create version entry:', error);
      // Don't throw error - version history is not critical
    }
  }
}

// Export singleton instance
export const caseService = new CaseService();
export default caseService;