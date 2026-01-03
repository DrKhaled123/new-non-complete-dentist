import { Case, Note, Treatment, CACHE_TTL } from '../types';
import storageService from './storageService';
import caseService from './caseService';

export interface FollowUpSchedule {
  id: string;
  caseId: string;
  procedureType: string;
  scheduledDate: Date;
  followUpType: 'immediate' | 'short-term' | 'long-term' | 'maintenance' | 'manual';
  priority: 'high' | 'medium' | 'low';
  template: FollowUpTemplate;
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  notes?: string;
  completedAt?: Date;
  completedBy?: string;
}

export interface FollowUpTemplate {
  id: string;
  name: string;
  procedureType: string;
  timeFromProcedure: number; // days
  checklist: FollowUpItem[];
  clinicalNotes: string;
  patientInstructions: string;
}

export interface FollowUpItem {
  id: string;
  question: string;
  responseType: 'yes/no' | 'scale' | 'text' | 'measurement';
  required: boolean;
  normalRange?: string;
  followUp?: string;
}

export interface FollowUpReminder {
  id: string;
  followUpId: string;
  caseId: string;
  patientName: string;
  procedureType: string;
  dueDate: Date;
  priority: 'high' | 'medium' | 'low';
  message: string;
  status: 'active' | 'sent' | 'dismissed';
}

/**
 * FollowUpSystem - Manages patient case follow-ups with scheduling, reminders, and templates
 *
 * Features:
 * - Procedure-based follow-up scheduling
 * - Automated reminder generation
 * - Customizable follow-up templates
 * - Progress tracking and status management
 * - Integration with case management
 * - Performance optimized with caching
 */
class FollowUpSystem {
  private schedules: FollowUpSchedule[] = [];
  private templates: FollowUpTemplate[] = [];
  private reminders: FollowUpReminder[] = [];
  private isLoaded = false;
  private readonly CACHE_KEY = 'dental_cache_followups';

  /**
   * Initialize the follow-up system with default templates
   */
  async initialize(): Promise<void> {
    if (this.isLoaded) return;

    await this.loadFromCache();
    this.initializeDefaultTemplates();
    this.isLoaded = true;
  }

  /**
   * Schedule follow-ups for a new case/treatment
   */
  async scheduleFollowUps(caseId: string, treatments: Treatment[]): Promise<FollowUpSchedule[]> {
    try {
      await this.initialize();

      const caseData = await caseService.getCaseById(caseId);
      if (!caseData) {
        throw new Error(`Case ${caseId} not found`);
      }

      const schedules: FollowUpSchedule[] = [];

      for (const treatment of treatments) {
        const procedureSchedules = await this.generateSchedulesForTreatment(caseId, treatment);
        schedules.push(...procedureSchedules);
      }

      // Save schedules
      this.schedules.push(...schedules);
      await this.saveToCache();

      // Generate initial reminders
      await this.generateReminders(schedules);

      return schedules;
    } catch (error) {
      console.error('Failed to schedule follow-ups:', error);
      return [];
    }
  }

  /**
   * Get all follow-ups for a case
   */
  async getFollowUpsForCase(caseId: string): Promise<FollowUpSchedule[]> {
    try {
      await this.initialize();
      return this.schedules.filter(schedule => schedule.caseId === caseId);
    } catch (error) {
      console.error(`Failed to get follow-ups for case ${caseId}:`, error);
      return [];
    }
  }

  /**
   * Get pending follow-ups due today or overdue
   */
  async getPendingFollowUps(): Promise<FollowUpSchedule[]> {
    try {
      await this.initialize();

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      return this.schedules.filter(schedule =>
        schedule.status === 'pending' &&
        schedule.scheduledDate <= today
      ).sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
    } catch (error) {
      console.error('Failed to get pending follow-ups:', error);
      return [];
    }
  }

  /**
   * Complete a follow-up
   */
  async completeFollowUp(
    followUpId: string,
    responses: Record<string, any>,
    clinicianId: string,
    additionalNotes?: string
  ): Promise<boolean> {
    try {
      await this.initialize();

      const scheduleIndex = this.schedules.findIndex(s => s.id === followUpId);
      if (scheduleIndex === -1) {
        return false;
      }

      const schedule = this.schedules[scheduleIndex];

      // Update schedule status
      schedule.status = 'completed';
      schedule.completedAt = new Date();
      schedule.completedBy = clinicianId;

      // Create follow-up note for the case
      const followUpNote: Note = {
        id: `followup_${followUpId}_${Date.now()}`,
        content: this.generateFollowUpNote(schedule, responses, additionalNotes),
        createdAt: new Date(),
        createdBy: clinicianId,
      };

      // Add note to case
      await caseService.addFollowUpNote(schedule.caseId, followUpNote.content);

      // Schedule next follow-up if applicable
      await this.scheduleNextFollowUp(schedule);

      // Update reminders
      await this.updateRemindersForFollowUp(followUpId);

      await this.saveToCache();

      return true;
    } catch (error) {
      console.error(`Failed to complete follow-up ${followUpId}:`, error);
      return false;
    }
  }

  /**
   * Get follow-up templates for a procedure type
   */
  async getTemplatesForProcedure(procedureType: string): Promise<FollowUpTemplate[]> {
    try {
      await this.initialize();
      return this.templates.filter(template =>
        template.procedureType.toLowerCase().includes(procedureType.toLowerCase())
      );
    } catch (error) {
      console.error(`Failed to get templates for procedure ${procedureType}:`, error);
      return [];
    }
  }

  /**
   * Get active reminders
   */
  async getActiveReminders(): Promise<FollowUpReminder[]> {
    try {
      await this.initialize();
      return this.reminders.filter(reminder => reminder.status === 'active');
    } catch (error) {
      console.error('Failed to get active reminders:', error);
      return [];
    }
  }

  /**
   * Dismiss a reminder
   */
  async dismissReminder(reminderId: string): Promise<boolean> {
    try {
      const reminderIndex = this.reminders.findIndex(r => r.id === reminderId);
      if (reminderIndex === -1) {
        return false;
      }

      this.reminders[reminderIndex].status = 'dismissed';
      await this.saveToCache();
      return true;
    } catch (error) {
      console.error(`Failed to dismiss reminder ${reminderId}:`, error);
      return false;
    }
  }

  /**
   * Generate schedules for a specific treatment
   */
  private async generateSchedulesForTreatment(caseId: string, treatment: Treatment): Promise<FollowUpSchedule[]> {
    const schedules: FollowUpSchedule[] = [];
    const procedureType = treatment.name.toLowerCase();

    // Get relevant templates
    const relevantTemplates = this.templates.filter(template =>
      template.procedureType.toLowerCase().includes(procedureType) ||
      procedureType.includes(template.procedureType.toLowerCase())
    );

    for (const template of relevantTemplates) {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + template.timeFromProcedure);

      const schedule: FollowUpSchedule = {
        id: `followup_${caseId}_${treatment.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        caseId,
        procedureType: treatment.name,
        scheduledDate,
        followUpType: this.determineFollowUpType(template.timeFromProcedure),
        priority: template.timeFromProcedure <= 1 ? 'high' : template.timeFromProcedure <= 7 ? 'medium' : 'low',
        template,
        status: 'pending',
      };

      schedules.push(schedule);
    }

    // If no specific templates found, create default follow-ups
    if (schedules.length === 0) {
      schedules.push(...this.createDefaultSchedules(caseId, treatment));
    }

    return schedules;
  }

  /**
   * Create default follow-up schedules when no templates exist
   */
  private createDefaultSchedules(caseId: string, treatment: Treatment): FollowUpSchedule[] {
    const schedules: FollowUpSchedule[] = [];
    const baseDate = new Date();

    // Immediate follow-up (1 day)
    schedules.push({
      id: `followup_${caseId}_${treatment.type}_immediate_${Date.now()}`,
      caseId,
      procedureType: treatment.name,
      scheduledDate: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000),
      followUpType: 'immediate',
      priority: 'high',
      template: this.createDefaultTemplate('immediate', treatment.name),
      status: 'pending',
    });

    // Short-term follow-up (1 week)
    schedules.push({
      id: `followup_${caseId}_${treatment.type}_short_${Date.now()}`,
      caseId,
      procedureType: treatment.name,
      scheduledDate: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      followUpType: 'short-term',
      priority: 'medium',
      template: this.createDefaultTemplate('short-term', treatment.name),
      status: 'pending',
    });

    // Long-term follow-up (1 month)
    schedules.push({
      id: `followup_${caseId}_${treatment.type}_long_${Date.now()}`,
      caseId,
      procedureType: treatment.name,
      scheduledDate: new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      followUpType: 'long-term',
      priority: 'low',
      template: this.createDefaultTemplate('long-term', treatment.name),
      status: 'pending',
    });

    return schedules;
  }

  /**
   * Initialize default follow-up templates
   */
  private initializeDefaultTemplates(): void {
    if (this.templates.length > 0) return;

    this.templates = [
      // Dental Caries/Restoration
      {
        id: 'restoration_immediate',
        name: 'Restoration - Immediate Follow-up',
        procedureType: 'restoration',
        timeFromProcedure: 1,
        checklist: [
          {
            id: 'pain_assessment',
            question: 'Is the patient experiencing any pain or discomfort?',
            responseType: 'yes/no',
            required: true,
            followUp: 'Assess pain level and adjust analgesics if needed',
          },
          {
            id: 'occlusion_check',
            question: 'Is the occlusion comfortable?',
            responseType: 'yes/no',
            required: true,
            followUp: 'Adjust occlusion if necessary',
          },
          {
            id: 'restoration_integrity',
            question: 'Is the restoration intact?',
            responseType: 'yes/no',
            required: true,
            followUp: 'Repair or replace if damaged',
          },
        ],
        clinicalNotes: 'Check for proper healing, assess restoration integrity, verify patient comfort',
        patientInstructions: 'Avoid chewing hard foods on the treated tooth for 24 hours',
      },
      {
        id: 'restoration_week',
        name: 'Restoration - 1 Week Follow-up',
        procedureType: 'restoration',
        timeFromProcedure: 7,
        checklist: [
          {
            id: 'healing_assessment',
            question: 'How is the healing progress?',
            responseType: 'scale',
            required: true,
            normalRange: 'Good healing with no signs of infection',
          },
          {
            id: 'function_assessment',
            question: 'Is the restoration functioning properly?',
            responseType: 'yes/no',
            required: true,
          },
        ],
        clinicalNotes: 'Assess periodontal health, check restoration margins, evaluate function',
        patientInstructions: 'Continue good oral hygiene practices',
      },

      // Endodontic Treatment
      {
        id: 'endodontic_immediate',
        name: 'Endodontic - Immediate Follow-up',
        procedureType: 'root canal',
        timeFromProcedure: 1,
        checklist: [
          {
            id: 'pain_control',
            question: 'Is pain adequately controlled?',
            responseType: 'yes/no',
            required: true,
          },
          {
            id: 'temporary_integrity',
            question: 'Is the temporary restoration intact?',
            responseType: 'yes/no',
            required: true,
          },
        ],
        clinicalNotes: 'Monitor for signs of infection, assess pain control',
        patientInstructions: 'Take prescribed medications as directed',
      },

      // Surgical Procedures
      {
        id: 'surgical_immediate',
        name: 'Surgical - Immediate Follow-up',
        procedureType: 'extraction',
        timeFromProcedure: 1,
        checklist: [
          {
            id: 'bleeding_control',
            question: 'Is bleeding controlled?',
            responseType: 'yes/no',
            required: true,
          },
          {
            id: 'swelling_assessment',
            question: 'What is the level of swelling?',
            responseType: 'scale',
            required: true,
            normalRange: 'Mild to moderate swelling expected',
          },
          {
            id: 'pain_management',
            question: 'Is pain adequately managed?',
            responseType: 'yes/no',
            required: true,
          },
        ],
        clinicalNotes: 'Check socket healing, assess for dry socket risk, monitor infection signs',
        patientInstructions: 'Follow post-operative care instructions carefully',
      },
    ];
  }

  /**
   * Create default template when none exists
   */
  private createDefaultTemplate(type: string, procedureType: string): FollowUpTemplate {
    const baseChecklist: FollowUpItem[] = [
      {
        id: 'general_assessment',
        question: 'General assessment of treatment success',
        responseType: 'text',
        required: true,
      },
      {
        id: 'complications_check',
        question: 'Any signs of complications?',
        responseType: 'yes/no',
        required: true,
      },
    ];

    return {
      id: `default_${type}_${procedureType.toLowerCase().replace(/\s+/g, '_')}`,
      name: `${procedureType} - ${type.charAt(0).toUpperCase() + type.slice(1)} Follow-up`,
      procedureType,
      timeFromProcedure: type === 'immediate' ? 1 : type === 'short-term' ? 7 : 30,
      checklist: baseChecklist,
      clinicalNotes: `Standard ${type} follow-up for ${procedureType}`,
      patientInstructions: 'Continue recommended oral hygiene practices',
    };
  }

  /**
   * Determine follow-up type based on days from procedure
   */
  private determineFollowUpType(daysFromProcedure: number): 'immediate' | 'short-term' | 'long-term' | 'maintenance' | 'manual' {
    if (daysFromProcedure <= 1) return 'immediate';
    if (daysFromProcedure <= 7) return 'short-term';
    if (daysFromProcedure <= 90) return 'long-term';
    return 'maintenance';
  }

  /**
   * Generate follow-up note content
   */
  private generateFollowUpNote(
    schedule: FollowUpSchedule,
    responses: Record<string, any>,
    additionalNotes?: string
  ): string {
    let note = `Follow-up: ${schedule.template.name}\n`;
    note += `Date: ${new Date().toLocaleDateString()}\n\n`;

    note += 'Checklist Responses:\n';
    for (const item of schedule.template.checklist) {
      const response = responses[item.id];
      if (response !== undefined) {
        note += `- ${item.question}: ${response}\n`;
      }
    }

    if (additionalNotes) {
      note += `\nAdditional Notes: ${additionalNotes}\n`;
    }

    note += `\nNext Steps: ${schedule.template.patientInstructions}\n`;

    return note;
  }

  /**
   * Schedule next follow-up if applicable
   */
  private async scheduleNextFollowUp(completedSchedule: FollowUpSchedule): Promise<void> {
    // Logic for scheduling subsequent follow-ups based on procedure type and current status
    // This is a simplified implementation
    if (completedSchedule.followUpType === 'immediate') {
      // Schedule short-term follow-up if not already scheduled
      const hasShortTerm = this.schedules.some(s =>
        s.caseId === completedSchedule.caseId &&
        s.procedureType === completedSchedule.procedureType &&
        s.followUpType === 'short-term' &&
        s.status === 'pending'
      );

      if (!hasShortTerm) {
        const shortTermDate = new Date(completedSchedule.scheduledDate);
        shortTermDate.setDate(shortTermDate.getDate() + 6); // 1 week from immediate

        const nextSchedule: FollowUpSchedule = {
          id: `followup_${completedSchedule.caseId}_${completedSchedule.procedureType}_short_${Date.now()}`,
          caseId: completedSchedule.caseId,
          procedureType: completedSchedule.procedureType,
          scheduledDate: shortTermDate,
          followUpType: 'short-term',
          priority: 'medium',
          template: this.createDefaultTemplate('short-term', completedSchedule.procedureType),
          status: 'pending',
        };

        this.schedules.push(nextSchedule);
      }
    }
  }

  /**
   * Generate reminders for follow-ups
   */
  private async generateReminders(schedules: FollowUpSchedule[]): Promise<void> {
    for (const schedule of schedules) {
      // Get case info for reminder
      const caseData = await caseService.getCaseById(schedule.caseId);
      if (!caseData) continue;

      const reminder: FollowUpReminder = {
        id: `reminder_${schedule.id}`,
        followUpId: schedule.id,
        caseId: schedule.caseId,
        patientName: `Patient ${caseData.patientIdentifier}`, // Simplified
        procedureType: schedule.procedureType,
        dueDate: schedule.scheduledDate,
        priority: schedule.priority,
        message: `Follow-up due for ${schedule.procedureType} procedure`,
        status: 'active',
      };

      this.reminders.push(reminder);
    }

    await this.saveToCache();
  }

  /**
   * Update reminders when follow-up is completed
   */
  private async updateRemindersForFollowUp(followUpId: string): Promise<void> {
    const reminderIndex = this.reminders.findIndex(r => r.followUpId === followUpId);
    if (reminderIndex !== -1) {
      this.reminders[reminderIndex].status = 'sent';
    }
  }

  /**
   * Load data from cache
   */
  private async loadFromCache(): Promise<void> {
    try {
      const cached = storageService.getFromStorage<{
        schedules: FollowUpSchedule[];
        templates: FollowUpTemplate[];
        reminders: FollowUpReminder[];
        timestamp: string;
      }>(this.CACHE_KEY);

      if (cached) {
        // Check if cache is still valid (24 hours)
        const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
        if (cacheAge < CACHE_TTL.VERY_LONG) {
          this.schedules = cached.schedules.map(s => ({
            ...s,
            scheduledDate: new Date(s.scheduledDate),
            completedAt: s.completedAt ? new Date(s.completedAt) : undefined,
          }));
          this.templates = cached.templates;
          this.reminders = cached.reminders.map(r => ({
            ...r,
            dueDate: new Date(r.dueDate),
          }));
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load follow-up data from cache:', error);
    }
  }

  /**
   * Save data to cache
   */
  private async saveToCache(): Promise<void> {
    try {
      storageService.saveToStorage(this.CACHE_KEY, {
        schedules: this.schedules,
        templates: this.templates,
        reminders: this.reminders,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to save follow-up data to cache:', error);
    }
  }

  /**
   * Clear follow-up cache
   */
  clearCache(): void {
    this.schedules = [];
    this.templates = [];
    this.reminders = [];
    storageService.removeFromStorage(this.CACHE_KEY);
    this.isLoaded = false;
  }

  /**
   * Get follow-up statistics
   */
  getFollowUpStats(): {
    totalSchedules: number;
    pendingFollowUps: number;
    completedFollowUps: number;
    overdueFollowUps: number;
    activeReminders: number;
  } {
    const now = new Date();
    const pending = this.schedules.filter(s => s.status === 'pending').length;
    const completed = this.schedules.filter(s => s.status === 'completed').length;
    const overdue = this.schedules.filter(s =>
      s.status === 'pending' && s.scheduledDate < now
    ).length;
    const activeReminders = this.reminders.filter(r => r.status === 'active').length;

    return {
      totalSchedules: this.schedules.length,
      pendingFollowUps: pending,
      completedFollowUps: completed,
      overdueFollowUps: overdue,
      activeReminders,
    };
  }
}

// Export singleton instance
export const followUpSystem = new FollowUpSystem();
export default followUpSystem;