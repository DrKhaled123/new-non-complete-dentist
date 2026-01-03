import React, { useState, useEffect } from 'react';
import { procedureDataService } from '../../services/procedureDataService';
import { Procedure } from '../../types';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useToast } from '../shared/ToastContainer';

interface ProcedureServiceProps {
  selectedProcedure: Procedure | null;
  onProcedureSelect: (procedure: Procedure) => void;
  patientAge?: number;
  onServiceRecommendation?: (services: string[]) => void;
}

interface RelatedProcedure extends Procedure {
  relevanceScore: number;
  relationship: string;
}

const ProcedureService: React.FC<ProcedureServiceProps> = ({
  selectedProcedure,
  onProcedureSelect,
  patientAge,
  onServiceRecommendation
}) => {
  const [relatedProcedures, setRelatedProcedures] = useState<RelatedProcedure[]>([]);
  const [followUpTreatments, setFollowUpTreatments] = useState<RelatedProcedure[]>([]);
  const [preventiveServices, setPreventiveServices] = useState<RelatedProcedure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'related' | 'followup' | 'preventive'>('related');
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (selectedProcedure) {
      loadRelatedProcedures();
    } else {
      clearProcedures();
    }
  }, [selectedProcedure]);

  const clearProcedures = () => {
    setRelatedProcedures([]);
    setFollowUpTreatments([]);
    setPreventiveServices([]);
  };

  const loadRelatedProcedures = async () => {
    if (!selectedProcedure) return;

    try {
      setIsLoading(true);

      // Load related procedures from the service
      const related = await procedureDataService.getRelatedProcedures(selectedProcedure.id);
      
      // Enhance with relevance scoring and relationship type
      const enhancedRelated: RelatedProcedure[] = related.map(proc => ({
        ...proc,
        relevanceScore: calculateRelevanceScore(selectedProcedure, proc),
        relationship: determineRelationship(selectedProcedure, proc)
      })).sort((a, b) => b.relevanceScore - a.relevanceScore);

      setRelatedProcedures(enhancedRelated);

      // Load follow-up treatments
      const followUps = await getFollowUpTreatments(selectedProcedure);
      setFollowUpTreatments(followUps);

      // Load preventive services
      const preventives = await getPreventiveServices(selectedProcedure);
      setPreventiveServices(preventives);

    } catch (error) {
      showError('Failed to load related procedures');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRelevanceScore = (main: Procedure, related: Procedure): number => {
    let score = 0;

    // Same category gets high score
    if (main.category === related.category) {
      score += 30;
    }

    // Common diagnosis keywords
    const mainKeywords = extractKeywords(main.diagnosis);
    const relatedKeywords = extractKeywords(related.diagnosis);
    const commonKeywords = mainKeywords.filter(keyword => 
      relatedKeywords.includes(keyword)
    );
    score += commonKeywords.length * 10;

    // Common differential diagnosis
    const commonDifferential = related.differential_diagnosis.filter(diff =>
      main.differential_diagnosis.some(mainDiff =>
        mainDiff.toLowerCase().includes(diff.toLowerCase()) ||
        diff.toLowerCase().includes(mainDiff.toLowerCase())
      )
    );
    score += commonDifferential.length * 5;

    // Common investigation types
    const commonInvestigations = related.investigations.filter(inv =>
      main.investigations.some(mainInv =>
        mainInv.toLowerCase().includes(inv.toLowerCase()) ||
        inv.toLowerCase().includes(mainInv.toLowerCase())
      )
    );
    score += commonInvestigations.length * 3;

    return score;
  };

  const determineRelationship = (main: Procedure, related: Procedure): string => {
    const mainName = main.name.toLowerCase();
    const relatedName = related.name.toLowerCase();

    if (main.category === related.category) {
      if (mainName.includes('extraction') && relatedName.includes('implant')) {
        return 'Replacement therapy';
      }
      if (mainName.includes('root canal') && (relatedName.includes('crown') || relatedName.includes('restoration'))) {
        return 'Restorative follow-up';
      }
      if (mainName.includes('periodontal') && relatedName.includes('maintenance')) {
        return 'Maintenance therapy';
      }
      return 'Same specialty';
    }

    if (related.category === 'Emergency' && main.category !== 'Emergency') {
      return 'Emergency consideration';
    }

    if (related.category === 'Preventive' || related.category === 'Pediatric') {
      return 'Preventive care';
    }

    return 'Related treatment';
  };

  const extractKeywords = (text: string): string[] => {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 10);
  };

  const getFollowUpTreatments = async (procedure: Procedure): Promise<RelatedProcedure[]> => {
    const allProcedures = await procedureDataService.loadProcedures();
    const name = procedure.name.toLowerCase();
    
    const followUps: RelatedProcedure[] = [];

    if (name.includes('extraction') || name.includes('surgery')) {
      const followUp = allProcedures.find(p => 
        p.name.toLowerCase().includes('post-operative') || 
        p.name.toLowerCase().includes('follow-up')
      );
      if (followUp) {
        followUps.push({
          ...followUp,
          relevanceScore: 100,
          relationship: 'Post-operative care'
        });
      }
    }

    if (name.includes('root canal') || name.includes('rct')) {
      const crown = allProcedures.find(p => 
        p.name.toLowerCase().includes('crown') || p.name.toLowerCase().includes('bridge')
      );
      if (crown) {
        followUps.push({
          ...crown,
          relevanceScore: 95,
          relationship: 'Restorative completion'
        });
      }
    }

    if (name.includes('periodontal')) {
      const maintenance = allProcedures.find(p => 
        p.name.toLowerCase().includes('maintenance') || 
        p.name.toLowerCase().includes('cleaning')
      );
      if (maintenance) {
        followUps.push({
          ...maintenance,
          relevanceScore: 90,
          relationship: 'Maintenance therapy'
        });
      }
    }

    return followUps;
  };

  const getPreventiveServices = async (procedure: Procedure): Promise<RelatedProcedure[]> => {
    const allProcedures = await procedureDataService.loadProcedures();
    
    return allProcedures
      .filter(p => 
        p.category === 'Preventive' || 
        p.name.toLowerCase().includes('sealant') ||
        p.name.toLowerCase().includes('fluoride') ||
        p.name.toLowerCase().includes('prophylaxis')
      )
      .slice(0, 3)
      .map(proc => ({
        ...proc,
        relevanceScore: 80,
        relationship: 'Preventive care'
      }));
  };

  const getRelevanceColor = (score: number): string => {
    if (score >= 80) return 'border-green-300 bg-green-50';
    if (score >= 60) return 'border-blue-300 bg-blue-50';
    if (score >= 40) return 'border-yellow-300 bg-yellow-50';
    return 'border-gray-300 bg-gray-50';
  };

  const getRelevanceIcon = (score: number): string => {
    if (score >= 80) return '🎯';
    if (score >= 60) return '⭐';
    if (score >= 40) return '👍';
    return '📋';
  };

  const getTabCount = (tab: 'related' | 'followup' | 'preventive'): number => {
    switch (tab) {
      case 'related': return relatedProcedures.length;
      case 'followup': return followUpTreatments.length;
      case 'preventive': return preventiveServices.length;
      default: return 0;
    }
  };

  const handleProcedureSelect = (procedure: Procedure) => {
    onProcedureSelect(procedure);
    showSuccess(`Selected related procedure: ${procedure.name}`);
  };

  const handleGenerateRecommendations = () => {
    const recommendations: string[] = [];
    
    if (selectedProcedure) {
      recommendations.push(`Primary: ${selectedProcedure.name}`);
    }
    
    relatedProcedures.slice(0, 3).forEach(proc => {
      recommendations.push(`Related: ${proc.name}`);
    });
    
    followUpTreatments.forEach(proc => {
      recommendations.push(`Follow-up: ${proc.name}`);
    });
    
    if (onServiceRecommendation) {
      onServiceRecommendation(recommendations);
    }
    
    showSuccess('Service recommendations generated');
  };

  const currentProcedures = activeTab === 'related' ? relatedProcedures : 
                           activeTab === 'followup' ? followUpTreatments : 
                           preventiveServices;

  if (!selectedProcedure) {
    return (
      <CompactBox title="Procedure Services & Recommendations" defaultExpanded={true}>
        <div className="text-center py-8 text-gray-500">
          <svg className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Primary Procedure Selected</h3>
          <p className="text-gray-600">Select a primary procedure to view related services and recommendations</p>
        </div>
      </CompactBox>
    );
  }

  return (
    <CompactBox title="Procedure Services & Recommendations" defaultExpanded={true}>
      <div className="space-y-4">
        {/* Current Selection */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-blue-800">Primary Procedure</h4>
              <p className="text-blue-700">{selectedProcedure.name}</p>
              <p className="text-blue-600 text-sm">{selectedProcedure.category}</p>
            </div>
            <div className="text-right text-sm text-blue-600">
              <div>{selectedProcedure.management_plan.length} steps</div>
              <div>{selectedProcedure.investigations.length} investigations</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { key: 'related', label: 'Related Procedures', count: getTabCount('related') },
              { key: 'followup', label: 'Follow-up Treatments', count: getTabCount('followup') },
              { key: 'preventive', label: 'Preventive Services', count: getTabCount('preventive') }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingSpinner text="Loading related procedures..." />
        ) : (
          <div className="space-y-3">
            {currentProcedures.length > 0 ? (
              currentProcedures.map((procedure) => (
                <button
                  key={procedure.id}
                  onClick={() => handleProcedureSelect(procedure)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${getRelevanceColor(procedure.relevanceScore)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">{getRelevanceIcon(procedure.relevanceScore)}</span>
                        <h4 className="font-semibold text-gray-900">{procedure.name}</h4>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Relationship: </span>
                        {procedure.relationship}
                      </p>
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span className="px-2 py-1 bg-white bg-opacity-60 rounded-full">
                          {procedure.category}
                        </span>
                        <span className="px-2 py-1 bg-white bg-opacity-60 rounded-full">
                          Relevance: {procedure.relevanceScore}%
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {procedure.diagnosis}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p>No {activeTab === 'related' ? 'related procedures' : 
                      activeTab === 'followup' ? 'follow-up treatments' : 
                      'preventive services'} found</p>
              </div>
            )}
          </div>
        )}

        {/* Age-Specific Recommendations */}
        {patientAge && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-800 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Age-Specific Recommendations
            </h4>
            <div className="text-sm text-purple-700">
              {patientAge < 18 ? (
                <div>
                  <p className="font-medium">Pediatric Considerations:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Behavior management techniques may be required</li>
                    <li>Consider growth and development factors</li>
                    <li>Use age-appropriate equipment and techniques</li>
                    <li>Parent/guardian involvement in treatment planning</li>
                  </ul>
                </div>
              ) : patientAge >= 65 ? (
                <div>
                  <p className="font-medium">Geriatric Considerations:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Review current medications for interactions</li>
                    <li>Consider systemic health implications</li>
                    <li>May require modified treatment approach</li>
                    <li>Increased attention to healing and recovery</li>
                  </ul>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Adult Considerations:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Standard adult protocols apply</li>
                    <li>Consider work schedule for treatment planning</li>
                    <li>Preventive care maintenance important</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-end">
          <button
            onClick={handleGenerateRecommendations}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Generate Recommendations
          </button>
        </div>
      </div>
    </CompactBox>
  );
};

export default ProcedureService;