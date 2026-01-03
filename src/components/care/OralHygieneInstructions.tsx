import React, { useState, useEffect } from 'react';
import CompactBox from '../shared/CompactBox';
import { FilteredCareInstructions, careDataService } from '../../services/careDataService';

interface OralHygieneInstructionsProps {
  procedureId: string;
  patientAge?: number;
  onPrintRequest?: () => void;
}

interface HygieneTechnique {
  id: string;
  title: string;
  icon: string;
  description: string;
  steps: string[];
  tips: string[];
  color: string;
  priority: 'high' | 'medium' | 'low';
}

const ORAL_HYGIENE_CATEGORIES = [
  {
    id: 'brushing',
    title: 'Brushing Techniques',
    icon: '🪥',
    color: 'primary',
    description: 'Proper tooth brushing methods for optimal plaque removal'
  },
  {
    id: 'flossing',
    title: 'Flossing & Interdental Care',
    icon: '🧵',
    color: 'accent',
    description: 'Cleaning between teeth and around dental work'
  },
  {
    id: 'rinsing',
    title: 'Mouth Rinsing',
    icon: '🧴',
    color: 'success',
    description: 'Antimicrobial rinses and therapeutic mouthwashes'
  },
  {
    id: 'special-care',
    title: 'Special Care Areas',
    icon: '🎯',
    color: 'warning',
    description: 'Care for surgical sites and healing areas'
  }
];

const OralHygieneInstructions: React.FC<OralHygieneInstructionsProps> = ({
  procedureId,
  patientAge,
  onPrintRequest
}) => {
  const [filteredInstructions, setFilteredInstructions] = useState<FilteredCareInstructions | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('brushing');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHygieneData();
  }, [procedureId, patientAge]);

  const loadHygieneData = async () => {
    try {
      setLoading(true);
      setError(null);
      const instructions = await careDataService.getFilteredCareInstructions(procedureId, patientAge);
      setFilteredInstructions(instructions);
    } catch (err) {
      setError('Failed to load oral hygiene instructions');
      console.error('Error loading hygiene data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getBrushingTechniques = (): HygieneTechnique[] => {
    return [
      {
        id: 'bass-technique',
        title: 'Modified Bass Technique',
        icon: '🎯',
        description: 'Gold standard technique for removing plaque along the gum line',
        steps: [
          'Place toothbrush at 45-degree angle to the gum line',
          'Use gentle, circular motions with short back-and-forth strokes',
          'Brush for at least 2 minutes, spending 30 seconds on each quadrant',
          'Brush the outer, inner, and chewing surfaces of all teeth',
          'Use a soft-bristled toothbrush to avoid gum damage'
        ],
        tips: [
          'Use light pressure - let the bristles do the work',
          'Replace toothbrush every 3-4 months or when bristles are frayed',
          'Use fluoride toothpaste for cavity prevention',
          'Don\'t forget to brush your tongue to remove bacteria'
        ],
        color: 'primary',
        priority: 'high'
      },
      {
        id: 'post-surgical-care',
        title: 'Post-Surgical Brushing',
        icon: '🩹',
        description: 'Gentle care for healing areas after dental procedures',
        steps: [
          'Use an extra-soft toothbrush for the first week',
          'Avoid brushing directly over surgical sites for 24-48 hours',
          'Brush surrounding teeth and areas gently',
          'Rinse with prescribed mouthwash as directed',
          'Gradually return to normal brushing as healing progresses'
        ],
        tips: [
          'Be extremely gentle around healing areas',
          'Use warm salt water rinses between brushings if recommended',
          'Avoid vigorous rinsing that could disturb healing tissue',
          'Follow your dentist\'s specific instructions for your procedure'
        ],
        color: 'warning',
        priority: 'high'
      },
      {
        id: 'electric-brushing',
        title: 'Electric Toothbrush Technique',
        icon: '⚡',
        description: 'Proper use of powered toothbrushes for effective cleaning',
        steps: [
          'Use gentle pressure - let the brush do the work',
          'Guide the brush slowly from tooth to tooth',
          'Spend 30 seconds on each quadrant of your mouth',
          'Hold the brush at a 45-degree angle to the gum line',
          'Clean the outer, inner, and chewing surfaces'
        ],
        tips: [
          'Choose a brush with soft bristles and pressure sensor',
          'Replace the brush head every 3 months',
          'Don\'t scrub - let the vibrations do the cleaning',
          'Use fluoride toothpaste designed for electric brushes'
        ],
        color: 'accent',
        priority: 'medium'
      }
    ];
  };

  const getFlossingTechniques = (): HygieneTechnique[] => {
    return [
      {
        id: 'traditional-flossing',
        title: 'Traditional Dental Flossing',
        icon: '🧵',
        description: 'Basic technique for cleaning between teeth',
        steps: [
          'Use about 18 inches of dental floss',
          'Wrap most of the floss around middle fingers, leaving 1-2 inches to work with',
          'Gently slide the floss between teeth using a sawing motion',
          'Curve the floss around each tooth in a C-shape',
          'Slide the floss up and down against the tooth surface and under the gum line'
        ],
        tips: [
          'Use a clean section of floss for each tooth',
          'Be gentle - don\'t snap the floss into gums',
          'Floss before brushing for best results',
          'If gums bleed slightly, continue gently - this is normal initially'
        ],
        color: 'accent',
        priority: 'high'
      },
      {
        id: 'flossing-around-restorations',
        title: 'Flossing Around Dental Work',
        icon: '🦷',
        description: 'Special considerations for crowns, bridges, and fillings',
        steps: [
          'Use floss threaders for bridges and orthodontic appliances',
          'Be extra gentle around temporary restorations',
          'Use waxed floss to prevent snagging on dental work',
          'Clean under bridge pontics thoroughly',
          'Use interdental brushes for larger gaps'
        ],
        tips: [
          'Consider using water flossers for easier cleaning around dental work',
          'Be patient - it takes practice to floss around complex restorations',
          'Ask your dentist to demonstrate proper technique for your specific dental work',
          'Don\'t skip flossing even if it feels different around dental work'
        ],
        color: 'warning',
        priority: 'high'
      },
      {
        id: 'interdental-cleaning',
        title: 'Interdental Brushes & Picks',
        icon: '🪥',
        description: 'Alternative tools for cleaning between teeth',
        steps: [
          'Choose the right size - should fit snugly but not too tight',
          'Insert gently between teeth without forcing',
          'Move back and forth several times',
          'Rinse the brush frequently during use',
          'Replace when bristles become worn (usually 1-2 weeks)'
        ],
        tips: [
          'Available in multiple sizes - use what fits comfortably',
          'Especially helpful for people with larger gaps or braces',
          'Can be reused several times if cleaned thoroughly',
          'May be easier to use than traditional floss for some people'
        ],
        color: 'success',
        priority: 'medium'
      }
    ];
  };

  const getMouthRinsingTechniques = (): HygieneTechnique[] => {
    return [
      {
        id: 'salt-water-rinse',
        title: 'Salt Water Rinse',
        icon: '🌊',
        description: 'Natural antimicrobial rinse for healing and comfort',
        steps: [
          'Mix 1/2 teaspoon of salt in 8 ounces of warm water',
          'Stir until salt dissolves completely',
          'Swish gently for 15-30 seconds',
          'Spit out - do not swallow',
          'Repeat 2-4 times daily as directed'
        ],
        tips: [
          'Use warm water - not hot',
          'Gentle swishing only - don\'t vigorously rinse',
          'Can reduce swelling and promote healing',
          'Safe and natural antimicrobial solution'
        ],
        color: 'success',
        priority: 'high'
      },
      {
        id: 'chlorhexidine-rinse',
        title: 'Chlorhexidine Mouth Rinse',
        icon: '🧪',
        description: 'Prescription antimicrobial rinse for infection prevention',
        steps: [
          'Use exactly as prescribed by your dentist',
          'Usually used twice daily after brushing',
          'Swish for 30 seconds, then spit out',
          'Do not rinse with water after using',
          'Wait 30 minutes before eating or drinking'
        ],
        tips: [
          'May cause temporary staining of teeth and tongue',
          'Can affect taste temporarily',
          'Complete the full course even if symptoms improve',
          'Not for long-term use without dental supervision'
        ],
        color: 'warning',
        priority: 'high'
      },
      {
        id: 'fluoride-rinse',
        title: 'Fluoride Mouth Rinse',
        icon: '🦷',
        description: 'Fluoride rinse for cavity prevention and sensitivity',
        steps: [
          'Use after brushing and flossing',
          'Swish for 1 minute, then spit out',
          'Do not eat or drink for 30 minutes after use',
          'Use once daily, usually at bedtime',
          'Do not use if you cannot spit effectively'
        ],
        tips: [
          'Not recommended for children under 6 years old',
          'Choose alcohol-free formulas for less irritation',
          'Can help with tooth sensitivity',
          'Provides additional cavity protection'
        ],
        color: 'primary',
        priority: 'medium'
      }
    ];
  };

  const getSpecialCareTechniques = (): HygieneTechnique[] => {
    return [
      {
        id: 'surgical-site-care',
        title: 'Surgical Site Care',
        icon: '🩹',
        description: 'Special care for extraction sites and surgical areas',
        steps: [
          'Do not brush surgical sites for 24-48 hours',
          'Use gentle salt water rinses after 24 hours',
          'Avoid touching the area with fingers or tongue',
          'Brush surrounding teeth carefully',
          'Use prescribed antimicrobial rinse if provided'
        ],
        tips: [
          'Healing takes time - be patient and gentle',
          'Some bleeding is normal for the first day',
          'Avoid vigorous rinsing or spitting',
          'Contact your dentist if you notice increasing pain or swelling'
        ],
        color: 'error',
        priority: 'high'
      },
      {
        id: 'orthodontic-care',
        title: 'Orthodontic Appliance Care',
        icon: '🦾',
        description: 'Cleaning around braces and orthodontic appliances',
        steps: [
          'Use a proxabrush or interdental brush for brackets',
          'Thread floss under wires using floss threaders',
          'Brush around each bracket thoroughly',
          'Use a water flosser for additional cleaning',
          'Consider prescription fluoride rinse for decalcification prevention'
        ],
        tips: [
          'Take extra time - orthodontic appliances require more cleaning',
          'Use disclosing tablets to check for missed plaque',
          'Carry a travel toothbrush for cleaning after meals',
          'Regular professional cleanings are especially important'
        ],
        color: 'accent',
        priority: 'high'
      },
      {
        id: 'implant-care',
        title: 'Dental Implant Care',
        icon: '🔧',
        description: 'Special care for dental implants to ensure longevity',
        steps: [
          'Brush twice daily with soft-bristled brush',
          'Use low-abrasive toothpaste to avoid scratching implant surfaces',
          'Clean thoroughly around implant abutment and crown',
          'Use interdental brushes for implant surrounding areas',
          'Consider antimicrobial mouthwash as recommended'
        ],
        tips: [
          'Implants require excellent oral hygiene for success',
          'Use water flossers around implants',
          'Regular professional cleanings are crucial',
          'Avoid smoking which can compromise implant health'
        ],
        color: 'primary',
        priority: 'high'
      }
    ];
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };

  const renderTechniqueCard = (technique: HygieneTechnique) => {
    const priorityColor = getPriorityColor(technique.priority);
    
    return (
      <div key={technique.id} className="bg-white border border-secondary-200 rounded-xl p-6 shadow-medical-card">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{technique.icon}</span>
            <div>
              <h4 className="font-semibold text-primary-800">{technique.title}</h4>
              <p className="text-sm text-secondary-600">{technique.description}</p>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs rounded-full bg-${priorityColor}-100 text-${priorityColor}-800`}>
            {technique.priority.toUpperCase()}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <h5 className="font-semibold text-primary-700 mb-2">Steps:</h5>
            <ol className="text-sm text-primary-600 space-y-1">
              {technique.steps.map((step, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2 mt-1 text-primary-500 font-bold">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h5 className="font-semibold text-primary-700 mb-2">Tips:</h5>
            <ul className="text-sm text-primary-600 space-y-1">
              {technique.tips.map((tip, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2 mt-1 text-primary-500">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderCategoryContent = () => {
    let techniques: HygieneTechnique[] = [];

    switch (selectedCategory) {
      case 'brushing':
        techniques = getBrushingTechniques();
        break;
      case 'flossing':
        techniques = getFlossingTechniques();
        break;
      case 'rinsing':
        techniques = getMouthRinsingTechniques();
        break;
      case 'special-care':
        techniques = getSpecialCareTechniques();
        break;
      default:
        techniques = [];
    }

    if (filteredInstructions?.careInstructions?.oralHygiene) {
      // Add procedure-specific instructions
      const specificInstructions = filteredInstructions.careInstructions.oralHygiene.map(instruction => ({
        id: instruction.id,
        title: instruction.title,
        icon: '🎯',
        description: instruction.description,
        steps: [instruction.description],
        tips: [`Priority: ${instruction.priority}`],
        color: getPriorityColor(instruction.priority) as any,
        priority: instruction.priority
      }));

      techniques = [...techniques, ...specificInstructions];
    }

    return (
      <div className="space-y-6">
        {techniques.map(renderTechniqueCard)}
      </div>
    );
  };

  const renderAgeSpecificCare = () => {
    if (!patientAge) return null;

    let ageSpecificCare = null;

    if (patientAge < 12) {
      ageSpecificCare = (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
          <h4 className="font-semibold text-primary-800 mb-4 flex items-center">
            <span className="mr-2">👶</span>
            Pediatric Oral Care (Age {patientAge})
          </h4>
          <div className="space-y-3">
            <div className="bg-white border border-primary-200 rounded-lg p-4">
              <h5 className="font-semibold text-primary-800">Supervised Brushing</h5>
              <p className="text-sm text-primary-700 mt-1">
                Parents should supervise and assist with brushing until age 8-10. 
                Use a pea-sized amount of fluoride toothpaste.
              </p>
            </div>
            <div className="bg-white border border-primary-200 rounded-lg p-4">
              <h5 className="font-semibold text-primary-800">Fun Techniques</h5>
              <p className="text-sm text-primary-700 mt-1">
                Make brushing fun with timers, songs, or reward systems. 
                Let children choose their own toothbrush to increase motivation.
              </p>
            </div>
          </div>
        </div>
      );
    } else if (patientAge >= 65) {
      ageSpecificCare = (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-6">
          <h4 className="font-semibold text-warning-800 mb-4 flex items-center">
            <span className="mr-2">👴</span>
            Senior Oral Care (Age {patientAge})
          </h4>
          <div className="space-y-3">
            <div className="bg-white border border-warning-200 rounded-lg p-4">
              <h5 className="font-semibold text-warning-800">Arthritis Considerations</h5>
              <p className="text-sm text-warning-700 mt-1">
                Consider electric toothbrushes or toothbrushes with larger handles 
                if dexterity is limited due to arthritis.
              </p>
            </div>
            <div className="bg-white border border-warning-200 rounded-lg p-4">
              <h5 className="font-semibold text-warning-800">Dry Mouth Management</h5>
              <p className="text-sm text-warning-700 mt-1">
                Use alcohol-free mouthwashes and consider saliva substitutes. 
                Stay hydrated and avoid medications that cause dry mouth if possible.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return ageSpecificCare;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-secondary-600">Loading oral hygiene instructions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-50 border border-error-200 rounded-xl p-6 text-center">
        <p className="text-error-700">{error}</p>
        <button
          onClick={loadHygieneData}
          className="mt-4 px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-medical-gradient rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Oral Hygiene Instructions</h2>
            <p className="text-white text-opacity-90">
              Proper oral hygiene is essential for healing and long-term oral health
              {patientAge && (
                <span className="ml-2 text-sm">
                  (Age-specific guidance included)
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
              Print Hygiene Guide
            </button>
          )}
        </div>
      </div>

      {/* Category Selection */}
      <CompactBox title="Hygiene Categories" defaultExpanded={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {ORAL_HYGIENE_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`p-4 rounded-xl border text-sm transition-all duration-200 transform hover:scale-105 ${
                selectedCategory === category.id
                  ? `bg-${category.color}-100 border-${category.color}-300 text-${category.color}-800 shadow-medical-card`
                  : 'bg-white border-secondary-200 hover:bg-secondary-50 hover:shadow-medical-card'
              }`}
            >
              <div className="text-2xl mb-2">{category.icon}</div>
              <div className="font-semibold">{category.title}</div>
              <div className="text-xs mt-1 opacity-80">{category.description}</div>
            </button>
          ))}
        </div>

        {/* Selected Category Content */}
        <div className={`bg-${ORAL_HYGIENE_CATEGORIES.find(c => c.id === selectedCategory)?.color}-50 border border-${ORAL_HYGIENE_CATEGORIES.find(c => c.id === selectedCategory)?.color}-200 rounded-xl p-6`}>
          <h4 className={`font-semibold text-${ORAL_HYGIENE_CATEGORIES.find(c => c.id === selectedCategory)?.color}-800 mb-4 flex items-center`}>
            <span className="mr-2 text-lg">
              {ORAL_HYGIENE_CATEGORIES.find(c => c.id === selectedCategory)?.icon}
            </span>
            {ORAL_HYGIENE_CATEGORIES.find(c => c.id === selectedCategory)?.title}
          </h4>
          {renderCategoryContent()}
        </div>
      </CompactBox>

      {/* Age-Specific Care */}
      {renderAgeSpecificCare()}

      {/* Daily Routine Checklist */}
      <CompactBox title="Daily Oral Hygiene Routine" defaultExpanded={false}>
        <div className="bg-success-50 border border-success-200 rounded-xl p-6">
          <h4 className="font-semibold text-success-800 mb-4 flex items-center">
            <span className="mr-2">✅</span>
            Your Daily Checklist
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h5 className="font-semibold text-success-700">Morning Routine</h5>
              <div className="space-y-2">
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="w-4 h-4 text-success-600 border-secondary-300 rounded focus:ring-success-500" />
                  <span className="text-sm text-success-700">Brush teeth for 2 minutes</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="w-4 h-4 text-success-600 border-secondary-300 rounded focus:ring-success-500" />
                  <span className="text-sm text-success-700">Floss between all teeth</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="w-4 h-4 text-success-600 border-secondary-300 rounded focus:ring-success-500" />
                  <span className="text-sm text-success-700">Use mouthwash if recommended</span>
                </label>
              </div>
            </div>
            <div className="space-y-3">
              <h5 className="font-semibold text-success-700">Evening Routine</h5>
              <div className="space-y-2">
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="w-4 h-4 text-success-600 border-secondary-300 rounded focus:ring-success-500" />
                  <span className="text-sm text-success-700">Brush teeth for 2 minutes</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="w-4 h-4 text-success-600 border-secondary-300 rounded focus:ring-success-500" />
                  <span className="text-sm text-success-700">Floss between all teeth</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="w-4 h-4 text-success-600 border-secondary-300 rounded focus:ring-success-500" />
                  <span className="text-sm text-success-700">Use prescribed rinse if applicable</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </CompactBox>

      {/* Common Mistakes */}
      <CompactBox title="Common Oral Hygiene Mistakes to Avoid" defaultExpanded={false}>
        <div className="bg-error-50 border border-error-200 rounded-xl p-6">
          <h4 className="font-semibold text-error-800 mb-4 flex items-center">
            <span className="mr-2">⚠️</span>
            Mistakes That Can Harm Your Recovery
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-error-200 rounded-lg p-4">
              <h5 className="font-semibold text-error-800 mb-2">🚫 Brushing Too Hard</h5>
              <p className="text-sm text-error-700">
                Hard brushing can damage gums and tooth enamel. Use gentle pressure and let the bristles do the work.
              </p>
            </div>
            <div className="bg-white border border-error-200 rounded-lg p-4">
              <h5 className="font-semibold text-error-800 mb-2">🚫 Skipping Flossing</h5>
              <p className="text-sm text-error-700">
                Brushing alone misses 40% of tooth surfaces. Daily flossing is essential for complete oral care.
              </p>
            </div>
            <div className="bg-white border border-error-200 rounded-lg p-4">
              <h5 className="font-semibold text-error-800 mb-2">🚫 Rinsing After Brushing</h5>
              <p className="text-sm text-error-700">
                Rinsing with water immediately after brushing washes away protective fluoride. Spit, don't rinse.
              </p>
            </div>
            <div className="bg-white border border-error-200 rounded-lg p-4">
              <h5 className="font-semibold text-error-800 mb-2">🚫 Ignoring Healing Areas</h5>
              <p className="text-sm text-error-700">
                Completely avoiding healing areas can lead to poor hygiene. Clean gently around them as directed.
              </p>
            </div>
          </div>
        </div>
      </CompactBox>

      {/* Professional Care */}
      <CompactBox title="Professional Care & Follow-up" defaultExpanded={false}>
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
          <h4 className="font-semibold text-primary-800 mb-4 flex items-center">
            <span className="mr-2">👨‍⚕️</span>
            When to Contact Your Dental Team
          </h4>
          <div className="space-y-3">
            <div className="bg-white border border-primary-200 rounded-lg p-4">
              <h5 className="font-semibold text-primary-800">Signs of Infection</h5>
              <p className="text-sm text-primary-700 mt-1">
                Increasing pain, swelling, fever, or pus around treated areas require immediate attention.
              </p>
            </div>
            <div className="bg-white border border-primary-200 rounded-lg p-4">
              <h5 className="font-semibold text-primary-800">Difficulty with Oral Care</h5>
              <p className="text-sm text-primary-700 mt-1">
                If you're unable to maintain proper hygiene due to pain or other issues, contact your dentist.
              </p>
            </div>
            <div className="bg-white border border-primary-200 rounded-lg p-4">
              <h5 className="font-semibold text-primary-800">Questions About Technique</h5>
              <p className="text-sm text-primary-700 mt-1">
                Always ask for demonstrations of proper techniques during your appointments.
              </p>
            </div>
          </div>
        </div>
      </CompactBox>

      {/* Clinical Disclaimer */}
      <div className="bg-secondary-50 border border-secondary-200 rounded-xl p-6">
        <h4 className="font-semibold text-secondary-800 mb-3 flex items-center">
          <span className="mr-2">ℹ️</span>
          Important Reminder
        </h4>
        <p className="text-secondary-700 text-sm">
          These oral hygiene instructions are general guidelines. Always follow the specific instructions 
          provided by your dental healthcare provider, as individual needs may vary based on your 
          procedure, healing progress, and oral health status.
        </p>
      </div>
    </div>
  );
};

export default OralHygieneInstructions;