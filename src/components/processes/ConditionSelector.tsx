import React, { useState, useEffect, useMemo } from 'react';
import { procedureDataService } from '../../services/procedureDataService';
import { Procedure } from '../../types';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useToast } from '../shared/ToastContainer';

interface ConditionSelectorProps {
  selectedCondition: Procedure | null;
  onConditionSelect: (condition: Procedure) => void;
  patientAge?: number;
}

const ConditionSelector: React.FC<ConditionSelectorProps> = ({
  selectedCondition,
  onConditionSelect,
  patientAge
}) => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ageGroup, setAgeGroup] = useState<'pediatric' | 'adult' | 'geriatric'>('adult');
  const { showSuccess, showError } = useToast();

  const categories = [
    'Restorative',
    'Periodontal', 
    'Endodontic',
    'Emergency',
    'Oral Surgery',
    'Orthodontic',
    'Prosthodontic',
    'Pediatric'
  ];

  const severityLevels = [
    { value: '', label: 'All Severities' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'routine', label: 'Routine' },
    { value: 'preventive', label: 'Preventive' }
  ];

  useEffect(() => {
    loadProcedures();
    if (patientAge) {
      if (patientAge < 18) setAgeGroup('pediatric');
      else if (patientAge >= 65) setAgeGroup('geriatric');
      else setAgeGroup('adult');
    }
  }, [patientAge]);

  const loadProcedures = async () => {
    try {
      setIsLoading(true);
      const procedureList = await procedureDataService.loadProcedures();
      setProcedures(procedureList);
    } catch (error) {
      showError('Failed to load conditions database');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProcedures = useMemo(() => {
    let filtered = procedures;

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(procedure => 
        procedure.name.toLowerCase().includes(search) ||
        procedure.diagnosis.toLowerCase().includes(search) ||
        procedure.differential_diagnosis.some(diff => 
          diff.toLowerCase().includes(search)
        )
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(procedure => procedure.category === selectedCategory);
    }

    // Severity filter
    if (selectedSeverity) {
      filtered = filtered.filter(procedure => {
        const name = procedure.name.toLowerCase();
        const diagnosis = procedure.diagnosis.toLowerCase();
        
        switch (selectedSeverity) {
          case 'emergency':
            return name.includes('abscess') || name.includes('emergency') || 
                   diagnosis.includes('pain') || diagnosis.includes('swelling');
          case 'urgent':
            return name.includes('pulpitis') || name.includes('extraction');
          case 'routine':
            return name.includes('filling') || name.includes('cleaning') || 
                   name.includes('crown');
          case 'preventive':
            return name.includes('sealant') || name.includes('fluoride') || 
                   name.includes('preventive');
          default:
            return true;
        }
      });
    }

    // Age group filter
    if (patientAge) {
      filtered = filtered.filter(procedure => {
        const name = procedure.name.toLowerCase();
        const category = procedure.category.toLowerCase();
        const diagnosis = procedure.diagnosis.toLowerCase();
        
        switch (ageGroup) {
          case 'pediatric':
            return category === 'pediatric' || name.includes('pediatric') || 
                   name.includes('child') || name.includes('primary');
          case 'geriatric':
            return name.includes('geriatric') || name.includes('elderly') ||
                   diagnosis.includes('elderly') || diagnosis.includes('geriatric');
          case 'adult':
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [procedures, searchTerm, selectedCategory, selectedSeverity, patientAge, ageGroup]);

  const getSeverityColor = (procedure: Procedure): string => {
    const name = procedure.name.toLowerCase();
    const diagnosis = procedure.diagnosis.toLowerCase();
    
    if (name.includes('abscess') || name.includes('emergency')) {
      return 'border-red-300 bg-red-50';
    } else if (name.includes('pulpitis') || name.includes('extraction')) {
      return 'border-orange-300 bg-orange-50';
    } else if (name.includes('filling') || name.includes('cleaning')) {
      return 'border-green-300 bg-green-50';
    } else {
      return 'border-blue-300 bg-blue-50';
    }
  };

  const getSeverityIcon = (procedure: Procedure): string => {
    const name = procedure.name.toLowerCase();
    const diagnosis = procedure.diagnosis.toLowerCase();
    
    if (name.includes('abscess') || name.includes('emergency')) {
      return '🚨';
    } else if (name.includes('pulpitis') || name.includes('extraction')) {
      return '⚠️';
    } else if (name.includes('filling') || name.includes('cleaning')) {
      return '✅';
    } else {
      return '📋';
    }
  };

  const handleConditionSelect = (procedure: Procedure) => {
    onConditionSelect(procedure);
    showSuccess(`Selected: ${procedure.name}`);
  };

  const clearSelection = () => {
    onConditionSelect(null as any);
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedSeverity('');
  };

  return (
    <CompactBox 
      title="Condition Selector" 
      defaultExpanded={true}
      className="h-full"
    >
      <div className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Conditions
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search conditions, symptoms, or procedures..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {severityLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
          </div>

          {patientAge && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age Group Recommendation
              </label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pediatric">Pediatric (Under 18)</option>
                <option value="adult">Adult (18-64)</option>
                <option value="geriatric">Geriatric (65+)</option>
              </select>
            </div>
          )}
        </div>

        {/* Clear Selection Button */}
        {selectedCondition && (
          <button
            onClick={clearSelection}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Clear Selection
          </button>
        )}

        {/* Conditions List */}
        {isLoading ? (
          <LoadingSpinner text="Loading conditions..." />
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <div className="text-sm text-gray-500 mb-2">
              {filteredProcedures.length} condition{filteredProcedures.length !== 1 ? 's' : ''} found
            </div>
            {filteredProcedures.map(procedure => (
              <button
                key={procedure.id}
                onClick={() => handleConditionSelect(procedure)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                  selectedCondition?.id === procedure.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : `${getSeverityColor(procedure)} hover:border-opacity-80`
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-2">{getSeverityIcon(procedure)}</span>
                      <h4 className="font-semibold text-gray-900">{procedure.name}</h4>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {procedure.diagnosis}
                    </p>
                    
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span className="px-2 py-1 bg-white bg-opacity-60 rounded-full">
                        {procedure.category}
                      </span>
                      {procedure.investigations.length > 0 && (
                        <span className="px-2 py-1 bg-white bg-opacity-60 rounded-full">
                          {procedure.investigations.length} investigation{procedure.investigations.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {procedure.differential_diagnosis.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    <span className="font-medium">Differential: </span>
                    {procedure.differential_diagnosis.slice(0, 2).join(', ')}
                    {procedure.differential_diagnosis.length > 2 && '...'}
                  </div>
                )}
              </button>
            ))}
            
            {filteredProcedures.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <svg className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.092-2.333M15.236 20a7.962 7.962 0 01-6.472-2.333" />
                </svg>
                <p>No conditions found matching your criteria</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        )}
      </div>
    </CompactBox>
  );
};

export default ConditionSelector;