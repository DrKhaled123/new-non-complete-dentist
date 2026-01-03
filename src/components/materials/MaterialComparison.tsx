import React, { useState, useEffect } from 'react';
import { Material } from '../../types';
import { materialDataService } from '../../services/materialDataService';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useToast } from '../shared/ToastContainer';

interface MaterialComparisonProps {
  materials: Material[];
  onRemoveMaterial: (material: Material) => void;
  onAddMaterial: () => void;
  isLoading?: boolean;
}

interface ComparisonProperty {
  key: string;
  label: string;
  category: 'physical' | 'biological' | 'clinical' | 'optical';
  values: {
    materialId: string;
    value: string | string[];
    score: number;
    color: string;
  }[];
}

interface MaterialScore {
  materialId: string;
  materialName: string;
  totalScore: number;
  categoryScores: {
    physical: number;
    biological: number;
    clinical: number;
    optical: number;
  };
  overallRating: 'excellent' | 'good' | 'moderate' | 'poor';
}

const MaterialComparison: React.FC<MaterialComparisonProps> = ({
  materials,
  onRemoveMaterial,
  onAddMaterial,
  isLoading = false,
}) => {
  const [comparisonData, setComparisonData] = useState<ComparisonProperty[]>([]);
  const [materialScores, setMaterialScores] = useState<MaterialScore[]>([]);
  const [sortBy, setSortBy] = useState<'total' | 'physical' | 'biological' | 'clinical' | 'optical'>('total');
  const [showScores, setShowScores] = useState(true);
  const [activeTab, setActiveTab] = useState<'properties' | 'indications' | 'scores'>('properties');
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (materials.length > 0) {
      generateComparisonData();
    }
  }, [materials]);

  const generateComparisonData = () => {
    // Collect all unique properties from all materials
    const allProperties = new Set<string>();
    materials.forEach(material => {
      Object.keys(material.properties).forEach(prop => allProperties.add(prop));
    });

    // Add standard comparison fields
    allProperties.add('category');
    allProperties.add('longevity');
    allProperties.add('cost_considerations');

    // Create comparison data
    const comparison: ComparisonProperty[] = [];
    
    allProperties.forEach(property => {
      const values = materials.map(material => {
        const value = getPropertyValue(material, property);
        const score = calculatePropertyScore(property, value);
        const color = getScoreColor(score);
        
        return {
          materialId: material.id,
          value,
          score,
          color,
        };
      });

      const category = getPropertyCategory(property);
      const label = formatPropertyName(property);
      
      comparison.push({
        key: property,
        label,
        category,
        values,
      });
    });

    // Sort by category and importance
    comparison.sort((a, b) => {
      const categoryOrder = { physical: 1, biological: 2, clinical: 3, optical: 4 };
      if (categoryOrder[a.category] !== categoryOrder[b.category]) {
        return categoryOrder[a.category] - categoryOrder[b.category];
      }
      
      // Prioritize important properties
      const priorityProps = ['strength', 'aesthetics', 'durability', 'biocompatibility'];
      const aPriority = priorityProps.indexOf(a.key);
      const bPriority = priorityProps.indexOf(b.key);
      if (aPriority !== -1 && bPriority !== -1) {
        return aPriority - bPriority;
      }
      if (aPriority !== -1) return -1;
      if (bPriority !== -1) return 1;
      
      return a.label.localeCompare(b.label);
    });

    setComparisonData(comparison);
    generateMaterialScores(comparison);
  };

  const generateMaterialScores = (comparisonData: ComparisonProperty[]) => {
    const scores: MaterialScore[] = materials.map(material => {
      let totalScore = 0;
      const categoryTotals = { physical: 0, biological: 0, clinical: 0, optical: 0 };
      const categoryCounts = { physical: 0, biological: 0, clinical: 0, optical: 0 };

      comparisonData.forEach(prop => {
        const materialValue = prop.values.find(v => v.materialId === material.id);
        if (materialValue) {
          totalScore += materialValue.score;
          categoryTotals[prop.category] += materialValue.score;
          categoryCounts[prop.category]++;
        }
      });

      const categoryScores = {
        physical: categoryCounts.physical > 0 ? categoryTotals.physical / categoryCounts.physical : 0,
        biological: categoryCounts.biological > 0 ? categoryTotals.biological / categoryCounts.biological : 0,
        clinical: categoryCounts.clinical > 0 ? categoryTotals.clinical / categoryCounts.clinical : 0,
        optical: categoryCounts.optical > 0 ? categoryTotals.optical / categoryCounts.optical : 0,
      };

      const averageScore = totalScore / comparisonData.length;
      const overallRating = getOverallRating(averageScore);

      return {
        materialId: material.id,
        materialName: material.name,
        totalScore: averageScore,
        categoryScores,
        overallRating,
      };
    });

    // Sort by selected criteria
    scores.sort((a, b) => {
      if (sortBy === 'total') {
        return b.totalScore - a.totalScore;
      }
      return b.categoryScores[sortBy] - a.categoryScores[sortBy];
    });

    setMaterialScores(scores);
  };

  const getPropertyValue = (material: Material, property: string): string | string[] => {
    switch (property) {
      case 'category':
        return material.category;
      case 'longevity':
        return material.longevity;
      case 'cost_considerations':
        return material.cost_considerations;
      default:
        return material.properties[property] || 'N/A';
    }
  };

  const calculatePropertyScore = (property: string, value: string | string[]): number => {
    if (!value || value === 'N/A') return 0;
    
    const valueStr = Array.isArray(value) ? value.join(', ') : value.toLowerCase();
    
    // Scoring based on property type and value
    switch (property.toLowerCase()) {
      case 'strength':
        if (valueStr.includes('very high')) return 4;
        if (valueStr.includes('high')) return 3;
        if (valueStr.includes('moderate')) return 2;
        if (valueStr.includes('low')) return 1;
        break;
      case 'aesthetics':
        if (valueStr.includes('excellent')) return 4;
        if (valueStr.includes('good')) return 3;
        if (valueStr.includes('fair')) return 2;
        if (valueStr.includes('poor')) return 1;
        break;
      case 'durability':
      case 'longevity':
        if (valueStr.includes('20+') || valueStr.includes('15+')) return 4;
        if (valueStr.includes('10-15')) return 3;
        if (valueStr.includes('5-10')) return 2;
        if (valueStr.includes('3-5')) return 1;
        break;
      case 'biocompatibility':
        if (valueStr.includes('excellent')) return 4;
        if (valueStr.includes('good')) return 3;
        if (valueStr.includes('moderate')) return 2;
        break;
      case 'wear_resistance':
        if (valueStr.includes('excellent')) return 4;
        if (valueStr.includes('high') || valueStr.includes('good')) return 3;
        if (valueStr.includes('moderate')) return 2;
        if (valueStr.includes('poor') || valueStr.includes('low')) return 1;
        break;
      case 'fluoride_release':
        if (valueStr.includes('yes')) return 3; // Beneficial property
        return 1;
      default:
        // Generic scoring based on positive descriptors
        if (valueStr.includes('excellent')) return 4;
        if (valueStr.includes('good') || valueStr.includes('high')) return 3;
        if (valueStr.includes('moderate') || valueStr.includes('fair')) return 2;
        if (valueStr.includes('poor') || valueStr.includes('low')) return 1;
        break;
    }
    
    return 2; // Default moderate score
  };

  const getScoreColor = (score: number): string => {
    if (score >= 3.5) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 2.5) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 1.5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getOverallRating = (score: number): 'excellent' | 'good' | 'moderate' | 'poor' => {
    if (score >= 3.5) return 'excellent';
    if (score >= 2.5) return 'good';
    if (score >= 1.5) return 'moderate';
    return 'poor';
  };

  const getPropertyCategory = (property: string): 'physical' | 'biological' | 'clinical' | 'optical' => {
    const categories = {
      physical: ['strength', 'durability', 'wear_resistance', 'polishability', 'fracture_toughness'],
      biological: ['biocompatibility', 'fluoride_release'],
      clinical: ['longevity', 'cost_considerations', 'category'],
      optical: ['aesthetics', 'translucency', 'color_stability', 'radiopacity'],
    };

    for (const [category, props] of Object.entries(categories)) {
      if (props.includes(property)) {
        return category as any;
      }
    }

    return 'physical'; // Default category
  };

  const formatPropertyName = (property: string): string => {
    return property
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const exportComparison = () => {
    const data = {
      materials: materials.map(m => ({
        name: m.name,
        category: m.category,
        longevity: m.longevity,
        cost: m.cost_considerations,
      })),
      scores: materialScores,
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `material-comparison-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('Comparison data exported successfully');
  };

  const getScoreIcon = (score: number) => {
    if (score >= 3.5) return '🟢';
    if (score >= 2.5) return '🔵';
    if (score >= 1.5) return '🟡';
    return '🔴';
  };

  if (materials.length === 0) {
    return (
      <CompactBox title="Material Comparison" defaultExpanded={true}>
        <div className="text-center py-8">
          <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Materials Selected</h3>
          <p className="text-gray-600 mb-4">Add materials to compare their properties side-by-side</p>
          <button
            onClick={onAddMaterial}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Add Materials for Comparison
          </button>
        </div>
      </CompactBox>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <CompactBox title={`Material Comparison (${materials.length} materials)`} defaultExpanded={true}>
        <div className="space-y-4">
          {/* Control Panel */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="total">Total Score</option>
                  <option value="physical">Physical Properties</option>
                  <option value="biological">Biological Properties</option>
                  <option value="clinical">Clinical Properties</option>
                  <option value="optical">Optical Properties</option>
                </select>
              </div>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showScores}
                  onChange={(e) => setShowScores(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Show Scores</span>
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={exportComparison}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Export Comparison
              </button>
              <button
                onClick={onAddMaterial}
                className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Add Material
              </button>
            </div>
          </div>

          {/* Material Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {materials.map((material) => (
              <div key={material.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">{material.name}</h4>
                  <button
                    onClick={() => onRemoveMaterial(material)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-2">{material.category}</p>
                {showScores && (() => {
                  const score = materialScores.find(s => s.materialId === material.id);
                  return score ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Score:</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-medium">{score.totalScore.toFixed(1)}</span>
                        <span>{getScoreIcon(score.totalScore)}</span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            ))}
          </div>
        </div>
      </CompactBox>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'properties', label: 'Properties Matrix', icon: '📊' },
            { key: 'indications', label: 'Indications', icon: '📋' },
            { key: 'scores', label: 'Scoring Analysis', icon: '🏆' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.key
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'properties' && (
        <CompactBox title="Properties Comparison Matrix" defaultExpanded={true}>
          {isLoading ? (
            <LoadingSpinner text="Generating comparison matrix..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Property
                    </th>
                    {materials.map((material) => (
                      <th key={material.id} className="border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700 min-w-32">
                        {material.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((property, index) => (
                    <tr key={property.key} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-200 px-4 py-2 text-sm font-medium text-gray-900">
                        <div>
                          <div>{property.label}</div>
                          <div className="text-xs text-gray-500 capitalize">{property.category}</div>
                        </div>
                      </td>
                      {materials.map((material) => {
                        const value = property.values.find(v => v.materialId === material.id);
                        return (
                          <td key={material.id} className={`border border-gray-200 px-4 py-2 text-sm ${value?.color || ''}`}>
                            <div className="text-center">
                              <div>{value ? (Array.isArray(value.value) ? value.value.join(', ') : value.value || 'N/A') : 'N/A'}</div>
                              {showScores && value && (
                                <div className="text-xs mt-1 flex items-center justify-center">
                                  <span className="mr-1">{getScoreIcon(value.score)}</span>
                                  <span>{value.score.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CompactBox>
      )}

      {activeTab === 'indications' && (
        <CompactBox title="Indications & Contraindications Comparison" defaultExpanded={true}>
          <div className="space-y-6">
            {/* Indications */}
            <div>
              <h4 className="font-medium text-green-800 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Clinical Indications
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {materials.map((material) => (
                  <div key={material.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <h5 className="font-medium text-green-800 text-sm mb-2">{material.name}</h5>
                    <ul className="text-green-700 text-xs space-y-1">
                      {material.indications.map((indication, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                          {indication}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Contraindications */}
            <div>
              <h4 className="font-medium text-red-800 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Contraindications
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {materials.map((material) => (
                  <div key={material.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <h5 className="font-medium text-red-800 text-sm mb-2">{material.name}</h5>
                    <ul className="text-red-700 text-xs space-y-1">
                      {material.contraindications.map((contraindication, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                          {contraindication}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CompactBox>
      )}

      {activeTab === 'scores' && (
        <CompactBox title="Material Scoring Analysis" defaultExpanded={true}>
          <div className="space-y-4">
            {materialScores.map((score) => (
              <div key={score.materialId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{score.materialName}</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getScoreIcon(score.totalScore)}</span>
                    <span className="font-bold text-lg">{score.totalScore.toFixed(1)}</span>
                    <span className="text-sm text-gray-500">({score.overallRating})</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(score.categoryScores).map(([category, categoryScore]) => (
                    <div key={category} className="text-center">
                      <div className="text-sm text-gray-600 capitalize">{category}</div>
                      <div className="flex items-center justify-center space-x-1 mt-1">
                        <span className="text-sm font-medium">{categoryScore.toFixed(1)}</span>
                        <span>{getScoreIcon(categoryScore)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CompactBox>
      )}
    </div>
  );
};

export default MaterialComparison;