import React, { useState, useEffect } from 'react';
import { Case, Treatment, Dose, Procedure } from '../../types';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useToast } from '../shared/ToastContainer';
import { procedureDataService } from '../../services/procedureDataService';
import { caseService } from '../../services/caseService';

interface PatientCaseFormProps {
  doctorProfile: { name: string; email: string; specialization: string; licenseNumber: string } | null;
  existingCase?: Case | null;
  onSave: (caseData: Partial<Case>) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

interface FormData {
  patientIdentifier: string;
  patientAge: number;
  patientWeight: number;
  gender: 'male' | 'female';
  conditions: string[];
  allergies: string[];
  chiefComplaint: string;
  diagnosis: string;
  treatmentPlan: string;
  clinicalNotes: string;
  selectedProcedures: Procedure[];
  estimatedDuration: string;
  priority: 'low' | 'medium' | 'high';
  caseType: 'routine' | 'urgent' | 'emergency';
}

const PatientCaseForm: React.FC<PatientCaseFormProps> = ({
  doctorProfile,
  existingCase,
  onSave,
  onCancel,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<FormData>({
    patientIdentifier: '',
    patientAge: 30,
    patientWeight: 70,
    gender: 'male',
    conditions: [],
    allergies: [],
    chiefComplaint: '',
    diagnosis: '',
    treatmentPlan: '',
    clinicalNotes: '',
    selectedProcedures: [],
    estimatedDuration: '',
    priority: 'medium',
    caseType: 'routine'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [availableProcedures, setAvailableProcedures] = useState<Procedure[]>([]);
  const [procedureSearch, setProcedureSearch] = useState('');
  const [showProcedureSelector, setShowProcedureSelector] = useState(false);
  const { showSuccess, showError } = useToast();

  const commonConditions = [
    'Hypertension', 'Diabetes Type 2', 'Asthma', 'Heart Disease', 
    'Kidney Disease', 'Liver Disease', 'Arthritis', 'Osteoporosis',
    'Anxiety', 'Depression', 'Thyroid Disease', 'GERD'
  ];

  const commonAllergies = [
    'Penicillin', 'Sulfa drugs', 'Codeine', 'Latex', 'Iodine', 
    'Aspirin', 'NSAIDs', 'Local Anesthetics', 'Metals', 'Latex'
  ];

  useEffect(() => {
    if (existingCase) {
      loadCaseData();
    }
    loadProcedures();
  }, [existingCase]);

  const loadCaseData = () => {
    if (!existingCase) return;

    setFormData({
      patientIdentifier: existingCase.patientIdentifier,
      patientAge: existingCase.patientAge,
      patientWeight: existingCase.patientWeight,
      gender: 'male', // Default, would need to be added to Case type
      conditions: existingCase.conditions,
      allergies: existingCase.allergies,
      chiefComplaint: extractSection(existingCase.clinicalNotes, 'Chief Complaint'),
      diagnosis: extractSection(existingCase.clinicalNotes, 'Diagnosis'),
      treatmentPlan: extractSection(existingCase.clinicalNotes, 'Treatment Plan'),
      clinicalNotes: extractSection(existingCase.clinicalNotes, 'Notes'),
      selectedProcedures: existingCase.selectedTreatments.map(t => ({
        id: t.name.toLowerCase().replace(/\s+/g, '-'),
        name: t.name,
        category: t.type,
        diagnosis: '',
        differential_diagnosis: [],
        investigations: [],
        management_plan: [],
        references: []
      })),
      estimatedDuration: '',
      priority: 'medium',
      caseType: 'routine'
    });
  };

  const loadProcedures = async () => {
    try {
      const procedures = await procedureDataService.getAllProcedures();
      setAvailableProcedures(procedures);
    } catch (error) {
      console.error('Failed to load procedures:', error);
    }
  };

  const extractSection = (notes: string, section: string): string => {
    const regex = new RegExp(`${section}:\\s*([^\\n]+(?:\\n(?!${Object.keys({ChiefComplaint:1, Diagnosis:1, TreatmentPlan:1, Notes:1}).join('|')}).*)*)`, 'i');
    const match = notes.match(regex);
    return match ? match[1].trim() : '';
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayFieldChange = (field: 'conditions' | 'allergies', value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const addProcedure = (procedure: Procedure) => {
    if (!formData.selectedProcedures.find(p => p.id === procedure.id)) {
      setFormData(prev => ({
        ...prev,
        selectedProcedures: [...prev.selectedProcedures, procedure]
      }));
    }
    setShowProcedureSelector(false);
    setProcedureSearch('');
  };

  const removeProcedure = (procedureId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedProcedures: prev.selectedProcedures.filter(p => p.id !== procedureId)
    }));
  };

  const filteredProcedures = availableProcedures.filter(procedure =>
    procedure.name.toLowerCase().includes(procedureSearch.toLowerCase()) ||
    procedure.category.toLowerCase().includes(procedureSearch.toLowerCase())
  );

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.patientIdentifier.trim()) {
      errors.push('Patient identifier is required');
    }

    if (formData.patientAge < 1 || formData.patientAge > 120) {
      errors.push('Patient age must be between 1 and 120 years');
    }

    if (formData.patientWeight < 1 || formData.patientWeight > 300) {
      errors.push('Patient weight must be between 1 and 300 kg');
    }

    if (!formData.chiefComplaint.trim()) {
      errors.push('Chief complaint is required');
    }

    if (!formData.diagnosis.trim()) {
      errors.push('Diagnosis is required');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!doctorProfile) {
      showError('Doctor profile not found');
      return;
    }

    const errors = validateForm();
    if (errors.length > 0) {
      showError(errors.join(', '));
      return;
    }

    try {
      setIsLoading(true);

      // Prepare case data
      const caseData: Partial<Case> = {
        patientIdentifier: formData.patientIdentifier,
        patientAge: formData.patientAge,
        patientWeight: formData.patientWeight,
        conditions: formData.conditions,
        allergies: formData.allergies,
        clinicalNotes: `
Chief Complaint: ${formData.chiefComplaint}
Diagnosis: ${formData.diagnosis}
Treatment Plan: ${formData.treatmentPlan}
Notes: ${formData.clinicalNotes}
        `.trim(),
        selectedTreatments: formData.selectedProcedures.map(procedure => ({
          type: 'procedure',
          name: procedure.name,
          details: {
            category: procedure.category,
            diagnosis: procedure.diagnosis,
            estimatedDuration: formData.estimatedDuration,
            priority: formData.priority,
            caseType: formData.caseType
          }
        })),
        calculatedDoses: [],
        followUpNotes: existingCase?.followUpNotes || []
      };

      if (isEditing && existingCase) {
        await caseService.updateCase(existingCase.id, caseData);
        showSuccess('Case updated successfully');
      } else {
        await caseService.saveCase(caseData as Omit<Case, 'id' | 'createdAt' | 'updatedAt'>);
        showSuccess('Case created successfully');
      }

      await onSave(caseData);
    } catch (error) {
      console.error('Failed to save case:', error);
      showError(isEditing ? 'Failed to update case' : 'Failed to create case');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {isEditing ? 'Edit Patient Case' : 'New Patient Case'}
            </h2>
            <p className="text-blue-100">
              {isEditing ? 'Update case information and treatment plan' : 'Create a comprehensive patient case with treatment planning'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100">Doctor</div>
            <div className="font-medium">{doctorProfile?.name}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Demographics */}
        <CompactBox title="Patient Demographics" defaultExpanded={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient Identifier *
              </label>
              <input
                type="text"
                required
                value={formData.patientIdentifier}
                onChange={(e) => handleInputChange('patientIdentifier', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Patient ID or initials"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age *
              </label>
              <input
                type="number"
                required
                min="1"
                max="120"
                value={formData.patientAge}
                onChange={(e) => handleInputChange('patientAge', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (kg) *
              </label>
              <input
                type="number"
                required
                min="1"
                max="300"
                value={formData.patientWeight}
                onChange={(e) => handleInputChange('patientWeight', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Case Type
              </label>
              <select
                value={formData.caseType}
                onChange={(e) => handleInputChange('caseType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </CompactBox>

        {/* Chief Complaint and Diagnosis */}
        <CompactBox title="Clinical Information" defaultExpanded={true}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chief Complaint *
              </label>
              <textarea
                required
                value={formData.chiefComplaint}
                onChange={(e) => handleInputChange('chiefComplaint', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Patient's main concern or reason for visit"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diagnosis *
              </label>
              <textarea
                required
                value={formData.diagnosis}
                onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Primary diagnosis and differential diagnosis"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Treatment Plan
              </label>
              <textarea
                value={formData.treatmentPlan}
                onChange={(e) => handleInputChange('treatmentPlan', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Detailed treatment approach and timeline"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clinical Notes
              </label>
              <textarea
                value={formData.clinicalNotes}
                onChange={(e) => handleInputChange('clinicalNotes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional clinical observations, patient history, etc."
              />
            </div>
          </div>
        </CompactBox>

        {/* Medical History */}
        <CompactBox title="Medical History" defaultExpanded={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical Conditions
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {commonConditions.map(condition => (
                  <label key={condition} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={formData.conditions.includes(condition)}
                      onChange={(e) => handleArrayFieldChange('conditions', condition, e.target.checked)}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {condition}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allergies
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {commonAllergies.map(allergy => (
                  <label key={allergy} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={formData.allergies.includes(allergy)}
                      onChange={(e) => handleArrayFieldChange('allergies', allergy, e.target.checked)}
                      className="mr-2 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    {allergy}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CompactBox>

        {/* Selected Procedures */}
        <CompactBox title="Selected Procedures" defaultExpanded={true}>
          <div className="space-y-4">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowProcedureSelector(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                + Add Procedure
              </button>
              <div className="flex-1">
                <input
                  type="text"
                  value={formData.estimatedDuration}
                  onChange={(e) => handleInputChange('estimatedDuration', e.target.value)}
                  placeholder="Estimated treatment duration"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {formData.selectedProcedures.length > 0 ? (
              <div className="space-y-3">
                {formData.selectedProcedures.map((procedure, index) => (
                  <div key={procedure.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{procedure.name}</h4>
                        <p className="text-sm text-gray-600">{procedure.category}</p>
                        {procedure.diagnosis && (
                          <p className="text-sm text-gray-500 mt-1">{procedure.diagnosis}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProcedure(procedure.id)}
                        className="text-red-600 hover:text-red-800 ml-4"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No procedures selected yet
              </div>
            )}
          </div>

          {/* Procedure Selector Modal */}
          {showProcedureSelector && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Select Procedure</h3>
                  <button
                    onClick={() => setShowProcedureSelector(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-4">
                  <input
                    type="text"
                    value={procedureSearch}
                    onChange={(e) => setProcedureSearch(e.target.value)}
                    placeholder="Search procedures..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  {filteredProcedures.map(procedure => (
                    <div
                      key={procedure.id}
                      onClick={() => addProcedure(procedure)}
                      className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                    >
                      <h4 className="font-medium text-gray-900">{procedure.name}</h4>
                      <p className="text-sm text-gray-600">{procedure.category}</p>
                      <p className="text-sm text-gray-500 mt-1">{procedure.diagnosis}</p>
                    </div>
                  ))}
                </div>

                {filteredProcedures.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No procedures found matching your search
                  </div>
                )}
              </div>
            </div>
          )}
        </CompactBox>

        {/* Form Actions */}
        <div className="flex space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="sm" className="mr-2" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </div>
            ) : (
              isEditing ? 'Update Case' : 'Create Case'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientCaseForm;