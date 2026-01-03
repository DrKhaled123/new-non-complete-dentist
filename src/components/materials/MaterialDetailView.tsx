import React, { useState, useEffect } from 'react';
import { Material } from '../../types';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';

interface MaterialDetailViewProps {
  material: Material | null;
  isLoading?: boolean;
}

interface MaterialProperty {
  key: string;
  label: string;
  value: string | string[];
  rating?: 'excellent' | 'good' | 'moderate' | 'poor';
  description?: string;
}

const MaterialDetailView: React.FC<MaterialDetailViewProps> = ({ material, isLoading = false }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'clinical' | 'handling'>('overview');

  if (isLoading) {
    return (
      <CompactBox title="Material Details" defaultExpanded={true}>
        <LoadingSpinner text="Loading material details..." />
      </CompactBox>
    );
  }

  if (!material) {
    return (
      <CompactBox title="Material Details" defaultExpanded={true}>
        <div className="text-center py-8">
          <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Material</h3>
          <p className="text-gray-600">Choose a material from the search results to view detailed specifications and clinical guidance</p>
        </div>
      </CompactBox>
    );
  }

  const getPropertyColor = (property: string, value: string | string[] | undefined) => {
    if (!value) return 'text-gray-600 bg-gray-50';
    const valueStr = Array.isArray(value) ? value.join(', ') : value;
    if (valueStr.toLowerCase().includes('excellent')) return 'text-green-600 bg-green-50 border-green-200';
    if (valueStr.toLowerCase().includes('good')) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (valueStr.toLowerCase().includes('moderate')) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (valueStr.toLowerCase().includes('poor') || valueStr.toLowerCase().includes('low')) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getPropertyRating = (value: string | string[] | undefined): 'excellent' | 'good' | 'moderate' | 'poor' | undefined => {
    if (!value) return undefined;
    const valueStr = Array.isArray(value) ? value.join(', ') : value;
    if (valueStr.toLowerCase().includes('excellent')) return 'excellent';
    if (valueStr.toLowerCase().includes('good')) return 'good';
    if (valueStr.toLowerCase().includes('moderate')) return 'moderate';
    if (valueStr.toLowerCase().includes('poor') || valueStr.toLowerCase().includes('low')) return 'poor';
    return undefined;
  };

  const getClinicalPearls = (material: Material): string[] => {
    const pearls: string[] = [];
    
    // Category-specific clinical pearls
    switch (material.category.toLowerCase()) {
      case 'restorative':
        pearls.push('Ensure proper isolation for optimal results');
        if (material.properties.fluoride_release?.toLowerCase().includes('yes')) {
          pearls.push('Provides additional fluoride protection for high-caries-risk patients');
        }
        break;
      case 'prosthodontic':
        pearls.push('Verify adequate occlusal clearance before preparation');
        pearls.push('Consider patient parafunctional habits in material selection');
        break;
      case 'implant':
        pearls.push('Ensure proper osseointegration time before loading');
        pearls.push('Consider bone quality and quantity');
        break;
    }

    // Material-specific pearls
    if (material.name.toLowerCase().includes('composite')) {
      pearls.push('Incremental placement technique recommended for optimal polymerization');
    }
    if (material.name.toLowerCase().includes('glass ionomer')) {
      pearls.push('Ideal for patients with high caries risk due to fluoride release');
    }
    if (material.name.toLowerCase().includes('zirconia')) {
      pearls.push('Requires special burs for adjustments; avoid overheating during preparation');
    }
    if (material.name.toLowerCase().includes('lithium disilicate')) {
      pearls.push('HF etching and silanization critical for optimal bonding');
    }

    return pearls;
  };

  const clinicalPearls = getClinicalPearls(material);

  const PropertySection = ({ title, properties, icon }: { title: string; properties: MaterialProperty[]; icon: string }) => (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-800 mb-3 flex items-center">
        <span className="text-lg mr-2">{icon}</span>
        {title}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {properties.map((prop) => (
          <div key={prop.key} className={`p-3 rounded-lg border ${getPropertyColor(prop.key, prop.value)}`}>
            <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-medium">{prop.label}</span>
              {(() => {
                if (!prop.rating) return null;
                const ratingValue = prop.rating === 'excellent' ? 4 : prop.rating === 'good' ? 3 : prop.rating === 'moderate' ? 2 : 1;
                return (
                  <div className="flex items-center">
                    {[...Array(4)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-3 h-3 ${
                          i < ratingValue ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                );
              })()}
            </div>
            <p className="text-sm">
              {Array.isArray(prop.value) ? prop.value.join(', ') : prop.value || 'N/A'}
            </p>
            {prop.description && (
              <p className="text-xs mt-1 opacity-75">{prop.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const getTechnicalProperties = (): MaterialProperty[] => {
    const props: MaterialProperty[] = [];
    
    Object.entries(material.properties).forEach(([key, value]) => {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const rating = getPropertyRating(value);
      
      props.push({
        key,
        label,
        value: value || 'N/A',
        rating,
        description: getPropertyDescription(key, value)
      });
    });

    return props.sort((a, b) => {
      // Prioritize strength and aesthetics
      if (a.key === 'strength' || a.key === 'aesthetics') return -1;
      if (b.key === 'strength' || b.key === 'aesthetics') return 1;
      return a.label.localeCompare(b.label);
    });
  };

  const getPropertyDescription = (key: string, value: string | string[] | undefined): string | undefined => {
    const descriptions: Record<string, string> = {
      strength: 'Mechanical strength under functional loads',
      aesthetics: 'Color matching and translucency properties',
      durability: 'Expected lifespan under normal conditions',
      biocompatibility: 'Tissue compatibility and safety profile',
      wear_resistance: 'Resistance to abrasive wear',
      polishability: 'Ease of achieving smooth surface finish',
      fluoride_release: 'Release of fluoride ions for caries prevention',
      adhesion: 'Bonding capability to tooth structure',
      thermal_expansion: 'Compatibility with tooth structure thermal changes',
    };
    
    return descriptions[key];
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Material Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{material.name}</h2>
                  <div className="flex items-center space-x-4 text-purple-100">
                    <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">
                      {material.category}
                    </span>
                    <span className="text-sm">Longevity: {material.longevity}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-purple-100 text-sm">Cost Consideration</div>
                  <div className="text-white font-medium">{material.cost_considerations}</div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {material.indications.length}
                </div>
                <div className="text-blue-800 text-sm">Indications</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {material.contraindications.length}
                </div>
                <div className="text-red-800 text-sm">Contraindications</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Object.keys(material.properties).length}
                </div>
                <div className="text-green-800 text-sm">Properties</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {material.handling_characteristics.length}
                </div>
                <div className="text-purple-800 text-sm">Handling Tips</div>
              </div>
            </div>

            {/* Indications and Contraindications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Clinical Indications
                </h4>
                <ul className="text-green-700 text-sm space-y-2">
                  {material.indications.map((indication, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      {indication}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Contraindications
                </h4>
                <ul className="text-red-700 text-sm space-y-2">
                  {material.contraindications.map((contraindication, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      {contraindication}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );

      case 'properties':
        const technicalProperties = getTechnicalProperties();
        return (
          <div className="space-y-6">
            <PropertySection
              title="Physical Properties"
              properties={technicalProperties.filter(p => 
                ['strength', 'aesthetics', 'durability', 'wear_resistance', 'polishability'].includes(p.key)
              )}
              icon="🔬"
            />
            <PropertySection
              title="Biological Properties"
              properties={technicalProperties.filter(p => 
                ['biocompatibility', 'fluoride_release'].includes(p.key)
              )}
              icon="🧬"
            />
            <PropertySection
              title="Technical Properties"
              properties={technicalProperties.filter(p => 
                ['thermal_expansion', 'adhesion', 'thermal_conductivity', 'dimensional_stability'].includes(p.key)
              )}
              icon="⚙️"
            />
            <PropertySection
              title="Optical Properties"
              properties={technicalProperties.filter(p => 
                ['translucency', 'color_stability', 'radiopacity'].includes(p.key)
              )}
              icon="👁️"
            />
          </div>
        );

      case 'clinical':
        return (
          <div className="space-y-6">
            {/* Clinical Pearls */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Clinical Pearls
              </h4>
              <div className="space-y-2">
                {clinicalPearls.map((pearl, index) => (
                  <div key={index} className="flex items-start">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span className="text-yellow-700 text-sm">{pearl}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Long-term Considerations */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Long-term Considerations
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-blue-700">Expected Longevity:</span>
                  <p className="text-blue-600 text-sm mt-1">{material.longevity}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Cost Analysis:</span>
                  <p className="text-blue-600 text-sm mt-1">{material.cost_considerations}</p>
                </div>
              </div>
            </div>

            {/* Patient Factors */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium text-purple-800 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Patient Selection Factors
              </h4>
              <div className="text-purple-700 text-sm space-y-2">
                <p>Consider patient age, oral hygiene, parafunctional habits, and aesthetic requirements when selecting this material.</p>
                <p>Discuss long-term expectations and maintenance requirements with the patient.</p>
              </div>
            </div>
          </div>
        );

      case 'handling':
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Handling Characteristics & Clinical Tips
              </h4>
              <div className="space-y-3">
                {material.handling_characteristics.map((characteristic, index) => (
                  <div key={index} className="flex items-start">
                    <span className="w-2 h-2 bg-gray-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span className="text-gray-700 text-sm">{characteristic}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Technique-Specific Tips */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h4 className="font-medium text-indigo-800 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Technique-Specific Tips
              </h4>
              <div className="text-indigo-700 text-sm space-y-2">
                {material.name.toLowerCase().includes('composite') && (
                  <>
                    <p>• Use incremental placement technique to minimize polymerization stress</p>
                    <p>• Ensure adequate curing time for each increment</p>
                    <p>• Consider bulk-fill materials for time efficiency</p>
                  </>
                )}
                {material.name.toLowerCase().includes('glass ionomer') && (
                  <>
                    <p>• Protect from moisture contamination during initial set</p>
                    <p>• Apply varnish or unfilled resin after initial set</p>
                    <p>• Consider RMGIC for improved handling and aesthetics</p>
                  </>
                )}
                {material.name.toLowerCase().includes('crown') && (
                  <>
                    <p>• Verify adequate reduction for material thickness requirements</p>
                    <p>• Consider margin design based on material properties</p>
                    <p>• Plan for adequate occlusal clearance</p>
                  </>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', icon: '📋' },
            { key: 'properties', label: 'Properties', icon: '🔬' },
            { key: 'clinical', label: 'Clinical', icon: '🏥' },
            { key: 'handling', label: 'Handling', icon: '🔧' },
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
      <CompactBox 
        title={`${material.name} - ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`} 
        defaultExpanded={true}
      >
        {renderTabContent()}
      </CompactBox>
    </div>
  );
};

export default MaterialDetailView;