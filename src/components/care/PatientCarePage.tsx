import React, { useState, useEffect } from 'react';
import CompactBox from '../shared/CompactBox';
import NavigationButtons from '../shared/NavigationButtons';
import { useToast } from '../shared/ToastContainer';
import CareInstructionsView from './CareInstructionsView';
import NutritionGuidance from './NutritionGuidance';
import OralHygieneInstructions from './OralHygieneInstructions';
import { procedureDataService } from '../../services/procedureDataService';
import { FilteredCareInstructions } from '../../services/careDataService';

interface PatientCarePageProps {
  doctorProfile: { name: string; email: string; specialization: string; licenseNumber: string } | null;
  onNavigate?: (page: string) => void;
}

type CareSection = 'care-instructions' | 'nutrition' | 'oral-hygiene' | 'overview';

interface Procedure {
  id: string;
  name: string;
  category: string;
  diagnosis: string;
}

const PatientCarePage: React.FC<PatientCarePageProps> = ({ doctorProfile, onNavigate }) => {
  const [selectedProcedure, setSelectedProcedure] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<CareSection>('overview');
  const [patientAge, setPatientAge] = useState<number | undefined>(undefined);
  const [availableProcedures, setAvailableProcedures] = useState<Procedure[]>([]);
  const [filteredInstructions, setFilteredInstructions] = useState<FilteredCareInstructions | null>(null);
  const { showSuccess } = useToast();

  useEffect(() => {
    loadAvailableProcedures();
  }, []);

  const loadAvailableProcedures = async () => {
    try {
      const procedures = await procedureDataService.getAllProcedures();
      setAvailableProcedures(procedures);
    } catch (error) {
      console.error('Failed to load procedures:', error);
    }
  };

  const handleProcedureSelect = (procedureId: string) => {
    setSelectedProcedure(procedureId);
    setSelectedSection('overview');
    showSuccess(`Selected care instructions for ${procedureId}`);
  };

  const handleInstructionToggle = (instructionId: string, completed: boolean) => {
    if (completed) {
      showSuccess('Instruction marked as completed');
    } else {
      showSuccess('Instruction marked as incomplete');
    }
  };

  const handlePrintRequest = (section: string) => {
    showSuccess(`Preparing ${section} instructions for printing...`);
    // In a real implementation, this would generate a PDF or open print dialog
  };

  const handlePrintAll = () => {
    showSuccess('Preparing complete patient care instructions for printing...');
    // Generate comprehensive printout with all sections
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
            <div className="flex items-center flex-col sm:flex-row">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-4 sm:mb-0 sm:mr-6 md:mr-8 shadow-medical-card group hover:bg-white/30 transition-all duration-300">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-white group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3 tracking-tight">Patient Care Instructions</h1>
                <p className="text-white/90 text-base md:text-lg lg:text-xl font-medium">Comprehensive care guidelines for optimal treatment outcomes</p>
              </div>
            </div>
          </div>

          {/* Enhanced Procedure Selection */}
          <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CompactBox 
              title="Select Procedure Type" 
              defaultExpanded={true}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              }
              variant="primary"
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {availableProcedures.map(procedure => (
                    <button
                      key={procedure.id}
                      onClick={() => handleProcedureSelect(procedure.id)}
                      className={`p-4 md:p-6 rounded-2xl border-2 text-sm font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                        selectedProcedure === procedure.id
                          ? 'bg-gradient-to-br from-primary-50 to-primary-100 border-primary-300 text-primary-800 shadow-medical-card'
                          : 'bg-gradient-to-br from-white to-secondary-50 border-secondary-200 hover:border-primary-200 hover:shadow-medical-card text-secondary-700'
                      }`}
                    >
                      <div className="font-bold text-base mb-1">{procedure.name}</div>
                      <div className="text-xs opacity-80">{procedure.category}</div>
                    </button>
                  ))}
                </div>
                
                {selectedProcedure && (
                  <div className="bg-gradient-to-br from-primary-50 via-white to-primary-100/30 border border-primary-200 rounded-2xl p-6 shadow-medical-card animate-fade-in">
                    <h4 className="font-bold text-primary-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Patient Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="form-label">
                          Patient Age (optional for personalized guidance)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={patientAge || ''}
                          onChange={(e) => setPatientAge(e.target.value ? parseInt(e.target.value) : undefined)}
                          className="form-input hover-lift"
                          placeholder="Enter age"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => setSelectedProcedure('')}
                          className="btn-secondary w-full md:w-auto"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CompactBox>
          </div>

          {/* Enhanced Clinical Disclaimer */}
          <div className="bg-medical-gradient rounded-3xl p-6 md:p-8 shadow-medical-elevated text-white animate-slide-up" style={{ animationDelay: '800ms' }}>
            <div className="flex items-start">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4 md:mr-6 flex-shrink-0 shadow-medical-card">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xl md:text-2xl font-bold mb-3">Patient Care Guidelines</h4>
                <p className="text-white/90 leading-relaxed text-base md:text-lg">
                  These instructions are general guidelines. Individual patient needs may vary.
                  Always provide specific instructions based on the procedure performed and patient factors.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientCarePage;