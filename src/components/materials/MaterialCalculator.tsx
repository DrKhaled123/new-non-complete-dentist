import React, { useState, useEffect } from 'react';
import { Material } from '../../types';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useToast } from '../shared/ToastContainer';

interface MaterialCalculatorProps {
  material: Material | null;
  onSaveCalculation?: (calculation: MaterialCalculation) => void;
}

interface MaterialCalculation {
  id: string;
  materialId: string;
  materialName: string;
  procedureType: string;
  calculationData: CalculationData;
  totalCost: number;
  wasteFactor: number;
  finalQuantity: number;
  unitPrice: number;
  createdAt: Date;
}

interface CalculationData {
  procedureType: string;
  toothNumber?: string;
  restorationType: string;
  dimensions: {
    length?: number;
    width?: number;
    depth?: number;
    surfaceArea?: number;
    volume?: number;
  };
  patientFactors: {
    age: 'pediatric' | 'adult' | 'geriatric';
    cooperation: 'excellent' | 'good' | 'fair' | 'poor';
    oralHygiene: 'excellent' | 'good' | 'fair' | 'poor';
  };
  materialFactors: {
    brand?: string;
    unitSize: string;
    unitPrice: number;
    bulkDiscount?: number;
  };
}

interface CostBreakdown {
  materialCost: number;
  wasteCost: number;
  laborCost: number;
  totalCost: number;
  costPerUnit: number;
}

const MaterialCalculator: React.FC<MaterialCalculatorProps> = ({
  material,
  onSaveCalculation,
}) => {
  const [calculationData, setCalculationData] = useState<CalculationData>({
    procedureType: '',
    restorationType: '',
    dimensions: {},
    patientFactors: {
      age: 'adult',
      cooperation: 'good',
      oralHygiene: 'good',
    },
    materialFactors: {
      unitSize: '1g',
      unitPrice: 0,
    },
  });

  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown>({
    materialCost: 0,
    wasteCost: 0,
    laborCost: 0,
    totalCost: 0,
    costPerUnit: 0,
  });

  const [isCalculating, setIsCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'cost'>('basic');
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (material) {
      // Initialize with material-specific defaults
      initializeCalculationData();
    }
  }, [material]);

  const initializeCalculationData = () => {
    if (!material) return;

    const unitPrice = getDefaultUnitPrice(material);
    setCalculationData(prev => ({
      ...prev,
      materialFactors: {
        ...prev.materialFactors,
        unitPrice,
        unitSize: getDefaultUnitSize(material),
      },
    }));
  };

  const getDefaultUnitPrice = (material: Material): number => {
    // Default pricing based on material category and cost considerations
    const costText = material.cost_considerations.toLowerCase();
    if (costText.includes('low') || costText.includes('cost-effective')) {
      return 25; // $25 per unit
    } else if (costText.includes('moderate')) {
      return 75; // $75 per unit
    } else if (costText.includes('high')) {
      return 150; // $150 per unit
    } else if (costText.includes('very high')) {
      return 300; // $300 per unit
    }
    return 50; // Default price
  };

  const getDefaultUnitSize = (material: Material): string => {
    switch (material.category) {
      case 'Restorative':
        return material.name.toLowerCase().includes('composite') ? '2g syringe' : '1g capsule';
      case 'Prosthodontic':
        return 'per unit';
      case 'Implant':
        return 'per implant';
      default:
        return '1g';
    }
  };

  const calculateQuantity = (): number => {
    const { dimensions, procedureType } = calculationData;
    let baseQuantity = 0;

    // Procedure-based quantity estimation
    switch (procedureType.toLowerCase()) {
      case 'class i':
        baseQuantity = 0.3; // 0.3g for Class I
        break;
      case 'class ii':
        baseQuantity = 0.5; // 0.5g for Class II
        break;
      case 'class iii':
        baseQuantity = 0.4; // 0.4g for Class III
        break;
      case 'class iv':
        baseQuantity = 0.6; // 0.6g for Class IV
        break;
      case 'class v':
        baseQuantity = 0.3; // 0.3g for Class V
        break;
      case 'crown':
        baseQuantity = 1.5; // 1.5g for crown build-up
        break;
      case 'core build-up':
        baseQuantity = 1.0; // 1.0g for core build-up
        break;
      case 'veneer':
        baseQuantity = 0.8; // 0.8g for veneer
        break;
      default:
        baseQuantity = 0.5; // Default estimate
    }

    // Dimension-based adjustments
    if (dimensions.surfaceArea && dimensions.surfaceArea > 0) {
      const areaFactor = dimensions.surfaceArea / 50; // Base area 50mm²
      baseQuantity *= Math.max(0.5, Math.min(2.0, areaFactor));
    }

    if (dimensions.volume && dimensions.volume > 0) {
      const volumeFactor = dimensions.volume / 25; // Base volume 25mm³
      baseQuantity *= Math.max(0.5, Math.min(2.0, volumeFactor));
    }

    // Patient factor adjustments
    const { patientFactors } = calculationData;
    
    // Age factor
    if (patientFactors.age === 'pediatric') {
      baseQuantity *= 0.7; // Less material needed for smaller teeth
    } else if (patientFactors.age === 'geriatric') {
      baseQuantity *= 1.1; // Slightly more for larger restorations
    }

    // Cooperation factor
    if (patientFactors.cooperation === 'poor') {
      baseQuantity *= 1.2; // Extra material for redo risk
    }

    // Oral hygiene factor
    if (patientFactors.oralHygiene === 'poor') {
      baseQuantity *= 1.1; // Slight increase for longevity considerations
    }

    return Math.max(0.1, baseQuantity); // Minimum 0.1g
  };

  const calculateCosts = (): CostBreakdown => {
    const quantity = calculateQuantity();
    const { materialFactors } = calculationData;
    
    // Material cost calculation
    const materialCost = quantity * materialFactors.unitPrice;
    
    // Waste factor calculation (typically 10-20%)
    let wasteFactor = 0.15; // 15% default waste
    
    // Adjust waste factor based on material and patient factors
    if (material?.category === 'Restorative') {
      wasteFactor += 0.05; // Composites have higher waste
    }
    
    if (calculationData.patientFactors.cooperation === 'poor') {
      wasteFactor += 0.1; // Higher waste for uncooperative patients
    }
    
    if (calculationData.patientFactors.oralHygiene === 'poor') {
      wasteFactor += 0.05; // Higher waste for poor hygiene
    }

    const wasteCost = materialCost * wasteFactor;
    
    // Labor cost estimation (based on procedure complexity)
    let laborCost = 0;
    const procedureType = calculationData.procedureType.toLowerCase();
    
    if (procedureType.includes('crown') || procedureType.includes('implant')) {
      laborCost = 200; // High complexity procedures
    } else if (procedureType.includes('class ii') || procedureType.includes('core')) {
      laborCost = 100; // Medium complexity
    } else {
      laborCost = 50; // Simple procedures
    }

    // Bulk discount calculation
    let discountRate = 0;
    if (materialFactors.bulkDiscount) {
      discountRate = materialFactors.bulkDiscount / 100;
    }

    const subtotal = materialCost + wasteCost + laborCost;
    const discountedSubtotal = subtotal * (1 - discountRate);
    
    const totalCost = discountedSubtotal;
    const costPerUnit = materialFactors.unitPrice * (1 + wasteFactor);

    return {
      materialCost,
      wasteCost,
      laborCost,
      totalCost,
      costPerUnit,
    };
  };

  const performCalculation = async () => {
    if (!material || !calculationData.procedureType.trim()) {
      showError('Please select a material and specify procedure type');
      return;
    }

    setIsCalculating(true);
    try {
      // Simulate calculation delay for UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const costs = calculateCosts();
      setCostBreakdown(costs);
      showSuccess('Calculation completed successfully');
    } catch (error) {
      showError('Calculation failed');
    } finally {
      setIsCalculating(false);
    }
  };

  const saveCalculation = () => {
    if (!material) return;

    const calculation: MaterialCalculation = {
      id: Date.now().toString(),
      materialId: material.id,
      materialName: material.name,
      procedureType: calculationData.procedureType,
      calculationData,
      totalCost: costBreakdown.totalCost,
      wasteFactor: 0.15, // Calculate actual waste factor
      finalQuantity: calculateQuantity(),
      unitPrice: calculationData.materialFactors.unitPrice,
      createdAt: new Date(),
    };

    onSaveCalculation?.(calculation);
    showSuccess('Calculation saved successfully');
  };

  const exportCalculation = () => {
    if (!material || costBreakdown.totalCost === 0) {
      showError('No calculation to export');
      return;
    }

    const exportData = {
      material: {
        name: material.name,
        category: material.category,
      },
      calculation: calculationData,
      costs: costBreakdown,
      quantity: calculateQuantity(),
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `material-calculation-${material.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSuccess('Calculation exported successfully');
  };

  const handleInputChange = (section: keyof CalculationData, field: string, value: any) => {
    setCalculationData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as object),
        [field]: value,
      },
    }));
  };

  const handleDimensionChange = (field: string, value: number) => {
    setCalculationData(prev => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [field]: value,
      },
    }));
  };

  if (!material) {
    return (
      <CompactBox title="Material Calculator" defaultExpanded={true}>
        <div className="text-center py-8">
          <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Material Calculator</h3>
          <p className="text-gray-600">Select a material to calculate quantities and costs</p>
        </div>
      </CompactBox>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <CompactBox title={`Material Calculator - ${material.name}`} defaultExpanded={true}>
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'basic', label: 'Basic Info', icon: '📋' },
                { key: 'advanced', label: 'Dimensions', icon: '📏' },
                { key: 'cost', label: 'Cost Analysis', icon: '💰' },
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
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Procedure Type *
                  </label>
                  <input
                    type="text"
                    value={calculationData.procedureType}
                    onChange={(e) => handleInputChange('procedureType', '', e.target.value)}
                    placeholder="e.g., Class II restoration, Crown..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tooth Number
                  </label>
                  <input
                    type="text"
                    value={calculationData.toothNumber || ''}
                    onChange={(e) => handleInputChange('toothNumber', '', e.target.value)}
                    placeholder="e.g., #14, #30..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Restoration Type
                  </label>
                  <select
                    value={calculationData.restorationType}
                    onChange={(e) => handleInputChange('restorationType', '', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select Type</option>
                    <option value="direct">Direct Restoration</option>
                    <option value="indirect">Indirect Restoration</option>
                    <option value="core">Core Build-up</option>
                    <option value="post">Post and Core</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={calculationData.materialFactors.unitPrice}
                    onChange={(e) => handleInputChange('materialFactors', 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Patient Factors */}
              <div>
                <h4 className="font-medium text-gray-800 mb-3">Patient Factors</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Patient Age
                    </label>
                    <select
                      value={calculationData.patientFactors.age}
                      onChange={(e) => handleInputChange('patientFactors', 'age', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="pediatric">Pediatric</option>
                      <option value="adult">Adult</option>
                      <option value="geriatric">Geriatric</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Patient Cooperation
                    </label>
                    <select
                      value={calculationData.patientFactors.cooperation}
                      onChange={(e) => handleInputChange('patientFactors', 'cooperation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Oral Hygiene
                    </label>
                    <select
                      value={calculationData.patientFactors.oralHygiene}
                      onChange={(e) => handleInputChange('patientFactors', 'oralHygiene', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-800 mb-3">Restoration Dimensions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Length (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={calculationData.dimensions.length || ''}
                      onChange={(e) => handleDimensionChange('length', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Width (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={calculationData.dimensions.width || ''}
                      onChange={(e) => handleDimensionChange('width', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Depth (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={calculationData.dimensions.depth || ''}
                      onChange={(e) => handleDimensionChange('depth', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Surface Area (mm²)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={calculationData.dimensions.surfaceArea || ''}
                      onChange={(e) => handleDimensionChange('surfaceArea', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-800 mb-2">Calculated Quantity</h5>
                <div className="text-2xl font-bold text-blue-600">
                  {calculateQuantity().toFixed(2)}g
                </div>
                <p className="text-blue-700 text-sm mt-1">
                  Estimated material quantity based on procedure and dimensions
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cost' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bulk Discount (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    max="50"
                    value={calculationData.materialFactors.bulkDiscount || ''}
                    onChange={(e) => handleInputChange('materialFactors', 'bulkDiscount', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Size
                  </label>
                  <input
                    type="text"
                    value={calculationData.materialFactors.unitSize}
                    onChange={(e) => handleInputChange('materialFactors', 'unitSize', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-800 mb-3">Cost Breakdown</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Material Cost:</span>
                    <span>${costBreakdown.materialCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waste (15%):</span>
                    <span>${costBreakdown.wasteCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Labor Cost:</span>
                    <span>${costBreakdown.laborCost.toFixed(2)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Total Cost:</span>
                    <span>${costBreakdown.totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Cost per unit:</span>
                    <span>${costBreakdown.costPerUnit.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <button
                  onClick={performCalculation}
                  disabled={isCalculating || !calculationData.procedureType.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isCalculating ? 'Calculating...' : 'Calculate Costs'}
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={saveCalculation}
                    disabled={costBreakdown.totalCost === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Save Calculation
                  </button>
                  <button
                    onClick={exportCalculation}
                    disabled={costBreakdown.totalCost === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Export
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CompactBox>

      {isCalculating && (
        <CompactBox title="Calculating..." defaultExpanded={true}>
          <LoadingSpinner text="Analyzing material requirements and calculating costs..." />
        </CompactBox>
      )}
    </div>
  );
};

export default MaterialCalculator;