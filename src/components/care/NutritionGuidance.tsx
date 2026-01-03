import React, { useState, useEffect } from 'react';
import CompactBox from '../shared/CompactBox';
import { FilteredCareInstructions, careDataService } from '../../services/careDataService';

interface NutritionGuidanceProps {
  procedureId: string;
  patientAge?: number;
  onPrintRequest?: () => void;
}

interface NutritionCategory {
  id: string;
  title: string;
  icon: string;
  color: string;
  description: string;
}

const NUTRITION_CATEGORIES: NutritionCategory[] = [
  {
    id: 'foodsToEat',
    title: 'Recommended Foods',
    icon: '✅',
    color: 'success',
    description: 'Foods that promote healing and are safe to consume'
  },
  {
    id: 'foodsToAvoid',
    title: 'Foods to Avoid',
    icon: '❌',
    color: 'error',
    description: 'Foods that may interfere with healing or cause discomfort'
  },
  {
    id: 'hydrationGuidelines',
    title: 'Hydration Guidelines',
    icon: '💧',
    color: 'accent',
    description: 'Important hydration recommendations for optimal recovery'
  },
  {
    id: 'supplements',
    title: 'Recommended Supplements',
    icon: '💊',
    color: 'primary',
    description: 'Nutritional supplements that may support healing'
  }
];

const NutritionGuidance: React.FC<NutritionGuidanceProps> = ({
  procedureId,
  patientAge,
  onPrintRequest
}) => {
  const [filteredInstructions, setFilteredInstructions] = useState<FilteredCareInstructions | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('foodsToEat');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNutritionData();
  }, [procedureId, patientAge]);

  const loadNutritionData = async () => {
    try {
      setLoading(true);
      setError(null);
      const instructions = await careDataService.getFilteredCareInstructions(procedureId, patientAge);
      setFilteredInstructions(instructions);
    } catch (err) {
      setError('Failed to load nutrition guidance');
      console.error('Error loading nutrition data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAgeSpecificRecommendations = (nutrition: any, age?: number) => {
    if (!age) return nutrition;

    // Age-specific adjustments
    const recommendations = { ...nutrition };

    if (age < 18) {
      // Pediatric recommendations
      recommendations.foodsToEat = [
        ...recommendations.foodsToEat,
        'Soft fruits like bananas and applesauce',
        'Yogurt with probiotics for immune support',
        'Smoothies with protein powder if recommended'
      ];
    } else if (age > 65) {
      // Geriatric recommendations
      recommendations.foodsToEat = [
        ...recommendations.foodsToEat,
        'Soft protein sources like scrambled eggs and fish',
        'Calcium-rich foods for bone health',
        'Easy-to-chew foods for potential denture considerations'
      ];
      recommendations.supplements = [
        ...(recommendations.supplements || []),
        'Vitamin D for bone health (if deficient)',
        'B12 supplement if on certain medications'
      ];
    }

    return recommendations;
  };

  const renderNutritionCard = (title: string, items: string[], icon: string, color: string) => {
    if (!items || items.length === 0) {
      return (
        <div className="text-center py-8 text-secondary-500">
          <p>No {title.toLowerCase()} available</p>
        </div>
      );
    }

    return (
      <div className={`bg-${color}-50 border border-${color}-200 rounded-xl p-6 shadow-medical-card`}>
        <h4 className={`font-semibold text-${color}-800 mb-4 flex items-center`}>
          <span className="mr-2 text-lg">{icon}</span>
          {title}
        </h4>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="bg-white border border-${color}-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <span className={`text-${color}-600 font-bold mt-1`}>•</span>
                <p className={`text-sm text-${color}-700`}>{item}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMealPlanning = () => {
    if (!filteredInstructions?.careInstructions?.nutrition) {
      return null;
    }

    const nutrition = getAgeSpecificRecommendations(filteredInstructions.careInstructions.nutrition, patientAge);

    // Sample meal suggestions based on procedure type
    const mealSuggestions = {
      breakfast: [
        'Smoothie with banana, yogurt, and protein powder',
        'Scrambled eggs with soft toast',
        'Oatmeal with mashed berries',
        'Greek yogurt with honey'
      ],
      lunch: [
        'Creamy tomato soup with soft crackers',
        'Mashed potato with soft-cooked vegetables',
        'Yogurt with soft fruits',
        'Smoothie bowl with soft toppings'
      ],
      dinner: [
        'Soft-cooked fish with mashed sweet potato',
        'Chicken soup with soft vegetables',
        'Pasta with creamy sauce',
        'Slow-cooked stew with tender meat'
      ],
      snacks: [
        'Applesauce cups',
        'Yogurt with granola (if tolerated)',
        'Smoothies',
        'Soft cheese with crackers'
      ]
    };

    return (
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
        <h4 className="font-semibold text-primary-800 mb-4 flex items-center">
          <span className="mr-2">🍽️</span>
          Sample Meal Planning
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(mealSuggestions).map(([mealType, suggestions]) => (
            <div key={mealType} className="bg-white border border-primary-200 rounded-lg p-4">
              <h5 className="font-semibold text-primary-800 mb-3 capitalize flex items-center">
                <span className="mr-2">
                  {mealType === 'breakfast' && '🌅'}
                  {mealType === 'lunch' && '☀️'}
                  {mealType === 'dinner' && '🌙'}
                  {mealType === 'snacks' && '🍎'}
                </span>
                {mealType}
              </h5>
              <ul className="text-sm text-primary-700 space-y-2">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2 mt-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHealingNutrition = () => {
    if (!filteredInstructions?.careInstructions?.nutrition) {
      return null;
    }

    const healingFoods = [
      {
        nutrient: 'Protein',
        sources: 'Eggs, fish, chicken, Greek yogurt',
        benefit: 'Supports tissue repair and healing',
        icon: '🥩'
      },
      {
        nutrient: 'Vitamin C',
        sources: 'Citrus fruits, berries, bell peppers',
        benefit: 'Essential for collagen formation',
        icon: '🍊'
      },
      {
        nutrient: 'Zinc',
        sources: 'Lean meats, nuts, seeds',
        benefit: 'Promotes wound healing',
        icon: '🥜'
      },
      {
        nutrient: 'Omega-3',
        sources: 'Fatty fish, walnuts, flax seeds',
        benefit: 'Reduces inflammation',
        icon: '🐟'
      }
    ];

    return (
      <div className="bg-accent-50 border border-accent-200 rounded-xl p-6">
        <h4 className="font-semibold text-accent-800 mb-4 flex items-center">
          <span className="mr-2">🌟</span>
          Healing-Optimized Nutrition
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {healingFoods.map((food, index) => (
            <div key={index} className="bg-white border border-accent-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{food.icon}</span>
                <div>
                  <h5 className="font-semibold text-accent-800">{food.nutrient}</h5>
                  <p className="text-sm text-accent-700 mt-1">
                    <strong>Sources:</strong> {food.sources}
                  </p>
                  <p className="text-sm text-accent-700">
                    <strong>Benefit:</strong> {food.benefit}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-secondary-600">Loading nutrition guidance...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-50 border border-error-200 rounded-xl p-6 text-center">
        <p className="text-error-700">{error}</p>
        <button
          onClick={loadNutritionData}
          className="mt-4 px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!filteredInstructions?.careInstructions?.nutrition) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-500">No nutrition guidance available for this procedure.</p>
      </div>
    );
  }

  const nutrition = getAgeSpecificRecommendations(filteredInstructions.careInstructions.nutrition, patientAge);
  const selectedData = nutrition[selectedCategory as keyof typeof nutrition] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-medical-gradient rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Nutrition & Dietary Guidance</h2>
            <p className="text-white text-opacity-90">
              Proper nutrition supports healing and optimal recovery
              {patientAge && (
                <span className="ml-2 text-sm">
                  (Age-specific recommendations included)
                </span>
              )}
            </p>
          </div>
          {onPrintRequest && (
            <button
              onClick={onPrintRequest}
              className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Nutrition Guide
            </button>
          )}
        </div>
      </div>

      {/* Category Selection */}
      <CompactBox title="Nutrition Categories" defaultExpanded={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {NUTRITION_CATEGORIES.map((category) => {
            const hasData = nutrition[category.id as keyof typeof nutrition] && 
                           (nutrition[category.id as keyof typeof nutrition] as any[]).length > 0;
            
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                disabled={!hasData}
                className={`p-4 rounded-xl border text-sm transition-all duration-200 transform hover:scale-105 ${
                  selectedCategory === category.id && hasData
                    ? `bg-${category.color}-100 border-${category.color}-300 text-${category.color}-800 shadow-medical-card`
                    : hasData
                    ? 'bg-white border-secondary-200 hover:bg-secondary-50 hover:shadow-medical-card'
                    : 'bg-secondary-50 border-secondary-200 text-secondary-400 cursor-not-allowed'
                }`}
              >
                <div className="text-2xl mb-2">{category.icon}</div>
                <div className="font-semibold">{category.title}</div>
                <div className="text-xs mt-1 opacity-80">{category.description}</div>
              </button>
            );
          })}
        </div>

        {/* Selected Category Content */}
        <div className={`bg-${NUTRITION_CATEGORIES.find(c => c.id === selectedCategory)?.color}-50 border border-${NUTRITION_CATEGORIES.find(c => c.id === selectedCategory)?.color}-200 rounded-xl p-6`}>
          <h4 className={`font-semibold text-${NUTRITION_CATEGORIES.find(c => c.id === selectedCategory)?.color}-800 mb-4 flex items-center`}>
            <span className="mr-2 text-lg">
              {NUTRITION_CATEGORIES.find(c => c.id === selectedCategory)?.icon}
            </span>
            {NUTRITION_CATEGORIES.find(c => c.id === selectedCategory)?.title}
          </h4>
          {renderNutritionCard(
            NUTRITION_CATEGORIES.find(c => c.id === selectedCategory)?.title || '',
            selectedData as string[],
            NUTRITION_CATEGORIES.find(c => c.id === selectedCategory)?.icon || '',
            NUTRITION_CATEGORIES.find(c => c.id === selectedCategory)?.color || 'secondary'
          )}
        </div>
      </CompactBox>

      {/* Healing-Optimized Nutrition */}
      <CompactBox title="Healing-Optimized Nutrition" defaultExpanded={false}>
        {renderHealingNutrition()}
      </CompactBox>

      {/* Sample Meal Planning */}
      <CompactBox title="Sample Meal Planning" defaultExpanded={false}>
        {renderMealPlanning()}
      </CompactBox>

      {/* Special Dietary Considerations */}
      {patientAge && (
        <CompactBox title="Age-Specific Dietary Considerations" defaultExpanded={false}>
          <div className="bg-warning-50 border border-warning-200 rounded-xl p-6">
            <h4 className="font-semibold text-warning-800 mb-4 flex items-center">
              <span className="mr-2">👤</span>
              Personalized for Age {patientAge}
            </h4>
            <div className="space-y-3">
              {patientAge < 18 && (
                <div className="bg-white border border-warning-200 rounded-lg p-4">
                  <h5 className="font-semibold text-warning-800">Pediatric Considerations</h5>
                  <p className="text-sm text-warning-700 mt-1">
                    Focus on soft, nutritious foods that are easy to consume. Ensure adequate calcium 
                    and vitamin D for developing teeth and bones.
                  </p>
                </div>
              )}
              {patientAge >= 18 && patientAge < 65 && (
                <div className="bg-white border border-warning-200 rounded-lg p-4">
                  <h5 className="font-semibold text-warning-800">Adult Considerations</h5>
                  <p className="text-sm text-warning-700 mt-1">
                    Maintain a balanced diet with adequate protein and vitamins. Focus on foods that 
                    support immune function and tissue healing.
                  </p>
                </div>
              )}
              {patientAge >= 65 && (
                <div className="bg-white border border-warning-200 rounded-lg p-4">
                  <h5 className="font-semibold text-warning-800">Geriatric Considerations</h5>
                  <p className="text-sm text-warning-700 mt-1">
                    Emphasize soft, easy-to-chew foods. Consider potential medication interactions 
                    and ensure adequate hydration.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CompactBox>
      )}

      {/* Procedure-Specific Tips */}
      <CompactBox title="Procedure-Specific Nutrition Tips" defaultExpanded={false}>
        <div className="bg-info-50 border border-info-200 rounded-xl p-6">
          <h4 className="font-semibold text-info-800 mb-4 flex items-center">
            <span className="mr-2">💡</span>
            Important Tips for Your Recovery
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-info-200 rounded-lg p-4">
              <h5 className="font-semibold text-info-800 mb-2">Temperature Considerations</h5>
              <p className="text-sm text-info-700">
                Avoid very hot foods and drinks for 24-48 hours. Room temperature or cool foods 
                are best for comfort and healing.
              </p>
            </div>
            <div className="bg-white border border-info-200 rounded-lg p-4">
              <h5 className="font-semibold text-info-800 mb-2">Texture Guidelines</h5>
              <p className="text-sm text-info-700">
                Start with soft foods and gradually return to normal diet as comfort allows. 
                Avoid foods with small particles that could irritate healing areas.
              </p>
            </div>
            <div className="bg-white border border-info-200 rounded-lg p-4">
              <h5 className="font-semibold text-info-800 mb-2">Hydration Importance</h5>
              <p className="text-sm text-info-700">
                Drink plenty of water to support healing and prevent dry mouth. Avoid using 
                straws for the first 24-48 hours after oral surgery.
              </p>
            </div>
            <div className="bg-white border border-info-200 rounded-lg p-4">
              <h5 className="font-semibold text-info-800 mb-2">Sugar Considerations</h5>
              <p className="text-sm text-info-700">
                Minimize sugary foods and drinks to reduce bacterial growth and support 
                optimal healing conditions.
              </p>
            </div>
          </div>
        </div>
      </CompactBox>

      {/* Clinical Disclaimer */}
      <div className="bg-secondary-50 border border-secondary-200 rounded-xl p-6">
        <h4 className="font-semibold text-secondary-800 mb-3 flex items-center">
          <span className="mr-2">⚠️</span>
          Important Notice
        </h4>
        <p className="text-secondary-700 text-sm">
          These nutrition guidelines are general recommendations. Always consult with your dental 
          healthcare provider for personalized dietary advice based on your specific procedure, 
          medical history, and individual needs.
        </p>
      </div>
    </div>
  );
};

export default NutritionGuidance;