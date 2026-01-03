import React from 'react';
import { Procedure } from '../../types';
import CompactBox from '../shared/CompactBox';

interface ProtocolDisplayProps {
  procedure: Procedure | null;
  patientAge?: number;
  onPrintProtocol?: () => void;
}

const ProtocolDisplay: React.FC<ProtocolDisplayProps> = ({
  procedure,
  patientAge,
  onPrintProtocol
}) => {
  if (!procedure) {
    return (
      <CompactBox title="Clinical Protocol" defaultExpanded={true}>
        <div className="text-center py-8 text-gray-500">
          <svg className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Condition</h3>
          <p className="text-gray-600">Choose a condition from the selector to view the clinical protocol</p>
        </div>
      </CompactBox>
    );
  }

  const getCategoryColor = (category: string): string => {
    switch (category.toLowerCase()) {
      case 'emergency':
        return 'border-red-300 bg-red-50';
      case 'endodontic':
        return 'border-purple-300 bg-purple-50';
      case 'oral surgery':
        return 'border-orange-300 bg-orange-50';
      case 'periodontal':
        return 'border-green-300 bg-green-50';
      case 'restorative':
        return 'border-blue-300 bg-blue-50';
      case 'orthodontic':
        return 'border-indigo-300 bg-indigo-50';
      case 'prosthodontic':
        return 'border-pink-300 bg-pink-50';
      case 'pediatric':
        return 'border-yellow-300 bg-yellow-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: string): string => {
    switch (category.toLowerCase()) {
      case 'emergency':
        return '🚨';
      case 'endodontic':
        return '🔬';
      case 'oral surgery':
        return '🔧';
      case 'periodontal':
        return '🦷';
      case 'restorative':
        return '✨';
      case 'orthodontic':
        return '📐';
      case 'prosthodontic':
        return '👑';
      case 'pediatric':
        return '🧒';
      default:
        return '📋';
    }
  };

  const getAgeSpecificNotes = (): string[] => {
    if (!patientAge) return [];
    
    const notes: string[] = [];
    
    if (patientAge < 18) {
      notes.push('Pediatric considerations: Behavior management may be required');
      notes.push('Consider growth and development factors');
      notes.push('Use age-appropriate equipment and techniques');
    } else if (patientAge >= 65) {
      notes.push('Geriatric considerations: May require modified treatment approach');
      notes.push('Consider systemic health implications');
      notes.push('Potential medication interactions');
    }
    
    return notes;
  };

  const estimatedTime = (() => {
    const name = procedure.name.toLowerCase();
    if (name.includes('extraction') || name.includes('implant')) return '45-90 minutes';
    if (name.includes('root canal') || name.includes('rct')) return '60-90 minutes';
    if (name.includes('crown') || name.includes('bridge')) return '45-60 minutes';
    if (name.includes('filling') || name.includes('restoration')) return '30-45 minutes';
    if (name.includes('cleaning') || name.includes('prophylaxis')) return '30-45 minutes';
    return '30-60 minutes';
  })();

  const ageSpecificNotes = getAgeSpecificNotes();

  return (
    <div className="space-y-4">
      {/* Header */}
      <CompactBox 
        title={`${procedure.name} - Clinical Protocol`}
        defaultExpanded={true}
      >
        <div className={`p-4 rounded-lg border-2 ${getCategoryColor(procedure.category)}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">{getCategoryIcon(procedure.category)}</span>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{procedure.name}</h3>
                <p className="text-sm text-gray-600">{procedure.category}</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div>⏱️ Estimated: {estimatedTime}</div>
              {patientAge && <div>👤 Age: {patientAge} years</div>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white bg-opacity-60 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{procedure.differential_diagnosis.length}</div>
              <div className="text-xs text-gray-600">Differential Diagnoses</div>
            </div>
            <div className="text-center p-3 bg-white bg-opacity-60 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{procedure.investigations.length}</div>
              <div className="text-xs text-gray-600">Required Investigations</div>
            </div>
            <div className="text-center p-3 bg-white bg-opacity-60 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{procedure.management_plan.length}</div>
              <div className="text-xs text-gray-600">Management Steps</div>
            </div>
          </div>
        </div>
      </CompactBox>

      {/* Primary Diagnosis */}
      <CompactBox title="Primary Diagnosis" defaultExpanded={true}>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
              📋
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-800 mb-2">Clinical Diagnosis</h4>
              <p className="text-blue-700 text-sm leading-relaxed">{procedure.diagnosis}</p>
            </div>
          </div>
        </div>
      </CompactBox>

      {/* Differential Diagnosis */}
      <CompactBox title="Differential Diagnosis" defaultExpanded={false}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start mb-3">
            <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
              🔍
            </div>
            <div>
              <h4 className="font-semibold text-yellow-800">Alternative Diagnoses to Consider</h4>
              <p className="text-yellow-700 text-xs mt-1">Consider these conditions in the differential diagnosis</p>
            </div>
          </div>
          <div className="space-y-2">
            {procedure.differential_diagnosis.map((diff, index) => (
              <div key={index} className="flex items-start p-2 bg-white bg-opacity-60 rounded">
                <span className="w-5 h-5 bg-yellow-200 text-yellow-800 rounded-full flex items-center justify-center text-xs font-medium mr-2 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-yellow-700 text-sm">{diff}</span>
              </div>
            ))}
          </div>
        </div>
      </CompactBox>

      {/* Required Investigations */}
      <CompactBox title="Required Investigations" defaultExpanded={false}>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start mb-3">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
              🧪
            </div>
            <div>
              <h4 className="font-semibold text-green-800">Diagnostic Tests & Examinations</h4>
              <p className="text-green-700 text-xs mt-1">Essential investigations for accurate diagnosis</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {procedure.investigations.map((investigation, index) => (
              <div key={index} className="flex items-center p-2 bg-white bg-opacity-60 rounded">
                <svg className="w-4 h-4 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-700 text-sm">{investigation}</span>
              </div>
            ))}
          </div>
        </div>
      </CompactBox>

      {/* Evidence & References */}
      <CompactBox title="Evidence & References" defaultExpanded={false}>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start mb-3">
            <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
              📚
            </div>
            <div>
              <h4 className="font-semibold text-purple-800">Clinical Guidelines & Evidence Base</h4>
              <p className="text-purple-700 text-xs mt-1">Supporting evidence and professional guidelines</p>
            </div>
          </div>
          <div className="space-y-2">
            {procedure.references.map((reference, index) => (
              <div key={index} className="p-3 bg-white bg-opacity-60 rounded-lg border-l-4 border-purple-300">
                <p className="text-purple-700 text-sm font-medium">{reference}</p>
              </div>
            ))}
          </div>
        </div>
      </CompactBox>

      {/* Age-Specific Considerations */}
      {ageSpecificNotes.length > 0 && (
        <CompactBox title="Age-Specific Considerations" defaultExpanded={false}>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-start mb-3">
              <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                👤
              </div>
              <div>
                <h4 className="font-semibold text-indigo-800">
                  {patientAge && patientAge < 18 ? 'Pediatric Considerations' : 
                   patientAge && patientAge >= 65 ? 'Geriatric Considerations' : 'Age-Specific Notes'}
                </h4>
                <p className="text-indigo-700 text-xs mt-1">Special considerations for this age group</p>
              </div>
            </div>
            <div className="space-y-2">
              {ageSpecificNotes.map((note, index) => (
                <div key={index} className="flex items-start p-2 bg-white bg-opacity-60 rounded">
                  <svg className="w-4 h-4 text-indigo-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-indigo-700 text-sm">{note}</span>
                </div>
              ))}
            </div>
          </div>
        </CompactBox>
      )}

      {/* Emergency Indicators */}
      {procedure.category === 'Emergency' && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center text-lg font-bold mr-3">
              🚨
            </div>
            <div>
              <h4 className="font-bold text-red-800 text-lg">Emergency Protocol</h4>
              <p className="text-red-700 text-sm">This condition requires immediate attention</p>
            </div>
          </div>
          <div className="bg-white bg-opacity-60 rounded-lg p-3">
            <p className="text-red-800 font-semibold text-sm">
              ⚠️ Priority Level: URGENT - Initiate treatment protocol immediately
            </p>
          </div>
        </div>
      )}

      {/* Print Button */}
      {onPrintProtocol && (
        <div className="flex justify-end">
          <button
            onClick={onPrintProtocol}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Protocol
          </button>
        </div>
      )}
    </div>
  );
};

export default ProtocolDisplay;