import React, { useState } from 'react';
import { Procedure } from '../../types';
import NavigationButtons from '../shared/NavigationButtons';
import ConditionSelector from './ConditionSelector';
import ProtocolDisplay from './ProtocolDisplay';
import ManagementPlanView from './ManagementPlanView';
import ProcedureService from './ProcedureService';
import { useToast } from '../shared/ToastContainer';

interface ProcessRecommenderPageProps {
  doctorProfile: { name: string; email: string; specialization: string; licenseNumber: string } | null;
  onNavigate?: (page: string) => void;
}

const ProcessRecommenderPage: React.FC<ProcessRecommenderPageProps> = ({ doctorProfile, onNavigate }) => {
  const [selectedCondition, setSelectedCondition] = useState<Procedure | null>(null);
  const [patientAge, setPatientAge] = useState<number | undefined>(undefined);
  const [serviceRecommendations, setServiceRecommendations] = useState<string[]>([]);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const { showSuccess, showError } = useToast();

  const handleConditionSelect = (condition: Procedure) => {
    setSelectedCondition(condition);
    setServiceRecommendations([]); // Clear previous recommendations
  };

  const handleSavePlan = (plan: any) => {
    const newPlan = {
      ...plan,
      id: Date.now().toString(),
      patientAge,
      timestamp: new Date().toISOString()
    };
    setSavedPlans(prev => [...prev, newPlan]);
    showSuccess('Management plan saved successfully');
  };

  const handleServiceRecommendation = (services: string[]) => {
    setServiceRecommendations(services);
    showSuccess('Service recommendations generated');
  };

  const handlePrintProtocol = () => {
    if (!selectedCondition) {
      showError('No protocol selected for printing');
      return;
    }

    // Create a printable version
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${selectedCondition.name} - Clinical Protocol</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .section { margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
              .diagnosis { background: #dbeafe; border-color: #3b82f6; }
              .differential { background: #fef3c7; border-color: #f59e0b; }
              .investigations { background: #d1fae5; border-color: #10b981; }
              .management { background: #f3f4f6; border-color: #6b7280; }
              .references { background: #f3e8ff; border-color: #8b5cf6; }
              h2 { color: #1f2937; margin-bottom: 10px; }
              h3 { color: #374151; margin-bottom: 8px; }
              p, li { color: #4b5563; line-height: 1.6; }
              ul { margin: 0; padding-left: 20px; }
              .step { margin-bottom: 15px; padding: 10px; background: white; border-radius: 6px; }
              .step-number { background: #3b82f6; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }
              @media print {
                body { margin: 0; }
                .section { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${selectedCondition.name}</h1>
              <p><strong>Category:</strong> ${selectedCondition.category}</p>
              ${patientAge ? `<p><strong>Patient Age:</strong> ${patientAge} years</p>` : ''}
              <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            <div class="section diagnosis">
              <h2>📋 Primary Diagnosis</h2>
              <p>${selectedCondition.diagnosis}</p>
            </div>

            <div class="section differential">
              <h2>🔍 Differential Diagnosis</h2>
              <ul>
                ${selectedCondition.differential_diagnosis.map(diff => `<li>${diff}</li>`).join('')}
              </ul>
            </div>

            <div class="section investigations">
              <h2>🧪 Required Investigations</h2>
              <ul>
                ${selectedCondition.investigations.map(inv => `<li>${inv}</li>`).join('')}
              </ul>
            </div>

            <div class="section management">
              <h2>📋 Management Protocol</h2>
              ${selectedCondition.management_plan.map(step => `
                <div class="step">
                  <span class="step-number">${step.step}</span>
                  <h3>Step ${step.step}: ${step.title}</h3>
                  <p>${step.description}</p>
                </div>
              `).join('')}
            </div>

            ${serviceRecommendations.length > 0 ? `
              <div class="section">
                <h2>🔗 Related Services</h2>
                <ul>
                  ${serviceRecommendations.map(service => `<li>${service}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            <div class="section references">
              <h2>📚 Evidence & References</h2>
              <ul>
                ${selectedCondition.references.map(ref => `<li>${ref}</li>`).join('')}
              </ul>
            </div>

            <div class="section" style="background: #fef2f2; border-color: #ef4444;">
              <h2>⚠️ Clinical Disclaimer</h2>
              <p><strong>Important:</strong> This protocol is for educational and reference purposes only. Always adapt to individual patient needs and follow your professional judgment and local protocols. Consider patient-specific factors, contraindications, and current best practices.</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const handlePrintPlan = () => {
    if (!selectedCondition) {
      showError('No management plan selected for printing');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${selectedCondition.name} - Management Plan</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .section { margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
              h2 { color: #1f2937; margin-bottom: 10px; }
              h3 { color: #374151; margin-bottom: 8px; }
              p, li { color: #4b5563; line-height: 1.6; }
              .step { margin-bottom: 15px; padding: 15px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6; }
              .step-number { background: #3b82f6; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; margin-right: 10px; }
              .materials { background: #eff6ff; padding: 10px; border-radius: 6px; margin: 10px 0; }
              .precautions { background: #fef3c7; padding: 10px; border-radius: 6px; margin: 10px 0; }
              .followup { background: #f3e8ff; padding: 10px; border-radius: 6px; margin: 10px 0; }
              @media print {
                body { margin: 0; }
                .section { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Treatment Management Plan</h1>
              <h2>${selectedCondition.name}</h2>
              ${patientAge ? `<p><strong>Patient Age:</strong> ${patientAge} years</p>` : ''}
              <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Doctor:</strong> ${doctorProfile?.name || 'Not specified'}</p>
            </div>

            <div class="section">
              <h2>📋 Treatment Steps</h2>
              ${selectedCondition.management_plan.map(step => `
                <div class="step">
                  <span class="step-number">${step.step}</span>
                  <h3>Step ${step.step}: ${step.title}</h3>
                  <p>${step.description}</p>
                  <div class="materials">
                    <strong>Materials:</strong> Standard dental instruments and materials as per step requirements
                  </div>
                  <div class="precautions">
                    <strong>Precautions:</strong> Follow standard infection control and patient safety protocols
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="section followup">
              <h2>📅 Follow-up Schedule</h2>
              <ul>
                <li><strong>24 hours:</strong> Post-operative assessment (if applicable)</li>
                <li><strong>1 week:</strong> Healing evaluation</li>
                <li><strong>1 month:</strong> Treatment outcome assessment</li>
                <li><strong>6 months:</strong> Routine maintenance check</li>
              </ul>
            </div>

            ${serviceRecommendations.length > 0 ? `
              <div class="section">
                <h2>🔗 Recommended Services</h2>
                <ul>
                  ${serviceRecommendations.map(service => `<li>${service}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            <div class="section" style="background: #fef2f2; border-color: #ef4444;">
              <h2>⚠️ Important Notes</h2>
              <ul>
                <li>This plan should be customized based on patient-specific factors</li>
                <li>Monitor patient response and adjust as needed</li>
                <li>Ensure proper informed consent before treatment</li>
                <li>Document all procedures and outcomes</li>
                <li>Follow institutional protocols and guidelines</li>
              </ul>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-primary-50/30 to-accent-50/20">
      <div className="container-medical py-6 md:py-8 lg:py-10">
        <div className="space-y-6 md:space-y-8">
          {/* Enhanced Navigation Buttons */}
          <div className="animate-fade-in">
            <NavigationButtons 
              onNavigateHome={() => onNavigate?.('dashboard')}
              onNavigateBack={() => window.history.back()}
            />
          </div>

          {/* Enhanced Header */}
          <div className="bg-medical-gradient rounded-3xl p-6 md:p-8 lg:p-10 text-white shadow-medical-elevated hover:shadow-medical-hover transition-all duration-300 transform hover:scale-[1.02] animate-slide-up">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center flex-col sm:flex-row">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-4 sm:mb-0 sm:mr-6 md:mr-8 shadow-medical-card group hover:bg-white/30 transition-all duration-300">
                  <svg className="w-8 h-8 md:w-10 md:h-10 text-white group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3 tracking-tight">Process Recommender</h1>
                  <p className="text-white/90 text-base md:text-lg lg:text-xl font-medium">Evidence-based dental procedure protocols and clinical guidelines</p>
                </div>
              </div>
              
              {/* Enhanced Patient Age Input */}
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/30 shadow-medical-card">
                <label className="block text-white text-opacity-90 text-sm font-bold mb-3">
                  Patient Age (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={patientAge || ''}
                  onChange={(e) => setPatientAge(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Enter age"
                  className="w-32 px-4 py-3 rounded-xl text-secondary-900 text-center font-semibold shadow-medical-card focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-primary-500 transition-all duration-300"
                />
              </div>
            </div>
          </div>

          {/* Enhanced Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
            {/* Enhanced Left Column - Condition Selector */}
            <div className="xl:col-span-3">
              <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                <ConditionSelector
                  selectedCondition={selectedCondition}
                  onConditionSelect={handleConditionSelect}
                  patientAge={patientAge}
                />
              </div>
            </div>

            {/* Enhanced Middle Column - Protocol Display and Management Plan */}
            <div className="xl:col-span-6 space-y-6 md:space-y-8">
              <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
                <ProtocolDisplay
                  procedure={selectedCondition}
                  patientAge={patientAge}
                  onPrintProtocol={handlePrintProtocol}
                />
              </div>
              
              <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
                <ManagementPlanView
                  procedure={selectedCondition}
                  patientAge={patientAge}
                  onSavePlan={handleSavePlan}
                  onPrintPlan={handlePrintPlan}
                />
              </div>
            </div>

            {/* Enhanced Right Column - Procedure Services */}
            <div className="xl:col-span-3">
              <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
                <ProcedureService
                  selectedProcedure={selectedCondition}
                  onProcedureSelect={handleConditionSelect}
                  patientAge={patientAge}
                  onServiceRecommendation={handleServiceRecommendation}
                />
              </div>
            </div>
          </div>

          {/* Enhanced Saved Plans Summary */}
          {savedPlans.length > 0 && (
            <div className="bg-gradient-to-br from-success-50 via-white to-success-100/30 border border-success-200 rounded-2xl p-6 shadow-medical-card animate-slide-up" style={{ animationDelay: '500ms' }}>
              <h3 className="font-bold text-success-800 mb-4 flex items-center">
                <div className="w-8 h-8 bg-success-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Saved Management Plans ({savedPlans.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedPlans.slice(-3).map((plan, index) => (
                  <div key={plan.id} className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-success-200/50 hover:shadow-medical-card transition-all duration-300">
                    <span className="text-success-700 font-semibold text-sm">{plan.procedure}</span>
                    <span className="text-success-600 text-xs font-medium">
                      {new Date(plan.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {savedPlans.length > 3 && (
                  <div className="flex items-center justify-center bg-success-100/50 rounded-xl p-4 border border-success-200/50">
                    <span className="text-success-600 text-sm font-medium">... and {savedPlans.length - 3} more plans</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Service Recommendations Summary */}
          {serviceRecommendations.length > 0 && (
            <div className="bg-gradient-to-br from-accent-50 via-white to-accent-100/30 border border-accent-200 rounded-2xl p-6 shadow-medical-card animate-slide-up" style={{ animationDelay: '600ms' }}>
              <h3 className="font-bold text-accent-800 mb-4 flex items-center">
                <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                Generated Recommendations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {serviceRecommendations.map((service, index) => (
                  <div key={index} className="flex items-center bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-accent-200/50 hover:shadow-medical-card transition-all duration-300">
                    <div className="w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <span className="text-accent-700 font-medium text-sm">{service}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Clinical Guidelines Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-slide-up" style={{ animationDelay: '700ms' }}>
            {['Restorative', 'Periodontal', 'Endodontic', 'Emergency', 'Oral Surgery', 'Orthodontic', 'Prosthodontic', 'Pediatric'].map((category, index) => (
              <div key={category} className="bg-gradient-to-br from-primary-50 via-accent-50 to-primary-100/30 border border-primary-200 rounded-2xl p-4 md:p-6 shadow-medical-card hover:shadow-medical-hover transition-all duration-300 transform hover:scale-105 group">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center mr-3 group-hover:bg-primary-600 transition-colors duration-300">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-primary-800 text-sm md:text-base">{category}</h4>
                </div>
                <p className="text-primary-600 text-xs md:text-sm mb-2 font-medium">Evidence-based protocols available</p>
                <div className="text-xs text-primary-500 font-medium">
                  Comprehensive clinical guidelines
                </div>
              </div>
            ))}
          </div>

          {/* Enhanced Clinical Disclaimer */}
          <div className="bg-gradient-to-br from-primary-50 via-white to-primary-100/30 border border-primary-200 rounded-3xl p-6 md:p-8 shadow-medical-card animate-slide-up" style={{ animationDelay: '800ms' }}>
            <div className="flex items-start">
              <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center mr-4 md:mr-6 flex-shrink-0 shadow-medical-card">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg md:text-xl font-bold text-primary-800 mb-3">Evidence-Based Clinical Decision Support</h4>
                <p className="text-primary-700 leading-relaxed text-sm md:text-base">
                  These protocols are based on current evidence and clinical guidelines. Always adapt to individual patient needs 
                  and follow your professional judgment and local protocols. Consider patient-specific factors, contraindications, 
                  and current best practices when implementing any treatment plan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessRecommenderPage;