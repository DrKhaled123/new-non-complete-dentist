import React, { useState } from 'react';
import { Procedure } from '../../types';
import CompactBox from '../shared/CompactBox';

interface ManagementPlanViewProps {
  procedure: Procedure | null;
  patientAge?: number;
  onSavePlan?: (plan: any) => void;
  onPrintPlan?: () => void;
}

const ManagementPlanView: React.FC<ManagementPlanViewProps> = ({
  procedure,
  patientAge,
  onSavePlan,
  onPrintPlan
}) => {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [selectedApproach, setSelectedApproach] = useState<'standard' | 'alternative'>('standard');

  if (!procedure) {
    return (
      <CompactBox title="Management Plan" defaultExpanded={true}>
        <div className="text-center py-8 text-gray-500">
          <svg className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Management Plan Selected</h3>
          <p className="text-gray-600">Select a condition to view detailed management protocols</p>
        </div>
      </CompactBox>
    );
  }

  const toggleStepCompletion = (stepNumber: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepNumber)) {
      newCompleted.delete(stepNumber);
    } else {
      newCompleted.add(stepNumber);
    }
    setCompletedSteps(newCompleted);
  };

  const getStepDuration = (stepNumber: number): string => {
    // Estimate duration based on step type and procedure
    const name = procedure.name.toLowerCase();
    const totalDuration = (() => {
      if (name.includes('extraction') || name.includes('implant')) return '45-90 minutes';
      if (name.includes('root canal') || name.includes('rct')) return '60-90 minutes';
      if (name.includes('crown') || name.includes('bridge')) return '45-60 minutes';
      if (name.includes('filling') || name.includes('restoration')) return '30-45 minutes';
      return '30-60 minutes';
    })();

    // Distribute time across steps
    const steps = procedure.management_plan.length;
    if (stepNumber === 1) return '10-15 minutes';
    if (stepNumber === steps) return '10-15 minutes';
    return '15-30 minutes';
  };

  const getStepMaterials = (stepTitle: string, stepDescription: string): string[] => {
    const title = stepTitle.toLowerCase();
    const description = stepDescription.toLowerCase();
    
    const materials: string[] = [];
    
    if (title.includes('diagnosis') || description.includes('examination')) {
      materials.push('Dental mirror', 'Explorer', 'Periodontal probe', 'Radiographs');
    }
    
    if (title.includes('anesthesia') || description.includes('anesthetic')) {
      materials.push('Local anesthetic', 'Syringe', 'Needles', 'Topical anesthetic');
    }
    
    if (title.includes('preparation') || description.includes('prepar')) {
      materials.push('High-speed handpiece', 'Low-speed handpiece', 'Burs', 'Water spray');
    }
    
    if (title.includes('restoration') || description.includes('filling')) {
      materials.push('Composite resin', 'Bonding agent', 'Etching gel', 'Curing light');
    }
    
    if (title.includes('extraction') || description.includes('extract')) {
      materials.push('Forceps', 'Elevators', 'Surgical burs', 'Hemostatic agents');
    }
    
    if (title.includes('surgery') || description.includes('surgical')) {
      materials.push('Scalpel', 'Sutures', 'Hemostats', 'Surgical tray');
    }
    
    if (title.includes('impression') || description.includes('impression')) {
      materials.push('Impression material', 'Trays', 'Bite registration', 'Disinfectant');
    }
    
    if (materials.length === 0) {
      materials.push('Standard dental instruments');
    }
    
    return materials;
  };

  const getStepPrecautions = (stepTitle: string, stepDescription: string): string[] => {
    const title = stepTitle.toLowerCase();
    const description = stepDescription.toLowerCase();
    
    const precautions: string[] = [];
    
    if (title.includes('anesthesia') || description.includes('anesthetic')) {
      precautions.push('Check patient allergies');
      precautions.push('Aspirate before injection');
      precautions.push('Monitor vital signs');
    }
    
    if (title.includes('surgery') || description.includes('surgical')) {
      precautions.push('Maintain sterile field');
      precautions.push('Control bleeding');
      precautions.push('Avoid adjacent structures');
    }
    
    if (title.includes('extraction') || description.includes('extract')) {
      precautions.push('Assess root morphology');
      precautions.push('Use appropriate forceps');
      precautions.push('Manage complications');
    }
    
    if (patientAge && patientAge < 18) {
      precautions.push('Use behavior management techniques');
      precautions.push('Consider growth factors');
    }
    
    if (patientAge && patientAge >= 65) {
      precautions.push('Monitor for medication interactions');
      precautions.push('Consider systemic health');
    }
    
    return precautions;
  };

  const getFollowUpSchedule = (): { time: string; activities: string[] }[] => {
    const name = procedure.name.toLowerCase();
    const category = procedure.category.toLowerCase();
    
    if (name.includes('extraction') || name.includes('surgery')) {
      return [
        { time: '24 hours', activities: ['Post-operative check', 'Pain assessment', 'Bleeding control'] },
        { time: '1 week', activities: ['Suture removal', 'Healing assessment', 'Complication check'] },
        { time: '1 month', activities: ['Full healing evaluation', 'Treatment planning'] }
      ];
    }
    
    if (name.includes('root canal') || name.includes('rct')) {
      return [
        { time: '1 week', activities: ['Pain assessment', 'Symptom evaluation'] },
        { time: '1 month', activities: ['Radiographic evaluation', 'Final restoration'] }
      ];
    }
    
    if (name.includes('crown') || name.includes('bridge')) {
      return [
        { time: '1 week', activities: ['Occlusal adjustment', 'Comfort check'] },
        { time: '6 months', activities: ['Regular maintenance', 'Wear assessment'] }
      ];
    }
    
    return [
      { time: '1 month', activities: ['Follow-up evaluation', 'Treatment assessment'] },
      { time: '6 months', activities: ['Regular maintenance', 'Oral health review'] }
    ];
  };

  const getAlternativeApproaches = () => {
    const approaches = [];
    
    if (procedure.name.toLowerCase().includes('caries')) {
      approaches.push({
        name: 'Non-invasive approach',
        description: 'Fluoride varnish, remineralization, and monitoring',
        indications: 'Early lesions, patient preference'
      });
    }
    
    if (procedure.name.toLowerCase().includes('extraction')) {
      approaches.push({
        name: 'Conservative approach',
        description: 'Endodontic treatment with restoration',
        indications: 'Restorable tooth, patient preference'
      });
    }
    
    if (procedure.category.toLowerCase().includes('emergency')) {
      approaches.push({
        name: 'Immediate stabilization',
        description: 'Temporary measures until definitive treatment',
        indications: 'Emergency situations, limited time'
      });
    }
    
    return approaches;
  };

  const completionPercentage = Math.round((completedSteps.size / procedure.management_plan.length) * 100);
  const followUpSchedule = getFollowUpSchedule();
  const alternativeApproaches = getAlternativeApproaches();

  return (
    <div className="space-y-4">
      {/* Header */}
      <CompactBox title="Treatment Management Plan" defaultExpanded={true}>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{procedure.name} - Management Protocol</h3>
              <p className="text-sm text-gray-600">Step-by-step treatment guidance</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{completionPercentage}%</div>
              <div className="text-xs text-gray-600">Complete</div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-2 bg-white bg-opacity-60 rounded">
              <div className="text-lg font-bold text-blue-600">{procedure.management_plan.length}</div>
              <div className="text-xs text-gray-600">Total Steps</div>
            </div>
            <div className="p-2 bg-white bg-opacity-60 rounded">
              <div className="text-lg font-bold text-green-600">{completedSteps.size}</div>
              <div className="text-xs text-gray-600">Completed</div>
            </div>
            <div className="p-2 bg-white bg-opacity-60 rounded">
              <div className="text-lg font-bold text-orange-600">{followUpSchedule.length}</div>
              <div className="text-xs text-gray-600">Follow-ups</div>
            </div>
            <div className="p-2 bg-white bg-opacity-60 rounded">
              <div className="text-lg font-bold text-purple-600">{alternativeApproaches.length}</div>
              <div className="text-xs text-gray-600">Alternatives</div>
            </div>
          </div>
        </div>
      </CompactBox>

      {/* Treatment Steps */}
      <CompactBox title="Treatment Protocol" defaultExpanded={true}>
        <div className="space-y-4">
          {procedure.management_plan.map((step, index) => {
            const stepNumber = step.step;
            const isCompleted = completedSteps.has(stepNumber);
            const duration = getStepDuration(stepNumber);
            const materials = getStepMaterials(step.title, step.description);
            const precautions = getStepPrecautions(step.title, step.description);
            
            return (
              <div 
                key={index}
                className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                  isCompleted 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleStepCompletion(stepNumber)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 transition-colors ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-blue-500 hover:text-white'
                      }`}
                    >
                      {isCompleted ? '✓' : stepNumber}
                    </button>
                    <div>
                      <h4 className={`font-semibold ${isCompleted ? 'text-green-800' : 'text-gray-900'}`}>
                        Step {stepNumber}: {step.title}
                      </h4>
                      <p className={`text-sm ${isCompleted ? 'text-green-700' : 'text-gray-600'}`}>
                        ⏱️ Estimated time: {duration}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="ml-11 space-y-3">
                  <p className={`${isCompleted ? 'text-green-700' : 'text-gray-700'}`}>
                    {step.description}
                  </p>
                  
                  {/* Materials Required */}
                  {materials.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        Materials Required
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {materials.map((material, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {material}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Precautions */}
                  {precautions.length > 0 && (
                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                      <h5 className="font-medium text-yellow-800 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        Precautions
                      </h5>
                      <ul className="text-yellow-700 text-xs space-y-1">
                        {precautions.map((precaution, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="mr-1">•</span>
                            <span>{precaution}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CompactBox>

      {/* Alternative Approaches */}
      {alternativeApproaches.length > 0 && (
        <CompactBox title="Alternative Treatment Approaches" defaultExpanded={false}>
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="approach"
                  value="standard"
                  checked={selectedApproach === 'standard'}
                  onChange={(e) => setSelectedApproach(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Standard Protocol</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="approach"
                  value="alternative"
                  checked={selectedApproach === 'alternative'}
                  onChange={(e) => setSelectedApproach(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Alternative Approach</span>
              </label>
            </div>
            
            {selectedApproach === 'alternative' && (
              <div className="space-y-3">
                {alternativeApproaches.map((approach, index) => (
                  <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h5 className="font-semibold text-orange-800 mb-2">{approach.name}</h5>
                    <p className="text-orange-700 text-sm mb-2">{approach.description}</p>
                    <div className="text-xs text-orange-600">
                      <strong>Indications:</strong> {approach.indications}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CompactBox>
      )}

      {/* Follow-up Schedule */}
      <CompactBox title="Follow-up Schedule" defaultExpanded={false}>
        <div className="space-y-3">
          {followUpSchedule.map((followup, index) => (
            <div key={index} className="flex items-start p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="w-16 text-center mr-4">
                <div className="text-lg font-bold text-indigo-600">{followup.time}</div>
              </div>
              <div className="flex-1">
                <h5 className="font-medium text-indigo-800 mb-1">Follow-up Activities</h5>
                <ul className="text-indigo-700 text-sm space-y-1">
                  {followup.activities.map((activity, idx) => (
                    <li key={idx} className="flex items-start">
                      <svg className="w-3 h-3 mr-2 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span>{activity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </CompactBox>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-end">
        {onSavePlan && (
          <button
            onClick={() => onSavePlan({
              procedure: procedure.name,
              steps: procedure.management_plan,
              completed: Array.from(completedSteps),
              followUpSchedule,
              timestamp: new Date()
            })}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Save Plan
          </button>
        )}
        
        {onPrintPlan && (
          <button
            onClick={onPrintPlan}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Plan
          </button>
        )}
      </div>
    </div>
  );
};

export default ManagementPlanView;