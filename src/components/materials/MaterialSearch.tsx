import React, { useState, useEffect, useMemo } from 'react';
import { Material } from '../../types';
import { materialDataService } from '../../services/materialDataService';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useToast } from '../shared/ToastContainer';

interface MaterialSearchProps {
  onMaterialSelect: (material: Material) => void;
  onComparisonToggle: (material: Material) => void;
  comparisonMaterials: Material[];
  selectedMaterial: Material | null;
}

interface SearchFilters {
  searchTerm: string;
  category: string;
  strength: string;
  aesthetics: string;
  durability: string;
  biocompatibility: string;
  costRange: string;
  indications: string;
}

const MaterialSearch: React.FC<MaterialSearchProps> = ({
  onMaterialSelect,
  onComparisonToggle,
  comparisonMaterials,
  selectedMaterial,
}) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    category: '',
    strength: '',
    aesthetics: '',
    durability: '',
    biocompatibility: '',
    costRange: '',
    indications: '',
  });
  const { showSuccess, showError } = useToast();

  // Load materials and categories
  useEffect(() => {
    loadData();
  }, []);

  // Apply filters whenever filters or materials change
  useEffect(() => {
    applyFilters();
  }, [filters, materials]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [materialsData, categoriesData] = await Promise.all([
        materialDataService.getAllMaterials(),
        materialDataService.getCategories(),
      ]);
      setMaterials(materialsData);
      setCategories(categoriesData);
    } catch (error) {
      showError('Failed to load materials data');
      console.error('Failed to load materials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...materials];

    // Search term filter
    if (filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(material => 
        material.name.toLowerCase().includes(searchLower) ||
        material.indications.some(ind => ind.toLowerCase().includes(searchLower)) ||
        material.contraindications.some(contra => contra.toLowerCase().includes(searchLower)) ||
        material.category.toLowerCase().includes(searchLower) ||
        Object.entries(material.properties).some(([key, value]) => 
          key.toLowerCase().includes(searchLower) ||
          (Array.isArray(value) ? value.join(' ').toLowerCase().includes(searchLower) : 
           value?.toLowerCase().includes(searchLower))
        )
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(material => material.category === filters.category);
    }

    // Strength filter
    if (filters.strength) {
      filtered = filtered.filter(material => {
        const strength = material.properties.strength?.toLowerCase() || '';
        return strength.includes(filters.strength.toLowerCase());
      });
    }

    // Aesthetics filter
    if (filters.aesthetics) {
      filtered = filtered.filter(material => {
        const aesthetics = material.properties.aesthetics?.toLowerCase() || '';
        return aesthetics.includes(filters.aesthetics.toLowerCase());
      });
    }

    // Durability filter
    if (filters.durability) {
      filtered = filtered.filter(material => {
        const durability = material.properties.durability?.toLowerCase() || '';
        const longevity = material.longevity.toLowerCase();
        return durability.includes(filters.durability.toLowerCase()) ||
               longevity.includes(filters.durability.toLowerCase());
      });
    }

    // Biocompatibility filter
    if (filters.biocompatibility) {
      filtered = filtered.filter(material => {
        const biocompatibility = material.properties.biocompatibility?.toLowerCase() || '';
        return biocompatibility.includes(filters.biocompatibility.toLowerCase());
      });
    }

    // Cost range filter
    if (filters.costRange) {
      filtered = filtered.filter(material => {
        const costConsiderations = material.cost_considerations.toLowerCase();
        switch (filters.costRange) {
          case 'low':
            return costConsiderations.includes('low') || costConsiderations.includes('cost-effective');
          case 'moderate':
            return costConsiderations.includes('moderate') || costConsiderations.includes('moderate cost');
          case 'high':
            return costConsiderations.includes('high') || costConsiderations.includes('high cost');
          case 'very-high':
            return costConsiderations.includes('very high') || costConsiderations.includes('very high cost');
          default:
            return true;
        }
      });
    }

    // Indications filter
    if (filters.indications.trim()) {
      const indicationLower = filters.indications.toLowerCase().trim();
      filtered = filtered.filter(material =>
        material.indications.some(ind => ind.toLowerCase().includes(indicationLower))
      );
    }

    setFilteredMaterials(filtered);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      category: '',
      strength: '',
      aesthetics: '',
      durability: '',
      biocompatibility: '',
      costRange: '',
      indications: '',
    });
  };

  const getPropertyColor = (property: string, value: string | string[] | undefined) => {
    if (!value) return 'text-gray-600 bg-gray-50';
    const valueStr = Array.isArray(value) ? value.join(', ') : value;
    if (valueStr.toLowerCase().includes('excellent')) return 'text-green-600 bg-green-50';
    if (valueStr.toLowerCase().includes('good')) return 'text-blue-600 bg-blue-50';
    if (valueStr.toLowerCase().includes('moderate')) return 'text-yellow-600 bg-yellow-50';
    if (valueStr.toLowerCase().includes('poor') || valueStr.toLowerCase().includes('low')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const hasActiveFilters = Object.values(filters).some(value => value.trim() !== '');

  return (
    <div className="space-y-4">
      {/* Advanced Search Filters */}
      <CompactBox title="Advanced Material Search" defaultExpanded={true}>
        <div className="space-y-4">
          {/* Search Term */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Terms
            </label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              placeholder="Search materials, properties, indications..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Indications Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specific Indication
            </label>
            <input
              type="text"
              value={filters.indications}
              onChange={(e) => handleFilterChange('indications', e.target.value)}
              placeholder="e.g., Class V, crown, implant..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Category and Property Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Strength
              </label>
              <select
                value={filters.strength}
                onChange={(e) => handleFilterChange('strength', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Strengths</option>
                <option value="very high">Very High</option>
                <option value="high">High</option>
                <option value="moderate">Moderate</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aesthetics
              </label>
              <select
                value={filters.aesthetics}
                onChange={(e) => handleFilterChange('aesthetics', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Aesthetics</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durability
              </label>
              <select
                value={filters.durability}
                onChange={(e) => handleFilterChange('durability', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Durability</option>
                <option value="15+">15+ years</option>
                <option value="10-15">10-15 years</option>
                <option value="5-10">5-10 years</option>
                <option value="3-5">3-5 years</option>
              </select>
            </div>
          </div>

          {/* Additional Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Biocompatibility
              </label>
              <select
                value={filters.biocompatibility}
                onChange={(e) => handleFilterChange('biocompatibility', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Biocompatibility</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="moderate">Moderate</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost Range
              </label>
              <select
                value={filters.costRange}
                onChange={(e) => handleFilterChange('costRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Costs</option>
                <option value="low">Low Cost</option>
                <option value="moderate">Moderate Cost</option>
                <option value="high">High Cost</option>
                <option value="very-high">Very High Cost</option>
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-gray-600">
              {filteredMaterials.length} materials found
              {hasActiveFilters && ' (filtered)'}
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      </CompactBox>

      {/* Search Results */}
      <CompactBox title="Search Results" defaultExpanded={true}>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {isLoading ? (
            <LoadingSpinner text="Searching materials..." />
          ) : filteredMaterials.length > 0 ? (
            filteredMaterials.map(material => (
              <div
                key={material.id}
                className={`border rounded-lg p-3 transition-all cursor-pointer ${
                  selectedMaterial?.id === material.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                }`}
                onClick={() => onMaterialSelect(material)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className={`font-medium text-sm ${
                      selectedMaterial?.id === material.id
                        ? 'text-purple-800'
                        : 'text-gray-900'
                    }`}>
                      {material.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">{material.category}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onComparisonToggle(material);
                    }}
                    className={`text-xs px-2 py-1 rounded ml-2 ${
                      comparisonMaterials.find(m => m.id === material.id)
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-purple-50'
                    }`}
                  >
                    {comparisonMaterials.find(m => m.id === material.id) ? 'Remove' : 'Compare'}
                  </button>
                </div>

                {/* Quick Properties Preview */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Strength:</span>
                    <span className={`px-1 py-0.5 rounded text-xs ${getPropertyColor('strength', material.properties.strength)}`}>
                      {material.properties.strength?.split(' ')[0] || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Aesthetics:</span>
                    <span className={`px-1 py-0.5 rounded text-xs ${getPropertyColor('aesthetics', material.properties.aesthetics)}`}>
                      {material.properties.aesthetics || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Top Indications */}
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1">Key Indications:</p>
                  <div className="flex flex-wrap gap-1">
                    {material.indications.slice(0, 2).map((indication, index) => (
                      <span
                        key={index}
                        className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded"
                      >
                        {indication}
                      </span>
                    ))}
                    {material.indications.length > 2 && (
                      <span className="text-xs text-gray-500">+{material.indications.length - 2} more</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Materials Found</h3>
              <p className="text-gray-600">
                {hasActiveFilters 
                  ? 'Try adjusting your search criteria or clearing filters'
                  : 'No materials available in the database'
                }
              </p>
            </div>
          )}
        </div>
      </CompactBox>
    </div>
  );
};

export default MaterialSearch;