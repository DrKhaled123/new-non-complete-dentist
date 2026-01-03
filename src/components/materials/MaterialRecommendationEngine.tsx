import React, { useState, useEffect } from 'react';
import { Material } from '../../types';
import { materialDataService } from '../../services/materialDataService';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useToast } from '../shared/ToastContainer';

interface MaterialRecommendationEngineProps {
  onMaterialSelect: (material: Material) => void;
  onAddToComparison: (material: Material) => void;
  selectedMaterials: Material[];
}

interface RecommendationCriteria {
  procedureType: string;
  location: 'anterior' | 'posterior' | 'any';
  stressLevel: 'high' | 'moderate' | 'low';
  aestheticRequirement: 'critical' | 'important' | 'minimal';
  patientAge: 'pediatric' | 'adult' | 'geriatric';
  costConstraint: 'budget' | 'moderate' | 'premium';
  longevity: 'short' | 'medium' | 'long';
  contraindications: string[];
}

interface RecommendationResult {
  material: Material;
  score: number;
  reasoning: string[];
  alternatives: string[];
  warnings: string[];
  clinicalScore: number;
  costScore: number;
  longevityScore: number;
}

const MaterialRecommendationEngine: React.FC<MaterialRecommendationEngineProps> = ({
  onMaterialSelect,
  onAddToComparison,
  selectedMaterials,
}) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [criteria, setCriteria] = useState<RecommendationCriteria>({
    procedureType: '',
    location: 'any',
    stressLevel: 'moderate',
    aestheticRequirement: 'important',
    patientAge: 'adult',
    costConstraint: 'moderate',
    longevity: 'medium',
    contraindications: [],
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      const materialsData = await materialDataService.getAllMaterials();
      setMaterials(materialsData);
    } catch (error) {
      showError('Failed to load materials for recommendations');
    }
  };

  const generateRecommendations = async () => {
    if (!criteria.procedureType.trim()) {
      showError('Please specify a procedure type for recommendations');
      return;
    }

    setIsLoading(true);
    try {
      const results = await calculateRecommendations(criteria, materials);
      setRecommendations(results.slice(0, 6)); // Top 6 recommendations
      showSuccess(`Generated ${results.length} material recommendations`);
    } catch (error) {
      showError('Failed to generate recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRecommendations = async (criteria: RecommendationCriteria, materials: Material[]): Promise<RecommendationResult[]> => {
    const results: RecommendationResult[] = [];

    for (const material of materials) {
      const reasoning: string[] = [];
      const alternatives: string[] = [];
      const warnings: string[] = [];
      let score = 0;

      // Procedure-based scoring
      if (material.indications.some(ind => 
        ind.toLowerCase().includes(criteria.procedureType.toLowerCase()) ||
        criteria.procedureType.toLowerCase().includes('crown') && material.name.toLowerCase().includes('crown') ||
        criteria.procedureType.toLowerCase().includes('restoration') && material.category === 'Restorative' ||
        criteria.procedureType.toLowerCase().includes('implant') && material.category === 'Implant'
      )) {
        score += 25;
        reasoning.push(`Suitable for ${criteria.procedureType}`);
      }

      // Location-based scoring
      if (criteria.location === 'anterior') {
        const aesthetics = material.properties.aesthetics?.toLowerCase() || '';
        if (aesthetics.includes('excellent') || aesthetics.includes('good')) {
          score += 20;
          reasoning.push('Excellent aesthetics for anterior use');
        } else {
          score -= 10;
          warnings.push('May not meet anterior aesthetic requirements');
        }
      } else if (criteria.location === 'posterior') {
        const strength = material.properties.strength?.toLowerCase() || '';
        if (strength.includes('high') || strength.includes('very high')) {
          score += 20;
          reasoning.push('High strength suitable for posterior loading');
        } else {
          score -= 15;
          warnings.push('May not withstand posterior occlusal forces');
        }
      }

      // Stress level scoring
      if (criteria.stressLevel === 'high') {
        const strength = material.properties.strength?.toLowerCase() || '';
        if (strength.includes('very high') || strength.includes('high')) {
          score += 15;
          reasoning.push('Handles high stress situations well');
        } else {
          score -= 20;
          warnings.push('May not be suitable for high-stress applications');
        }
      }

      // Aesthetic requirement scoring
      if (criteria.aestheticRequirement === 'critical') {
        const aesthetics = material.properties.aesthetics?.toLowerCase() || '';
        if (aesthetics.includes('excellent')) {
          score += 15;
          reasoning.push('Meets critical aesthetic demands');
        } else if (aesthetics.includes('good')) {
          score += 8;
          alternatives.push('Consider material with better aesthetics for critical cases');
        } else {
          score -= 15;
          warnings.push('May not meet critical aesthetic requirements');
        }
      }

      // Age-based considerations
      if (criteria.patientAge === 'pediatric') {
        if (material.properties.fluoride_release?.toLowerCase().includes('yes')) {
          score += 10;
          reasoning.push('Provides fluoride protection for pediatric patients');
        }
        if (material.category === 'Prosthodontic' && material.name.toLowerCase().includes('crown')) {
          score -= 10;
          warnings.push('Crowns may not be ideal for pediatric patients');
        }
      } else if (criteria.patientAge === 'geriatric') {
        if (material.properties.biocompatibility?.toLowerCase().includes('excellent')) {
          score += 8;
          reasoning.push('Excellent biocompatibility suitable for elderly patients');
        }
      }

      // Cost constraint scoring
      const costConsiderations = material.cost_considerations.toLowerCase();
      switch (criteria.costConstraint) {
        case 'budget':
          if (costConsiderations.includes('low') || costConsiderations.includes('cost-effective')) {
            score += 15;
            reasoning.push('Budget-friendly option');
          } else if (costConsiderations.includes('high') || costConsiderations.includes('very high')) {
            score -= 15;
            warnings.push('May exceed budget constraints');
          }
          break;
        case 'premium':
          if (costConsiderations.includes('high') || costConsiderations.includes('very high')) {
            score += 10;
            reasoning.push('Premium option aligns with cost preference');
          }
          break;
      }

      // Longevity expectation scoring
      const longevity = material.longevity.toLowerCase();
      const durability = material.properties.durability?.toLowerCase() || '';
      
      if (criteria.longevity === 'long') {
        if (longevity.includes('15+') || longevity.includes('20+') || durability.includes('15+')) {
          score += 15;
          reasoning.push('Excellent long-term durability');
        } else if (longevity.includes('10-15')) {
          score += 8;
        }
      } else if (criteria.longevity === 'short') {
        if (longevity.includes('3-5') || longevity.includes('5')) {
          score += 8;
          reasoning.push('Appropriate for shorter-term applications');
        }
      }

      // Biocompatibility bonus
      const biocompatibility = material.properties.biocompatibility?.toLowerCase() || '';
      if (biocompatibility.includes('excellent')) {
        score += 10;
        reasoning.push('Excellent biocompatibility profile');
      } else if (biocompatibility.includes('good')) {
        score += 5;
      }

      // Contraindication checking
      const hasContraindications = criteria.contraindications.some(contra =>
        material.contraindications.some(materialContra =>
          materialContra.toLowerCase().includes(contra.toLowerCase()) ||
          contra.toLowerCase().includes(materialContra.toLowerCase().split(' ')[0])
        )
      );

      if (hasContraindications) {
        score -= 30;
        warnings.push('Has contraindications that may apply to this case');
      }

      // Add category-specific bonuses
      switch (material.category) {
        case 'Restorative':
          if (criteria.procedureType.toLowerCase().includes('restoration')) {
            score += 10;
          }
          break;
        case 'Prosthodontic':
          if (criteria.procedureType.toLowerCase().includes('crown') || 
              criteria.procedureType.toLowerCase().includes('bridge')) {
            score += 10;
          }
          break;
        case 'Implant':
          if (criteria.procedureType.toLowerCase().includes('implant')) {
            score += 15;
          }
          break;
      }

      // Prevent recommendations for already selected materials
      const isAlreadySelected = selectedMaterials.some(selected => selected.id === material.id);
      if (isAlreadySelected) {
        score -= 5; // Small penalty but don't exclude entirely
        reasoning.push('Already selected for comparison');
      }

      // Calculate category scores
      const clinicalScore = calculateCategoryScore(material, 'clinical');
      const costScore = calculateCategoryScore(material, 'cost');
      const longevityScore = calculateCategoryScore(material, 'longevity');

      results.push({
        material,
        score,
        reasoning,
        alternatives,
        warnings,
        clinicalScore,
        costScore,
        longevityScore,
      });
    }

    // Sort by total score
    return results.sort((a, b) => b.score - a.score);
  };

  const calculateCategoryScore = (material: Material, category: 'clinical' | 'cost' | 'longevity'): number => {
    let score = 0;
    
    switch (category) {
      case 'clinical':
        const biocompatibility = material.properties.biocompatibility?.toLowerCase() || '';
        if (biocompatibility.includes('excellent')) score += 3;
        else if (biocompatibility.includes('good')) score += 2;
        else if (biocompatibility.includes('moderate')) score += 1;
        
        if (material.properties.fluoride_release?.toLowerCase().includes('yes')) score += 1;
        break;
        
      case 'cost':
        const costConsiderations = material.cost_considerations.toLowerCase();
        if (costConsiderations.includes('low') || costConsiderations.includes('cost-effective')) score += 3;
        else if (costConsiderations.includes('moderate')) score += 2;
        else if (costConsiderations.includes('high')) score += 1;
        break;
        
      case 'longevity':
        const longevity = material.longevity.toLowerCase();
        if (longevity.includes('20+')) score += 3;
        else if (longevity.includes('15+')) score += 2;
        else if (longevity.includes('10-15')) score += 1;
        break;
    }
    
    return score;
  };

  const handleCriteriaChange = (key: keyof RecommendationCriteria, value: any) => {
    setCriteria(prev => ({ ...prev, [key]: value }));
  };

  const handleContraindicationChange = (contraindication: string, checked: boolean) => {
    setCriteria(prev => ({
      ...prev,
      contraindications: checked
        ? [...prev.contraindications, contraindication]
        : prev.contraindications.filter(c => c !== contraindication)
    }));
  };

  const getScoreColor = (score: number): string => {
    if (score >= 60) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 40) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 20) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const commonContraindications = [
    'Mercury allergy',
    'Resin allergy',
    'Poor oral hygiene',
    'Heavy bruxism',
    'Pregnancy',
    'Metal allergies',
    'Bisphosphonate therapy',
  ];

  return (
    <div className="space-y-4">
      {/* Recommendation Criteria */}
      <CompactBox title="Material Recommendation Engine" defaultExpanded={true}>
        <div className="space-y-4">
          {/* Basic Criteria */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Procedure Type *
              </label>
              <input
                type="text"
                value={criteria.procedureType}
                onChange={(e) => handleCriteriaChange('procedureType', e.target.value)}
                placeholder="e.g., Class II restoration, Crown, Implant..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                value={criteria.location}
                onChange={(e) => handleCriteriaChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="any">Any Location</option>
                <option value="anterior">Anterior</option>
                <option value="posterior">Posterior</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stress Level
              </label>
              <select
                value={criteria.stressLevel}
                onChange={(e) => handleCriteriaChange('stressLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aesthetic Requirement
              </label>
              <select
                value={criteria.aestheticRequirement}
                onChange={(e) => handleCriteriaChange('aestheticRequirement', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="minimal">Minimal</option>
                <option value="important">Important</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient Age
              </label>
              <select
                value={criteria.patientAge}
                onChange={(e) => handleCriteriaChange('patientAge', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="pediatric">Pediatric</option>
                <option value="adult">Adult</option>
                <option value="geriatric">Geriatric</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost Constraint
              </label>
              <select
                value={criteria.costConstraint}
                onChange={(e) => handleCriteriaChange('costConstraint', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="budget">Budget</option>
                <option value="moderate">Moderate</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>
            
            <button
              onClick={generateRecommendations}
              disabled={isLoading || !criteria.procedureType.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Generating...' : 'Generate Recommendations'}
            </button>
          </div>

          {showAdvanced && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Longevity
                  </label>
                  <select
                    value={criteria.longevity}
                    onChange={(e) => handleCriteriaChange('longevity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="short">Short-term (3-5 years)</option>
                    <option value="medium">Medium-term (5-10 years)</option>
                    <option value="long">Long-term (10+ years)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraindications to Consider
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {commonContraindications.map(contra => (
                      <label key={contra} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={criteria.contraindications.includes(contra)}
                          onChange={(e) => handleContraindicationChange(contra, e.target.checked)}
                          className="rounded mr-2"
                        />
                        <span className="text-sm text-gray-700">{contra}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CompactBox>

      {/* Recommendations Results */}
      {recommendations.length > 0 && (
        <CompactBox title={`Material Recommendations (${recommendations.length})`} defaultExpanded={true}>
          <div className="space-y-4">
            {recommendations.map((recommendation, index) => (
              <div
                key={recommendation.material.id}
                className={`border rounded-lg p-4 ${getScoreColor(recommendation.score)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-lg">{recommendation.material.name}</h4>
                      <span className="bg-white bg-opacity-50 px-2 py-1 rounded text-sm">
                        #{index + 1} Recommendation
                      </span>
                      <span className="font-bold text-lg">{recommendation.score.toFixed(0)} pts</span>
                    </div>
                    <p className="text-sm opacity-80 mb-2">{recommendation.material.category}</p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onMaterialSelect(recommendation.material)}
                      className="px-3 py-1 bg-white bg-opacity-80 rounded text-sm hover:bg-opacity-100"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => onAddToComparison(recommendation.material)}
                      className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                    >
                      Add to Compare
                    </button>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                  <div className="text-center">
                    <div className="font-medium">Clinical</div>
                    <div className="flex items-center justify-center space-x-1">
                      <span>{'🏥'}</span>
                      <span>{recommendation.clinicalScore}/5</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Cost</div>
                    <div className="flex items-center justify-center space-x-1">
                      <span>{'💰'}</span>
                      <span>{recommendation.costScore}/5</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Longevity</div>
                    <div className="flex items-center justify-center space-x-1">
                      <span>{'⏰'}</span>
                      <span>{recommendation.longevityScore}/5</span>
                    </div>
                  </div>
                </div>

                {/* Reasoning */}
                {recommendation.reasoning.length > 0 && (
                  <div className="mb-2">
                    <div className="font-medium text-sm mb-1">Why this material is recommended:</div>
                    <ul className="text-sm space-y-1">
                      {recommendation.reasoning.map((reason, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {recommendation.warnings.length > 0 && (
                  <div className="mb-2">
                    <div className="font-medium text-sm mb-1 text-red-700">⚠️ Considerations:</div>
                    <ul className="text-sm space-y-1">
                      {recommendation.warnings.map((warning, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alternatives */}
                {recommendation.alternatives.length > 0 && (
                  <div>
                    <div className="font-medium text-sm mb-1">💡 Alternative considerations:</div>
                    <ul className="text-sm space-y-1">
                      {recommendation.alternatives.map((alternative, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {alternative}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CompactBox>
      )}

      {isLoading && (
        <CompactBox title="Generating Recommendations" defaultExpanded={true}>
          <LoadingSpinner text="Analyzing materials and generating recommendations..." />
        </CompactBox>
      )}
    </div>
  );
};

export default MaterialRecommendationEngine;