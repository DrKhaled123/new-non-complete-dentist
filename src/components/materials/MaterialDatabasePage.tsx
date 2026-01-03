import React, { useState, useEffect } from 'react';
import { Material } from '../../types';
import { materialDataService } from '../../services/materialDataService';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';
import NavigationButtons from '../shared/NavigationButtons';
import { useToast } from '../shared/ToastContainer';

// Import new sub-components
import MaterialSearch from './MaterialSearch';
import MaterialDetailView from './MaterialDetailView';
import MaterialComparison from './MaterialComparison';
import MaterialRecommendationEngine from './MaterialRecommendationEngine';
import MaterialCalculator from './MaterialCalculator';

interface MaterialDatabasePageProps {
  doctorProfile: { name: string; email: string; specialization: string; licenseNumber: string } | null;
  onNavigate?: (page: string) => void;
}

const MaterialDatabasePage: React.FC<MaterialDatabasePageProps> = ({ doctorProfile, onNavigate }) => {
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [comparisonMaterials, setComparisonMaterials] = useState<Material[]>([]);
  const [savedCalculations, setSavedCalculations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'recommend' | 'compare' | 'calculator'>('search');
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleMaterialSelect = (material: Material) => {
    setSelectedMaterial(material);
    showSuccess(`Loaded details for ${material.name}`);
  };

  const handleComparisonToggle = (material: Material) => {
    if (comparisonMaterials.find(m => m.id === material.id)) {
      setComparisonMaterials(comparisonMaterials.filter(m => m.id !== material.id));
      showSuccess(`Removed ${material.name} from comparison`);
    } else if (comparisonMaterials.length < 4) {
      setComparisonMaterials([...comparisonMaterials, material]);
      showSuccess(`Added ${material.name} to comparison`);
    } else {
      showError('Maximum 4 materials can be compared at once');
    }
  };

  const handleRemoveFromComparison = (material: Material) => {
    setComparisonMaterials(comparisonMaterials.filter(m => m.id !== material.id));
    showSuccess(`Removed ${material.name} from comparison`);
  };

  const handleAddMaterial = () => {
    setActiveTab('search');
    showSuccess('Select materials from the search tab to add to comparison');
  };

  const handleSaveCalculation = (calculation: any) => {
    setSavedCalculations(prev => [...prev, calculation]);
    showSuccess('Calculation saved successfully');
  };

  const clearComparison = () => {
    setComparisonMaterials([]);
    showSuccess('Cleared all materials from comparison');
  };

  const tabs = [
    { key: 'search', label: 'Search & Browse', icon: '🔍', count: null },
    { key: 'recommend', label: 'Recommendations', icon: '🎯', count: null },
    { key: 'compare', label: 'Comparison', icon: '⚖️', count: comparisonMaterials.length },
    { key: 'calculator', label: 'Calculator', icon: '🧮', count: savedCalculations.length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-primary-50/30 to-accent-50/20">
      <div className="container-medical py-6 md:py-8 lg:py-10">
        <div className="space-y-6 md:space-y-8">
          {/* Navigation Buttons */}
          <NavigationButtons 
            onNavigateHome={() => onNavigate?.('dashboard')}
            onNavigateBack={() => window.history.back()}
          />

          {/* Header */}
          <CompactBox 
            title="Material Database"
            icon="🧪"
            variant="primary"
            className="mb-0"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Material Database</h1>
                    <p className="text-white/90 text-sm md:text-base">Comprehensive dental materials with advanced search, comparison, and recommendation features</p>
                  </div>
                </div>
                <div className="hidden md:flex space-x-3">
                  <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                    <div className="text-white/90 text-sm">Total Materials</div>
                    <div className="text-white font-bold text-lg">1,247+</div>
                  </div>
                </div>
              </div>
            </div>
          </CompactBox>

          {/* Tab Navigation */}
          <CompactBox title="Navigation" defaultExpanded={true} className="mb-0">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.key
                      ? 'bg-primary-100 text-primary-700 shadow-md transform scale-105'
                      : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800 hover:shadow-sm'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.count !== null && (
                    <span className={`px-2 py-1 text-xs rounded-full font-bold ${
                      activeTab === tab.key
                        ? 'bg-primary-200 text-primary-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CompactBox>

          {/* Tab Content */}
          <div className="min-h-[500px]">
            {activeTab === 'search' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Material Search */}
                <div className="xl:col-span-1">
                  <MaterialSearch
                    onMaterialSelect={handleMaterialSelect}
                    onComparisonToggle={handleComparisonToggle}
                    comparisonMaterials={comparisonMaterials}
                    selectedMaterial={selectedMaterial}
                  />
                </div>

                {/* Material Detail View */}
                <div className="xl:col-span-2">
                  <MaterialDetailView
                    material={selectedMaterial}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            )}

            {activeTab === 'recommend' && (
              <div className="space-y-6">
                <MaterialRecommendationEngine
                  onMaterialSelect={handleMaterialSelect}
                  onAddToComparison={handleComparisonToggle}
                  selectedMaterials={comparisonMaterials}
                />
                
                {/* Show selected material details if available */}
                {selectedMaterial && (
                  <MaterialDetailView
                    material={selectedMaterial}
                    isLoading={isLoading}
                  />
                )}
              </div>
            )}

            {activeTab === 'compare' && (
              <div className="space-y-6">
                <MaterialComparison
                  materials={comparisonMaterials}
                  onRemoveMaterial={handleRemoveFromComparison}
                  onAddMaterial={handleAddMaterial}
                  isLoading={isLoading}
                />
                
                {/* Show comparison materials details if available */}
                {comparisonMaterials.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {comparisonMaterials.map(material => (
                      <MaterialDetailView
                        key={material.id}
                        material={material}
                        isLoading={isLoading}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'calculator' && (
              <div className="space-y-6">
                <MaterialCalculator
                  material={selectedMaterial}
                  onSaveCalculation={handleSaveCalculation}
                />
                
                {/* Saved Calculations */}
                {savedCalculations.length > 0 && (
                  <CompactBox 
                    title={`Saved Calculations (${savedCalculations.length})`} 
                    icon="💰"
                    variant="default"
                    defaultExpanded={false}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedCalculations.map((calc, index) => (
                        <div key={calc.id} className="bg-gradient-to-br from-success-50 to-success-100 border border-success-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h5 className="font-semibold text-success-800">{calc.materialName}</h5>
                                <span className="px-2 py-1 bg-success-200 text-success-700 text-xs rounded-full font-medium">
                                  {calc.procedureType}
                                </span>
                              </div>
                              <p className="text-sm text-success-600 mb-1">
                                <span className="font-medium">Quantity:</span> {calc.finalQuantity.toFixed(2)}g
                              </p>
                              <p className="text-sm text-success-700 font-semibold">
                                <span className="font-medium">Total Cost:</span> ${calc.totalCost.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-success-500">
                                {new Date(calc.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CompactBox>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          {(selectedMaterial || comparisonMaterials.length > 0 || savedCalculations.length > 0) && (
            <CompactBox 
              title="Quick Actions" 
              icon="⚡"
              variant="accent"
              defaultExpanded={false}
            >
              <div className="flex flex-wrap items-center gap-3">
                {selectedMaterial && (
                  <button
                    onClick={() => setActiveTab('calculator')}
                    className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-xl hover:from-success-600 hover:to-success-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium"
                  >
                    <span className="text-lg">💰</span>
                    <span>Calculate Costs</span>
                  </button>
                )}
                
                {comparisonMaterials.length > 0 && (
                  <>
                    <button
                      onClick={() => setActiveTab('compare')}
                      className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium"
                    >
                      <span className="text-lg">⚖️</span>
                      <span>View Comparison ({comparisonMaterials.length})</span>
                    </button>
                    <button
                      onClick={clearComparison}
                      className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium"
                    >
                      <span className="text-lg">🗑️</span>
                      <span>Clear</span>
                    </button>
                  </>
                )}
                
                {savedCalculations.length > 0 && (
                  <button
                    onClick={() => setActiveTab('calculator')}
                    className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium"
                  >
                    <span className="text-lg">📊</span>
                    <span>View Calculations ({savedCalculations.length})</span>
                  </button>
                )}
              </div>
            </CompactBox>
          )}

          {/* Material Categories Overview */}
          <CompactBox 
            title="Material Categories Overview" 
            icon="📚"
            variant="default"
            defaultExpanded={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Restorative', icon: '🔧', description: 'Fillings, cores, and direct restorations', color: 'from-blue-500 to-cyan-600' },
                { name: 'Prosthodontic', icon: '👑', description: 'Crowns, bridges, and indirect restorations', color: 'from-purple-500 to-pink-600' },
                { name: 'Implant', icon: '🔩', description: 'Dental implants and abutments', color: 'from-gray-500 to-slate-600' },
                { name: 'Endodontic', icon: '🌿', description: 'Root canal and pulp therapy materials', color: 'from-green-500 to-emerald-600' },
                { name: 'Periodontal', icon: '🩸', description: 'Periodontal therapy and maintenance', color: 'from-red-500 to-rose-600' },
                { name: 'Orthodontic', icon: '🦷', description: 'Orthodontic appliances and materials', color: 'from-orange-500 to-amber-600' },
              ].map(category => (
                <div 
                  key={category.name} 
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:scale-105"
                  onClick={() => {
                    setActiveTab('search');
                    // Could trigger category filter in search component
                  }}
                >
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200`}>
                      <span className="text-2xl text-white">{category.icon}</span>
                    </div>
                    <h4 className="font-semibold text-gray-800 group-hover:text-primary-600 transition-colors">{category.name}</h4>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{category.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Click to explore</span>
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </CompactBox>

          {/* Statistics and Insights */}
          <CompactBox 
            title="Statistics & Insights" 
            icon="📈"
            variant="default"
            defaultExpanded={false}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-accent-50 to-accent-100 border border-accent-200 rounded-xl p-6 text-center hover:shadow-md transition-all duration-200">
                <div className="text-3xl font-bold text-accent-600 mb-2">
                  {comparisonMaterials.length}
                </div>
                <div className="text-accent-800 text-sm font-medium">Materials in Comparison</div>
              </div>
              <div className="bg-gradient-to-br from-success-50 to-success-100 border border-success-200 rounded-xl p-6 text-center hover:shadow-md transition-all duration-200">
                <div className="text-3xl font-bold text-success-600 mb-2">
                  {savedCalculations.length}
                </div>
                <div className="text-success-800 text-sm font-medium">Saved Calculations</div>
              </div>
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-xl p-6 text-center hover:shadow-md transition-all duration-200">
                <div className="text-3xl font-bold text-primary-600 mb-2">
                  {selectedMaterial ? '1' : '0'}
                </div>
                <div className="text-primary-800 text-sm font-medium">Material Selected</div>
              </div>
              <div className="bg-gradient-to-br from-warning-50 to-warning-100 border border-warning-200 rounded-xl p-6 text-center hover:shadow-md transition-all duration-200">
                <div className="text-3xl mb-2">
                  {activeTab === 'recommend' ? '🎯' : activeTab === 'compare' ? '⚖️' : activeTab === 'calculator' ? '🧮' : '🔍'}
                </div>
                <div className="text-warning-800 text-sm font-medium">Current View</div>
              </div>
            </div>
          </CompactBox>

          {/* Clinical Disclaimer */}
          <CompactBox 
            title="Material Selection Guidance" 
            icon="🏥"
            variant="accent"
            className="mb-0"
          >
            <div className="bg-gradient-to-r from-info-50 to-primary-50 border border-info-200 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-info-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-info-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-info-800 mb-3">Professional Guidelines</h4>
                  <div className="space-y-2 text-sm text-info-700">
                    <p className="flex items-start">
                      <span className="w-2 h-2 bg-info-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Material selection should consider patient factors, clinical situation, and long-term prognosis
                    </p>
                    <p className="flex items-start">
                      <span className="w-2 h-2 bg-info-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Always follow manufacturer guidelines and current evidence-based recommendations
                    </p>
                    <p className="flex items-start">
                      <span className="w-2 h-2 bg-info-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Consult with dental material specialists for complex cases
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CompactBox>

          {/* Feature Overview */}
          <CompactBox 
            title="Advanced Material Database Features" 
            icon="✨"
            variant="default"
            defaultExpanded={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-accent-50 to-accent-100 rounded-xl p-6">
                  <h5 className="font-semibold text-accent-800 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-accent-200 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-lg">🔍</span>
                    </span>
                    Advanced Search & Filtering
                  </h5>
                  <ul className="text-sm text-accent-700 space-y-2">
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-accent-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Multi-criteria property-based filtering
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-accent-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Real-time search across all material data
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-accent-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Category and indication-based browsing
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-accent-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Cost and longevity range filtering
                    </li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-br from-success-50 to-success-100 rounded-xl p-6">
                  <h5 className="font-semibold text-success-800 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-success-200 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-lg">⚖️</span>
                    </span>
                    Material Comparison
                  </h5>
                  <ul className="text-sm text-success-700 space-y-2">
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-success-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Side-by-side comparison up to 4 materials
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-success-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Scoring system for objective evaluation
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-success-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Visual property comparison matrices
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-success-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Export comparison reports
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-6">
                  <h5 className="font-semibold text-primary-800 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-primary-200 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-lg">🎯</span>
                    </span>
                    Intelligent Recommendations
                  </h5>
                  <ul className="text-sm text-primary-700 space-y-2">
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-primary-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Procedure-based material suggestions
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-primary-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Patient factor consideration
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-primary-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Clinical scoring and reasoning
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-primary-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Cost-benefit analysis
                    </li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-br from-warning-50 to-warning-100 rounded-xl p-6">
                  <h5 className="font-semibold text-warning-800 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-warning-200 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-lg">🧮</span>
                    </span>
                    Cost Calculation
                  </h5>
                  <ul className="text-sm text-warning-700 space-y-2">
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-warning-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Quantity estimation by procedure type
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-warning-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Waste factor calculations
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-warning-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Bulk pricing and discounts
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-warning-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Labor cost integration
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </CompactBox>
        </div>
      </div>
    </div>
  );
};

export default MaterialDatabasePage;