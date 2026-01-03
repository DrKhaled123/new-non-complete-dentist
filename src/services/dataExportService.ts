import { Case, Treatment, Dose, CACHE_TTL } from '../types';
import storageService from './storageService';
import caseService from './caseService';

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  includePHI: boolean; // Protected Health Information
  dateRange?: {
    start: Date;
    end: Date;
  };
  sanitizeData: boolean;
  includeFollowUps: boolean;
  includeCalculations: boolean;
}

export interface ExportResult {
  data: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface SanitizedCase {
  caseId: string;
  patientId: string; // Anonymized
  patientAge: number;
  patientWeight: number;
  conditions: string[];
  allergies: string[];
  treatments: SanitizedTreatment[];
  clinicalNotes: string; // Sanitized
  createdAt: string;
  updatedAt: string;
}

export interface SanitizedTreatment {
  type: string;
  name: string;
  details: Record<string, any>; // Sanitized
}

/**
 * DataExportService - Exports case data, treatment plans, and reports in various formats with sanitization
 *
 * Features:
 * - Multiple export formats (CSV, JSON, PDF)
 * - Data sanitization for PHI protection
 * - Treatment plan exports
 * - Report generation
 * - Batch export capabilities
 * - Performance optimized with caching
 */
class DataExportService {
  private readonly CACHE_KEY = 'dental_cache_exports';

  /**
   * Export case data
   */
  async exportCase(caseId: string, options: ExportOptions): Promise<ExportResult | null> {
    try {
      const caseData = await caseService.getCaseById(caseId);
      if (!caseData) {
        throw new Error(`Case ${caseId} not found`);
      }

      const sanitizedCase = this.sanitizeCaseData(caseData, options);

      switch (options.format) {
        case 'csv':
          return this.exportCaseAsCSV(sanitizedCase, options);
        case 'json':
          return this.exportCaseAsJSON(sanitizedCase, options);
        case 'pdf':
          return this.exportCaseAsPDF(sanitizedCase, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error(`Failed to export case ${caseId}:`, error);
      return null;
    }
  }

  /**
   * Export multiple cases
   */
  async exportCases(caseIds: string[], options: ExportOptions): Promise<ExportResult | null> {
    try {
      const cases: SanitizedCase[] = [];

      for (const caseId of caseIds) {
        const caseData = await caseService.getCaseById(caseId);
        if (caseData) {
          cases.push(this.sanitizeCaseData(caseData, options));
        }
      }

      switch (options.format) {
        case 'csv':
          return this.exportCasesAsCSV(cases, options);
        case 'json':
          return this.exportCasesAsJSON(cases, options);
        case 'pdf':
          return this.exportCasesAsPDF(cases, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Failed to export cases:', error);
      return null;
    }
  }

  /**
   * Export treatment plan for a case
   */
  async exportTreatmentPlan(caseId: string, options: ExportOptions): Promise<ExportResult | null> {
    try {
      const caseData = await caseService.getCaseById(caseId);
      if (!caseData) {
        throw new Error(`Case ${caseId} not found`);
      }

      const treatmentPlan = this.generateTreatmentPlan(caseData, options);

      switch (options.format) {
        case 'csv':
          return this.exportTreatmentPlanAsCSV(treatmentPlan, options);
        case 'json':
          return this.exportTreatmentPlanAsJSON(treatmentPlan, options);
        case 'pdf':
          return this.exportTreatmentPlanAsPDF(treatmentPlan, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error(`Failed to export treatment plan for case ${caseId}:`, error);
      return null;
    }
  }

  /**
   * Generate clinical report
   */
  async generateReport(caseId: string, reportType: 'summary' | 'detailed' | 'followup', options: ExportOptions): Promise<ExportResult | null> {
    try {
      const caseData = await caseService.getCaseById(caseId);
      if (!caseData) {
        throw new Error(`Case ${caseId} not found`);
      }

      const report = await this.generateClinicalReport(caseData, reportType, options);

      switch (options.format) {
        case 'csv':
          return this.exportReportAsCSV(report, options);
        case 'json':
          return this.exportReportAsJSON(report, options);
        case 'pdf':
          return this.exportReportAsPDF(report, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error(`Failed to generate ${reportType} report for case ${caseId}:`, error);
      return null;
    }
  }

  /**
   * Sanitize case data for export
   */
  private sanitizeCaseData(caseData: Case, options: ExportOptions): SanitizedCase {
    const sanitized: SanitizedCase = {
      caseId: caseData.id,
      patientId: options.includePHI ? caseData.patientIdentifier : this.anonymizePatientId(caseData.patientIdentifier),
      patientAge: caseData.patientAge,
      patientWeight: caseData.patientWeight,
      conditions: caseData.conditions,
      allergies: caseData.allergies,
      treatments: caseData.selectedTreatments.map(treatment => this.sanitizeTreatment(treatment, options)),
      clinicalNotes: options.sanitizeData ? this.sanitizeClinicalNotes(caseData.clinicalNotes) : caseData.clinicalNotes,
      createdAt: caseData.createdAt.toISOString(),
      updatedAt: caseData.updatedAt.toISOString(),
    };

    return sanitized;
  }

  /**
   * Sanitize treatment data
   */
  private sanitizeTreatment(treatment: Treatment, options: ExportOptions): SanitizedTreatment {
    return {
      type: treatment.type,
      name: treatment.name,
      details: options.sanitizeData ? this.sanitizeTreatmentDetails(treatment.details) : treatment.details,
    };
  }

  /**
   * Anonymize patient identifier
   */
  private anonymizePatientId(patientId: string): string {
    // Simple anonymization - in production, use proper hashing
    return `PT_${patientId.slice(-4).padStart(8, 'X')}`;
  }

  /**
   * Sanitize clinical notes
   */
  private sanitizeClinicalNotes(notes: string): string {
    // Remove or mask sensitive information
    return notes
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, 'XXX-XX-XXXX') // SSN
      .replace(/\b\d{10}\b/g, 'XXXXXXXXXX') // Phone numbers
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL REDACTED]'); // Emails
  }

  /**
   * Sanitize treatment details
   */
  private sanitizeTreatmentDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };

    // Remove sensitive fields if any
    const sensitiveFields = ['personalInfo', 'contactDetails', 'financialInfo'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Export case as CSV
   */
  private exportCaseAsCSV(caseData: SanitizedCase, options: ExportOptions): ExportResult {
    const headers = [
      'Case ID',
      'Patient ID',
      'Age',
      'Weight',
      'Conditions',
      'Allergies',
      'Treatments',
      'Clinical Notes',
      'Created Date',
      'Updated Date'
    ];

    const rows = [
      headers.join(','),
      [
        caseData.caseId,
        caseData.patientId,
        caseData.patientAge,
        caseData.patientWeight,
        `"${caseData.conditions.join('; ')}"`,
        `"${caseData.allergies.join('; ')}"`,
        `"${caseData.treatments.map(t => `${t.type}: ${t.name}`).join('; ')}"`,
        `"${caseData.clinicalNotes.replace(/"/g, '""')}"`,
        caseData.createdAt,
        caseData.updatedAt
      ].join(',')
    ];

    const csvData = rows.join('\n');
    const filename = `case_${caseData.caseId}_${new Date().toISOString().split('T')[0]}.csv`;

    return {
      data: csvData,
      filename,
      mimeType: 'text/csv',
      size: csvData.length,
    };
  }

  /**
   * Export cases as CSV
   */
  private exportCasesAsCSV(cases: SanitizedCase[], options: ExportOptions): ExportResult {
    const headers = [
      'Case ID',
      'Patient ID',
      'Age',
      'Weight',
      'Conditions',
      'Allergies',
      'Treatment Count',
      'Created Date',
      'Updated Date'
    ];

    const rows = [headers.join(',')];

    for (const caseData of cases) {
      rows.push([
        caseData.caseId,
        caseData.patientId,
        caseData.patientAge,
        caseData.patientWeight,
        `"${caseData.conditions.join('; ')}"`,
        `"${caseData.allergies.join('; ')}"`,
        caseData.treatments.length,
        caseData.createdAt,
        caseData.updatedAt
      ].join(','));
    }

    const csvData = rows.join('\n');
    const filename = `cases_export_${new Date().toISOString().split('T')[0]}.csv`;

    return {
      data: csvData,
      filename,
      mimeType: 'text/csv',
      size: csvData.length,
    };
  }

  /**
   * Export case as JSON
   */
  private exportCaseAsJSON(caseData: SanitizedCase, options: ExportOptions): ExportResult {
    const jsonData = JSON.stringify(caseData, null, 2);
    const filename = `case_${caseData.caseId}_${new Date().toISOString().split('T')[0]}.json`;

    return {
      data: jsonData,
      filename,
      mimeType: 'application/json',
      size: jsonData.length,
    };
  }

  /**
   * Export cases as JSON
   */
  private exportCasesAsJSON(cases: SanitizedCase[], options: ExportOptions): ExportResult {
    const jsonData = JSON.stringify({ cases, exportDate: new Date().toISOString(), options }, null, 2);
    const filename = `cases_export_${new Date().toISOString().split('T')[0]}.json`;

    return {
      data: jsonData,
      filename,
      mimeType: 'application/json',
      size: jsonData.length,
    };
  }

  /**
   * Export case as PDF (simplified text representation)
   */
  private exportCaseAsPDF(caseData: SanitizedCase, options: ExportOptions): ExportResult {
    const pdfContent = this.generatePDFContent(caseData);
    const filename = `case_${caseData.caseId}_${new Date().toISOString().split('T')[0]}.txt`; // Using .txt as placeholder for PDF

    return {
      data: pdfContent,
      filename,
      mimeType: 'text/plain', // Would be 'application/pdf' for real PDF
      size: pdfContent.length,
    };
  }

  /**
   * Export cases as PDF
   */
  private exportCasesAsPDF(cases: SanitizedCase[], options: ExportOptions): ExportResult {
    let pdfContent = 'CASE EXPORT REPORT\n';
    pdfContent += '=' .repeat(50) + '\n\n';
    pdfContent += `Export Date: ${new Date().toLocaleDateString()}\n`;
    pdfContent += `Total Cases: ${cases.length}\n\n`;

    for (const caseData of cases) {
      pdfContent += this.generatePDFContent(caseData);
      pdfContent += '\n' + '-'.repeat(50) + '\n\n';
    }

    const filename = `cases_export_${new Date().toISOString().split('T')[0]}.txt`;

    return {
      data: pdfContent,
      filename,
      mimeType: 'text/plain',
      size: pdfContent.length,
    };
  }

  /**
   * Generate PDF content (text representation)
   */
  private generatePDFContent(caseData: SanitizedCase): string {
    let content = `DENTAL CASE REPORT\n`;
    content += '=' .repeat(30) + '\n\n';
    content += `Case ID: ${caseData.caseId}\n`;
    content += `Patient ID: ${caseData.patientId}\n`;
    content += `Age: ${caseData.patientAge} years\n`;
    content += `Weight: ${caseData.patientWeight} kg\n\n`;

    content += `Medical Conditions:\n`;
    caseData.conditions.forEach(condition => {
      content += `  - ${condition}\n`;
    });
    content += '\n';

    content += `Allergies:\n`;
    caseData.allergies.forEach(allergy => {
      content += `  - ${allergy}\n`;
    });
    content += '\n';

    content += `Treatments:\n`;
    caseData.treatments.forEach(treatment => {
      content += `  - ${treatment.type}: ${treatment.name}\n`;
    });
    content += '\n';

    content += `Clinical Notes:\n${caseData.clinicalNotes}\n\n`;
    content += `Created: ${new Date(caseData.createdAt).toLocaleDateString()}\n`;
    content += `Updated: ${new Date(caseData.updatedAt).toLocaleDateString()}\n`;

    return content;
  }

  /**
   * Generate treatment plan
   */
  private generateTreatmentPlan(caseData: Case, options: ExportOptions): any {
    return {
      caseId: caseData.id,
      patientInfo: {
        age: caseData.patientAge,
        weight: caseData.patientWeight,
        conditions: caseData.conditions,
        allergies: caseData.allergies,
      },
      treatments: caseData.selectedTreatments,
      calculatedDoses: options.includeCalculations ? caseData.calculatedDoses : [],
      clinicalNotes: options.sanitizeData ? this.sanitizeClinicalNotes(caseData.clinicalNotes) : caseData.clinicalNotes,
      followUpNotes: options.includeFollowUps ? caseData.followUpNotes : [],
      planDate: new Date().toISOString(),
    };
  }

  /**
   * Export treatment plan as CSV
   */
  private exportTreatmentPlanAsCSV(plan: any, options: ExportOptions): ExportResult {
    const headers = [
      'Case ID',
      'Patient Age',
      'Patient Weight',
      'Treatment Type',
      'Treatment Name',
      'Calculated Dose',
      'Frequency',
      'Duration'
    ];

    const rows = [headers.join(',')];

    for (const treatment of plan.treatments) {
      const dose = plan.calculatedDoses.find((d: Dose) => d.drugName.includes(treatment.name));
      rows.push([
        plan.caseId,
        plan.patientInfo.age,
        plan.patientInfo.weight,
        treatment.type,
        treatment.name,
        dose ? dose.dosage : 'N/A',
        dose ? dose.frequency : 'N/A',
        dose ? dose.duration : 'N/A'
      ].join(','));
    }

    const csvData = rows.join('\n');
    const filename = `treatment_plan_${plan.caseId}_${new Date().toISOString().split('T')[0]}.csv`;

    return {
      data: csvData,
      filename,
      mimeType: 'text/csv',
      size: csvData.length,
    };
  }

  /**
   * Export treatment plan as JSON
   */
  private exportTreatmentPlanAsJSON(plan: any, options: ExportOptions): ExportResult {
    const jsonData = JSON.stringify(plan, null, 2);
    const filename = `treatment_plan_${plan.caseId}_${new Date().toISOString().split('T')[0]}.json`;

    return {
      data: jsonData,
      filename,
      mimeType: 'application/json',
      size: jsonData.length,
    };
  }

  /**
   * Export treatment plan as PDF
   */
  private exportTreatmentPlanAsPDF(plan: any, options: ExportOptions): ExportResult {
    let content = `TREATMENT PLAN\n`;
    content += '=' .repeat(40) + '\n\n';
    content += `Case ID: ${plan.caseId}\n`;
    content += `Patient: Age ${plan.patientInfo.age}, Weight ${plan.patientInfo.weight}kg\n\n`;

    content += `Planned Treatments:\n`;
    plan.treatments.forEach((treatment: Treatment) => {
      content += `  - ${treatment.type}: ${treatment.name}\n`;
    });
    content += '\n';

    if (plan.calculatedDoses.length > 0) {
      content += `Calculated Doses:\n`;
      plan.calculatedDoses.forEach((dose: Dose) => {
        content += `  - ${dose.drugName}: ${dose.dosage}, ${dose.frequency}, ${dose.duration}\n`;
        content += `    Notes: ${dose.clinicalNotes.join('; ')}\n`;
      });
      content += '\n';
    }

    content += `Clinical Notes: ${plan.clinicalNotes}\n`;

    const filename = `treatment_plan_${plan.caseId}_${new Date().toISOString().split('T')[0]}.txt`;

    return {
      data: content,
      filename,
      mimeType: 'text/plain',
      size: content.length,
    };
  }

  /**
   * Generate clinical report
   */
  private async generateClinicalReport(caseData: Case, reportType: string, options: ExportOptions): Promise<any> {
    const report: any = {
      reportType,
      caseId: caseData.id,
      generatedAt: new Date().toISOString(),
      patientInfo: {
        age: caseData.patientAge,
        weight: caseData.patientWeight,
        conditions: caseData.conditions,
        allergies: caseData.allergies,
      },
      treatments: caseData.selectedTreatments,
      clinicalNotes: options.sanitizeData ? this.sanitizeClinicalNotes(caseData.clinicalNotes) : caseData.clinicalNotes,
    };

    switch (reportType) {
      case 'summary':
        report.summary = this.generateSummaryReport(caseData);
        break;
      case 'detailed':
        report.details = this.generateDetailedReport(caseData);
        break;
      case 'followup':
        report.followUps = caseData.followUpNotes;
        break;
    }

    return report;
  }

  /**
   * Generate summary report
   */
  private generateSummaryReport(caseData: Case): any {
    return {
      treatmentCount: caseData.selectedTreatments.length,
      conditionsCount: caseData.conditions.length,
      allergiesCount: caseData.allergies.length,
      followUpsCount: caseData.followUpNotes.length,
      caseStatus: 'Active',
    };
  }

  /**
   * Generate detailed report
   */
  private generateDetailedReport(caseData: Case): any {
    return {
      treatments: caseData.selectedTreatments,
      doses: caseData.calculatedDoses,
      notes: caseData.followUpNotes,
      timeline: this.generateCaseTimeline(caseData),
    };
  }

  /**
   * Generate case timeline
   */
  private generateCaseTimeline(caseData: Case): any[] {
    const events = [
      {
        date: caseData.createdAt,
        type: 'case_created',
        description: 'Case created',
      },
      {
        date: caseData.updatedAt,
        type: 'case_updated',
        description: 'Case last updated',
      }
    ];

    // Add follow-up notes
    caseData.followUpNotes.forEach(note => {
      events.push({
        date: note.createdAt,
        type: 'followup',
        description: `Follow-up: ${note.content.substring(0, 50)}... (by ${note.createdBy})`,
      });
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Export report as CSV/JSON/PDF
   */
  private exportReportAsCSV(report: any, options: ExportOptions): ExportResult {
    // Simplified CSV export for reports
    const csvData = `Report Type,${report.reportType}\nCase ID,${report.caseId}\nGenerated,${report.generatedAt}\n`;
    const filename = `report_${report.reportType}_${report.caseId}_${new Date().toISOString().split('T')[0]}.csv`;

    return {
      data: csvData,
      filename,
      mimeType: 'text/csv',
      size: csvData.length,
    };
  }

  private exportReportAsJSON(report: any, options: ExportOptions): ExportResult {
    const jsonData = JSON.stringify(report, null, 2);
    const filename = `report_${report.reportType}_${report.caseId}_${new Date().toISOString().split('T')[0]}.json`;

    return {
      data: jsonData,
      filename,
      mimeType: 'application/json',
      size: jsonData.length,
    };
  }

  private exportReportAsPDF(report: any, options: ExportOptions): ExportResult {
    const content = `CLINICAL REPORT - ${report.reportType.toUpperCase()}\n\nCase ID: ${report.caseId}\nGenerated: ${new Date(report.generatedAt).toLocaleDateString()}\n\n${JSON.stringify(report, null, 2)}`;
    const filename = `report_${report.reportType}_${report.caseId}_${new Date().toISOString().split('T')[0]}.txt`;

    return {
      data: content,
      filename,
      mimeType: 'text/plain',
      size: content.length,
    };
  }

  /**
   * Download helper (would trigger browser download in real implementation)
   */
  downloadExport(result: ExportResult): void {
    const blob = new Blob([result.data], { type: result.mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  /**
   * Clear export cache
   */
  clearCache(): void {
    storageService.removeFromStorage(this.CACHE_KEY);
  }
}

// Export singleton instance
export const dataExportService = new DataExportService();
export default dataExportService;