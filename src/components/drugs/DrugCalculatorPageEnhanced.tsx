import React, { useState, useEffect } from 'react';
import { Drug, PatientParameters, DoseCalculationResult } from '../../types';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';
import NavigationButtons from '../shared/NavigationButtons';
import VerificationBadge from '../shared/VerificationBadge';
import DataQualityIndicator from '../shared/DataQualityIndicator';
import { useToast } from '../shared/ToastContainer';
import { useMedicalContent } from '../../hooks/useMedicalContent';
import { useContentVerification } from '../../hooks/useContentVerification';

interface DrugCalculatorPageEnhancedProps {
  doctorProfile: { name: string; email: string; specialization: string; licenseNumber: string } | null;
  onNavigate?: (page: string) => void;
}

const DrugCalculatorPageEnhanced: React.FC<DrugCalculatorPageEnhancedProps> = ({ doctorProfile, onNavigate }) => {
  // Use medical content hook for data access
  const {
    drugs,
    isLoading: isMedicalDataLoading,
    syncStatus,
    error: medicalDataError,
    refreshData,
    dataQualityScore
  } = useMedicalContent();

  // Use content verification hook
  const {
    validateDrug,
    validatePatient,
    validateDrugPatient,
    lastValidation,
    criticalAlerts,
    hasCriticalAlerts,
    getValidationSummary
  } = useContentVerification();

  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [drugValidation, setDrugValidation] = useState<any>(null);
  const [patientParams, setPatientParams] = useState<PatientParameters>({
    age: 30,
    weight: 70,
    conditions: [],
    allergies: [],
    gender: 'male'
  });
  const [patientValidation, setPatientValidation] = useState<any>(null);
  const [calculationResult, setCalculationResult] = useState<DoseCalculationResult | null>(null);
  const { showSuccess, showError, showWarning } = useToast();

  // Validate patient parameters whenever they change
  useEffect(() => {
    const validation = validatePatient(patientParams);
    setPatientValidation(validation);
    
    // Show critical alerts
    if (validation.clinicalAlerts.some(alert => alert.severity === 'critical')) {
      const criticalAlert = validation.clinicalAlerts.find(alert => alert.severity === 'critical');
      if (criticalAlert) {
        showWarning(`⚠️ ${criticalAlert.message}: ${criticalAlert.action}`);
      }
    }
  }, [patientParams, validatePatient, showWarning]);

  // Validate drug when selected
  useEffect(() => {
    if (selectedDrug) {
      const validation = validateDrug(selectedDrug);
      setDrugValidation(validation);
      
      if (!validation.isValid) {
        showWarning(`Drug data has ${validation.errors.length} validation issue(s)`);
      }
    }
  }, [selectedDrug, validateDrug, showWarning]);

  const calculateDose = () => {
    if (!selectedDrug) {
      showError('Please select a drug first');
      return;
    }

    // Validate drug-patient combination
    const combinationValidation = validateDrugPatient(selectedDrug, patientParams);
    
    // Check for critical contraindications
    const criticalIssues = combinationValidation.clinicalAlerts.filter(
      alert => alert.severity === 'critical'
    );

    if (criticalIssues.length > 0) {
      showError(`CRITICAL: ${criticalIssues[0].message} - ${criticalIssues[0].action}`);
      return;
    }

    // Calculate dose based on patient parameters
    const adultDose = selectedDrug.dosage.adults;
    const pediatricDose = selectedDrug.dosage.pediatrics;
    
    // Use pediatric dosing for patients under 18
    const dosageInfo = patientParams.age < 18 ? pediatricDose : adultDose;

    const result: DoseCalculationResult = {
      drugName: selectedDrug.name,
      dosage: dosageInfo.dose,
      frequency: dosageInfo.regimen,
      duration: '7-10 days',
      totalQuantity: dosageInfo.max_daily,
      clinicalNotes: [
        `Class: ${selectedDrug.class}`,
        `Route: ${selectedDrug.administration.route}`,
        `Instructions: ${selectedDrug.administration.instructions}`,
        `Bioavailability: ${selectedDrug.administration.bioavailability}`
      ],
      warnings: [],
      contraindications: selectedDrug.contraindications,
      adjustments: {}
    };

    // Add warnings from validation
    combinationValidation.warnings.forEach(warning => {
      result.warnings.push({
        level: 'moderate',
        message: warning.message,
        recommendation: warning.recommendation
      });
    });

    // Add clinical alerts as warnings
    combinationValidation.clinicalAlerts.forEach(alert => {
      result.warnings.push({
        level: alert.severity === 'major' ? 'major' : 'moderate',
        message: alert.message,
        recommendation: alert.action
      });
    });

    // Check for renal/hepatic adjustments
    if (patientParams.conditions.some(c => c.toLowerCase().includes('kidney') || c.toLowerCase().includes('renal'))) {
      if (selectedDrug.renal_adjustment && selectedDrug.renal_adjustment.length > 0) {
        result.adjustments.renal = selectedDrug.renal_adjustment[0].adjustment;
        result.clinicalNotes.push(`⚠️ Renal adjustment required: ${selectedDrug.renal_adjustment[0].adjustment}`);
      }
    }

    if (patientParams.conditions.some(c => c.toLowerCase().includes('liver') || c.toLowerCase().includes('hepatic'))) {
      if (selectedDrug.hepatic_adjustment && selectedDrug.hepatic_adjustment.length > 0) {
        result.adjustments.hepatic = selectedDrug.hepatic_adjustment[0].adjustment;
        result.clinicalNotes.push(`⚠️ Hepatic adjustment required: ${selectedDrug.hepatic_adjustment[0].adjustment}`);
      }
    }

    setCalculationResult(result);
    showSuccess('Dose calculated successfully with clinical validation');
  };

  const commonConditions = [
    'Hypertension', 'Diabetes', 'Asthma', 'Heart Disease', 'Kidney Disease', 'Liver Disease'
  ];

  const commonAllergies = [
    'Penicillin', 'Sulfa', 'Codeine', 'Latex', 'Iodine', 'Aspirin'
  ];

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Buttons */}
        <NavigationButtons 
          onNavigateHome={() => onNavigate?.('dashboard')}
          onNavigateBack={() => window.history.back()}
        />

        {/* Header with Data Quality */}
        <div className="bg-medical-gradient rounded-2xl p-8 text-white shadow-medical-hover">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mr-6 shadow-medical">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-3">Drug Calculator</h1>
                <p className="text-white text-opacity-90 text-lg">Calculate precise drug dosages with real-time verification</p>
              </div>
            </div>
            <button
              onClick={refreshData}
              disabled={isMedicalDataLoading}
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all duration-200 flex items-center"
            >
              <svg className={`w-5 h-5 mr-2 ${isMedicalDataLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </button>
          </div>
        </div>

        {/* Data Quality Indicator */}
        <DataQualityIndicator syncStatus={syncStatus} showDetails={true} />

        {medicalDataError && (
          <div className="bg-error-50 border border-error-200 rounded-xl p-4 text-error-700">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {medicalDataError}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient Information with Validation */}
          <CompactBox title="Patient Information" defaultExpanded={true}>
            <div className="space-y-4">
              {/* Validation Badge */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-700">Patient Validation:</span>
                <VerificationBadge validation={patientValidation} showDetails={false} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={patientParams.age}
                    onChange={(e) => setPatientParams({...patientParams, age: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 shadow-medical-card"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={patientParams.weight}
                    onChange={(e) => setPatientParams({...patientParams, weight: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 shadow-medical-card"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={patientParams.gender}
                  onChange={(e) => setPatientParams({...patientParams, gender: e.target.value as 'male' | 'female'})}
                  className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 shadow-medical-card"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medical Conditions</label>
                <div className="grid grid-cols-2 gap-2">
                  {commonConditions.map(condition => (
                    <label key={condition} className="flex items-center">
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
                        className="mr-2"
                      />
                      <span className="text-sm">{condition}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
                <div className="grid grid-cols-2 gap-2">
                  {commonAllergies.map(allergy => (
                    <label key={allergy} className="flex items-center">
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
                        className="mr-2"
                      />
                      <span className="text-sm">{allergy}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Patient Clinical Alerts */}
              {patientValidation && patientValidation.clinicalAlerts.length > 0 && (
                <div className="bg-warning-50 border border-warning-200 rounded-xl p-4">
                  <h5 className="font-medium text-warning-800 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Clinical Alerts
                  </h5>
                  <div className="space-y-2">
                    {patientValidation.clinicalAlerts.map((alert: any, index: number) => (
                      <div key={index} className="text-sm text-warning-700">
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-xs">{alert.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CompactBox>

          {/* Drug Selection with Validation */}
          <CompactBox title="Drug Selection" defaultExpanded={true}>
            {isMedicalDataLoading ? (
              <LoadingSpinner text="Loading drugs..." />
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Drug</label>
                  <select
                    value={selectedDrug?.id || ''}
                    onChange={(e) => {
                      const drug = drugs.find(d => d.id === e.target.value);
                      setSelectedDrug(drug || null);
                    }}
                    className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 shadow-medical-card"
                  >
                    <option value="">Select a drug...</option>
                    {drugs.map(drug => (
                      <option key={drug.id} value={drug.id}>
                        {drug.name} ({drug.class})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDrug && (
                  <div className="bg-secondary-50 rounded-xl p-5 shadow-medical-card">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-gray-900">{selectedDrug.name}</h4>
                      <VerificationBadge validation={drugValidation} />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Class: {selectedDrug.class}</p>
                    <div className="text-sm">
                      <p className="font-medium">Indications:</p>
                      <ul className="list-disc list-inside text-gray-600">
                        {selectedDrug.indications.slice(0, 3).map((indication, index) => (
                          <li key={index}>{indication.description}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <button
                  onClick={calculateDose}
                  disabled={!selectedDrug || hasCriticalAlerts}
                  className="w-full px-6 py-4 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:bg-secondary-300 disabled:cursor-not-allowed transition-all duration-200 shadow-medical hover:shadow-medical-hover transform hover:scale-105"
                >
                  {hasCriticalAlerts ? 'Critical Issues Detected' : 'Calculate Dose'}
                </button>

                {hasCriticalAlerts && (
                  <div className="bg-error-50 border border-error-200 rounded-xl p-4">
                    <p className="text-sm text-error-700 font-medium">
                      ⛔ Cannot calculate dose due to critical safety issues
                    </p>
                  </div>
                )}
              </div>
            )}
          </CompactBox>
        </div>

        {/* Calculation Results with Validation */}
        {calculationResult && (
          <CompactBox title="Calculation Results" defaultExpanded={true}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-success-50 border border-success-200 rounded-xl p-6 shadow-medical-card">
                  <h4 className="font-semibold text-success-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Dosage Information
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Drug:</span> {calculationResult.drugName}</p>
                    <p><span className="font-medium">Dose:</span> {calculationResult.dosage}</p>
                    <p><span className="font-medium">Frequency:</span> {calculationResult.frequency}</p>
                    <p><span className="font-medium">Duration:</span> {calculationResult.duration}</p>
                  </div>
                </div>

                <div className="bg-accent-50 border border-accent-200 rounded-xl p-6 shadow-medical-card">
                  <h4 className="font-semibold text-accent-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Clinical Notes
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {calculationResult.clinicalNotes.map((note, index) => (
                      <li key={index}>• {note}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {calculationResult.warnings.length > 0 && (
                <div className="bg-warning-50 border border-warning-200 rounded-xl p-6 shadow-medical-card">
                  <h4 className="font-semibold text-warning-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Clinical Warnings
                  </h4>
                  <div className="space-y-3">
                    {calculationResult.warnings.map((warning, index) => (
                      <div key={index} className="text-sm text-warning-700">
                        <p className="font-medium">{warning.message}</p>
                        <p className="text-xs mt-1">{warning.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {calculationResult.contraindications.length > 0 && (
                <div className="bg-error-50 border border-error-200 rounded-xl p-6 shadow-medical-card">
                  <h4 className="font-semibold text-error-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Contraindications
                  </h4>
                  <ul className="text-sm text-error-700 space-y-1">
                    {calculationResult.contraindications.map((contra, index) => (
                      <li key={index}>• {contra}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CompactBox>
        )}

        {/* Clinical Disclaimer */}
        <div className="bg-medical-gradient rounded-xl p-6 shadow-medical-card text-white">
          <div className="flex items-start">
            <svg className="h-6 w-6 text-white opacity-90 mt-0.5 mr-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-lg font-semibold mb-2">Clinical Decision Support with Real-Time Verification</h4>
              <p className="text-white text-opacity-90 leading-relaxed">
                This tool provides clinical decision support with real-time medical content verification (Quality Score: {dataQualityScore}%). 
                All calculations are validated against clinical guidelines. Always verify dosages, check for interactions,
                and follow established clinical protocols. Consult current prescribing information and use professional judgment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrugCalculatorPageEnhanced;
