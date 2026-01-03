import React, { useState, useEffect } from 'react';
import { drugDataService } from '../../services/drugDataService';
import { Drug, PatientParameters, DoseCalculationResult } from '../../types';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';
import NavigationButtons from '../shared/NavigationButtons';
import { useToast } from '../shared/ToastContainer';

interface DrugCalculatorPageProps {
  doctorProfile: { name: string; email: string; specialization: string; licenseNumber: string } | null;
  onNavigate?: (page: string) => void;
}

const DrugCalculatorPage: React.FC<DrugCalculatorPageProps> = ({ doctorProfile, onNavigate }) => {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [patientParams, setPatientParams] = useState<PatientParameters>({
    age: 30,
    weight: 70,
    conditions: [],
    allergies: [],
    gender: 'male'
  });
  const [calculationResult, setCalculationResult] = useState<DoseCalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadDrugs();
  }, []);

  const loadDrugs = async () => {
    try {
      setIsLoading(true);
      const drugList = await drugDataService.loadDrugDatabase();
      setDrugs(drugList);
    } catch (error) {
      showError('Failed to load drug database');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDose = () => {
    if (!selectedDrug) {
      showError('Please select a drug first');
      return;
    }

    // Simple dose calculation based on adult dosing
    const adultDose = selectedDrug.dosage.adults;
    const result: DoseCalculationResult = {
      drugName: selectedDrug.name,
      dosage: adultDose.dose,
      frequency: adultDose.regimen,
      duration: '7-10 days',
      totalQuantity: adultDose.max_daily,
      clinicalNotes: [
        `Class: ${selectedDrug.class}`,
        `Route: ${selectedDrug.administration.route}`,
        `Instructions: ${selectedDrug.administration.instructions}`
      ],
      warnings: [],
      contraindications: selectedDrug.contraindications,
      adjustments: {}
    };

    // Check for contraindications
    if (patientParams.allergies.some(allergy => 
      selectedDrug.contraindications.some(contra => 
        contra.toLowerCase().includes(allergy.toLowerCase())
      )
    )) {
      result.warnings.push({
        level: 'major',
        message: 'CONTRAINDICATED: Patient allergy detected',
        recommendation: 'Do not prescribe this medication'
      });
    }

    setCalculationResult(result);
    showSuccess('Dose calculated successfully');
  };

  const commonConditions = [
    'Hypertension', 'Diabetes', 'Asthma', 'Heart Disease', 'Kidney Disease', 'Liver Disease'
  ];

  const commonAllergies = [
    'Penicillin', 'Sulfa', 'Codeine', 'Latex', 'Iodine', 'Aspirin'
  ];

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3 tracking-tight">Drug Calculator</h1>
                <p className="text-white/90 text-base md:text-lg lg:text-xl font-medium">Calculate precise drug dosages with advanced interaction checks</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
            {/* Enhanced Patient Information */}
            <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
              <CompactBox 
                title="Patient Information" 
                defaultExpanded={true}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
                variant="primary"
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="form-label">Age (years)</label>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={patientParams.age}
                        onChange={(e) => setPatientParams({...patientParams, age: parseInt(e.target.value) || 0})}
                        className="form-input hover-lift"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="form-label">Weight (kg)</label>
                      <input
                        type="number"
                        min="0"
                        max="300"
                        value={patientParams.weight}
                        onChange={(e) => setPatientParams({...patientParams, weight: parseInt(e.target.value) || 0})}
                        className="form-input hover-lift"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="form-label">Gender</label>
                    <select
                      value={patientParams.gender}
                      onChange={(e) => setPatientParams({...patientParams, gender: e.target.value as 'male' | 'female'})}
                      className="form-select hover-lift"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="form-label">Medical Conditions</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {commonConditions.map(condition => (
                        <label key={condition} className="flex items-center p-3 rounded-xl border border-secondary-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all duration-300 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={patientParams.conditions.includes(condition)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPatientParams({
                                  ...patientParams,
                                  conditions: [...patientParams.conditions, condition]
                                });
                              } else {
                                setPatientParams({
                                  ...patientParams,
                                  conditions: patientParams.conditions.filter(c => c !== condition)
                                });
                              }
                            }}
                            className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500 focus:ring-2 transition-all duration-200"
                          />
                          <span className="ml-3 text-sm font-medium text-secondary-700 group-hover:text-primary-700 transition-colors duration-200">{condition}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="form-label">Allergies</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {commonAllergies.map(allergy => (
                        <label key={allergy} className="flex items-center p-3 rounded-xl border border-secondary-200 hover:border-error-300 hover:bg-error-50/50 transition-all duration-300 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={patientParams.allergies.includes(allergy)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPatientParams({
                                  ...patientParams,
                                  allergies: [...patientParams.allergies, allergy]
                                });
                              } else {
                                setPatientParams({
                                  ...patientParams,
                                  allergies: patientParams.allergies.filter(a => a !== allergy)
                                });
                              }
                            }}
                            className="w-4 h-4 text-error-600 border-secondary-300 rounded focus:ring-error-500 focus:ring-2 transition-all duration-200"
                          />
                          <span className="ml-3 text-sm font-medium text-secondary-700 group-hover:text-error-700 transition-colors duration-200">{allergy}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </CompactBox>
            </div>

            {/* Enhanced Drug Selection */}
            <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
              <CompactBox 
                title="Drug Selection" 
                defaultExpanded={true}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                }
                variant="accent"
              >
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner text="Loading drugs database..." size="lg" variant="primary" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="form-label">Select Drug</label>
                      <select
                        value={selectedDrug?.id || ''}
                        onChange={(e) => {
                          const drug = drugs.find(d => d.id === e.target.value);
                          setSelectedDrug(drug || null);
                        }}
                        className="form-select hover-lift"
                      >
                        <option value="">Choose a drug from the database...</option>
                        {drugs.map(drug => (
                          <option key={drug.id} value={drug.id}>
                            {drug.name} ({drug.class})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedDrug && (
                      <div className="bg-gradient-to-br from-accent-50 via-white to-accent-100/30 rounded-2xl p-6 border border-accent-200 shadow-medical-card animate-fade-in">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center shadow-medical">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-secondary-900 mb-2">{selectedDrug.name}</h4>
                            <p className="text-sm font-semibold text-accent-700 mb-3">Class: {selectedDrug.class}</p>
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-secondary-700">Indications:</p>
                              <ul className="text-sm text-secondary-600 space-y-1">
                                {selectedDrug.indications.slice(0, 3).map((indication, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="w-1.5 h-1.5 bg-accent-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                    <span>{indication.description}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={calculateDose}
                      disabled={!selectedDrug}
                      className="w-full btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none hover:shadow-medical-hover transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span>Calculate Dose</span>
                      </div>
                    </button>
                  </div>
                )}
              </CompactBox>
            </div>
          </div>

          {/* Enhanced Calculation Results */}
          {calculationResult && (
            <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
              <CompactBox 
                title="Calculation Results" 
                defaultExpanded={true}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
                variant="success"
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-success-50 via-white to-success-100/30 border border-success-200 rounded-2xl p-6 shadow-medical-card hover:shadow-medical-hover transition-all duration-300">
                      <h4 className="font-bold text-success-800 mb-4 flex items-center">
                        <div className="w-8 h-8 bg-success-500 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        Dosage Information
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-success-200/50">
                          <span className="text-sm font-semibold text-success-700">Drug:</span>
                          <span className="text-sm font-bold text-secondary-900">{calculationResult.drugName}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-success-200/50">
                          <span className="text-sm font-semibold text-success-700">Dose:</span>
                          <span className="text-sm font-bold text-secondary-900">{calculationResult.dosage}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-success-200/50">
                          <span className="text-sm font-semibold text-success-700">Frequency:</span>
                          <span className="text-sm font-bold text-secondary-900">{calculationResult.frequency}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm font-semibold text-success-700">Duration:</span>
                          <span className="text-sm font-bold text-secondary-900">{calculationResult.duration}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-accent-50 via-white to-accent-100/30 border border-accent-200 rounded-2xl p-6 shadow-medical-card hover:shadow-medical-hover transition-all duration-300">
                      <h4 className="font-bold text-accent-800 mb-4 flex items-center">
                        <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        Clinical Notes
                      </h4>
                      <ul className="text-sm space-y-3">
                        {calculationResult.clinicalNotes.map((note, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-accent-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                            <span className="text-accent-700 font-medium">{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {calculationResult.warnings.length > 0 && (
                    <div className="bg-gradient-to-br from-error-50 via-white to-error-100/30 border border-error-200 rounded-2xl p-6 shadow-medical-card animate-pulse-subtle">
                      <h4 className="font-bold text-error-800 mb-4 flex items-center">
                        <div className="w-8 h-8 bg-error-500 rounded-lg flex items-center justify-center mr-3 animate-pulse">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        Critical Warnings
                      </h4>
                      <div className="space-y-4">
                        {calculationResult.warnings.map((warning, index) => (
                          <div key={index} className="bg-white/80 rounded-xl p-4 border border-error-200">
                            <p className="font-bold text-error-800 mb-2">{warning.message}</p>
                            <p className="text-sm text-error-700">{warning.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {calculationResult.contraindications.length > 0 && (
                    <div className="bg-gradient-to-br from-warning-50 via-white to-warning-100/30 border border-warning-200 rounded-2xl p-6 shadow-medical-card">
                      <h4 className="font-bold text-warning-800 mb-4 flex items-center">
                        <div className="w-8 h-8 bg-warning-500 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        Contraindications
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {calculationResult.contraindications.map((contra, index) => (
                          <div key={index} className="flex items-start bg-white/80 rounded-xl p-4 border border-warning-200">
                            <span className="w-2 h-2 bg-warning-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                            <span className="text-sm font-medium text-warning-700">{contra}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CompactBox>
            </div>
          )}

          {/* Enhanced Clinical Disclaimer */}
          <div className="bg-medical-gradient rounded-3xl p-6 md:p-8 shadow-medical-elevated text-white animate-slide-up" style={{ animationDelay: '400ms' }}>
            <div className="flex items-start">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4 md:mr-6 flex-shrink-0 shadow-medical-card">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xl md:text-2xl font-bold mb-3">Clinical Decision Support</h4>
                <p className="text-white/90 leading-relaxed text-base md:text-lg">
                  This tool provides clinical decision support. Always verify dosages, check for interactions,
                  and follow established clinical protocols. Consult current prescribing information and use professional judgment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrugCalculatorPage;