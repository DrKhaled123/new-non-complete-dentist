import React, { useState, useEffect } from 'react';
import CompactBox from '../shared/CompactBox';
import { CareInstructions, FilteredCareInstructions, careDataService } from '../../services/careDataService';

interface CareInstructionsViewProps {
  procedureId: string;
  patientAge?: number;
  onInstructionToggle?: (instructionId: string, completed: boolean) => void;
  onPrintRequest?: () => void;
}

type Timeframe = 'preOperative' | 'immediate' | 'first24Hours' | 'firstWeek' | 'ongoing';

interface TimeframeConfig {
  key: Timeframe;
  title: string;
  icon: string;
  color: string;
  description: string;
}

const TIMEFRAME_CONFIGS: TimeframeConfig[] = [
  {
    key: 'preOperative',
    title: 'Pre-Operative',
    icon: '📋',
    color: 'blue',
    description: 'Instructions to follow before your procedure'
  },
  {
    key: 'immediate',
    title: 'Immediate',
    icon: '🕐',
    color: 'red',
    description: 'First few hours after procedure'
  },
  {
    key: 'first24Hours',
    title: 'First 24 Hours',
    icon: '🌅',
    color: 'orange',
    description: 'Care during the first day'
  },
  {
    key: 'firstWeek',
    title: 'First Week',
    icon: '📅',
    color: 'yellow',
    description: 'Care during the first week of recovery'
  },
  {
    key: 'ongoing',
    title: 'Ongoing Care',
    icon: '🔄',
    color: 'green',
    description: 'Long-term care and maintenance'
  }
];

const CareInstructionsView: React.FC<CareInstructionsViewProps> = ({
  procedureId,
  patientAge,
  onInstructionToggle,
  onPrintRequest
}) => {
  const [filteredInstructions, setFilteredInstructions] = useState<FilteredCareInstructions | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('preOperative');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCareInstructions();
  }, [procedureId, patientAge]);

  const loadCareInstructions = async () => {
    try {
      setLoading(true);
      setError(null);
      const instructions = await careDataService.getFilteredCareInstructions(procedureId, patientAge);
      setFilteredInstructions(instructions);
    } catch (err) {
      setError('Failed to load care instructions');
      console.error('Error loading care instructions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInstructionToggle = (instructionId: string, completed: boolean) => {
    if (completed) {
      careDataService.markInstructionCompleted(procedureId, instructionId);
    } else {
      careDataService.markInstructionIncomplete(procedureId, instructionId);
    }
    onInstructionToggle?.(instructionId, completed);
    
    // Refresh the data to reflect completion status
    loadCareInstructions();
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const renderInstructionsList = (instructions: any[], title: string, showCheckbox = true) => {
    if (!instructions || instructions.length === 0) {
      return (
        <div className="text-center py-8 text-secondary-500">
          <p>No {title.toLowerCase()} instructions available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {instructions.map((instruction) => {
          const isCompleted = filteredInstructions?.completedInstructions.includes(instruction.id) || false;
          const priorityColor = getPriorityColor(instruction.priority);
          const priorityIcon = getPriorityIcon(instruction.priority);

          return (
            <div
              key={instruction.id}
              className={`bg-white border rounded-xl p-4 shadow-medical-card transition-all duration-200 ${
                isCompleted ? 'opacity-75 bg-success-50 border-success-200' : 'border-secondary-200 hover:shadow-medical-hover'
              }`}
            >
              <div className="flex items-start space-x-3">
                {showCheckbox && (
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={(e) => handleInstructionToggle(instruction.id, e.target.checked)}
                    className="mt-1 w-5 h-5 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">{priorityIcon}</span>
                    <h4 className={`font-semibold ${isCompleted ? 'text-success-800 line-through' : 'text-primary-800'}`}>
                      {instruction.title}
                    </h4>
                    <span className={`px-2 py-1 text-xs rounded-full bg-${priorityColor}-100 text-${priorityColor}-800`}>
                      {instruction.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className={`text-sm ${isCompleted ? 'text-success-700' : 'text-secondary-700'}`}>
                    {instruction.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTimeframeInstructions = () => {
    if (!filteredInstructions?.careInstructions) {
      return null;
    }

    const careInstructions = filteredInstructions.careInstructions;
    let instructions: any[] = [];

    if (selectedTimeframe === 'preOperative') {
      instructions = careInstructions.preOperative;
    } else {
      instructions = careInstructions.postOperative[selectedTimeframe] || [];
    }

    return renderInstructionsList(instructions, TIMEFRAME_CONFIGS.find(t => t.key === selectedTimeframe)?.title || '');
  };

  const renderPainManagement = () => {
    if (!filteredInstructions?.careInstructions?.painManagement) {
      return null;
    }

    return renderInstructionsList(filteredInstructions.careInstructions.painManagement, 'Pain Management');
  };

  const renderWarningSigns = () => {
    if (!filteredInstructions?.careInstructions?.warningSigns) {
      return null;
    }

    return (
      <div className="bg-error-50 border border-error-200 rounded-xl p-6">
        <h4 className="font-semibold text-error-800 mb-4 flex items-center">
          <span className="mr-2">⚠️</span>
          Warning Signs - Contact Your Dentist Immediately
        </h4>
        <div className="space-y-3">
          {filteredInstructions.careInstructions.warningSigns.map((warning) => (
            <div key={warning.id} className="bg-white border border-error-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <span className="text-error-600 font-bold">🚨</span>
                <div>
                  <h5 className="font-semibold text-error-800">{warning.title}</h5>
                  <p className="text-sm text-error-700 mt-1">{warning.description}</p>
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
        <span className="ml-3 text-secondary-600">Loading care instructions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-50 border border-error-200 rounded-xl p-6 text-center">
        <p className="text-error-700">{error}</p>
        <button
          onClick={loadCareInstructions}
          className="mt-4 px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!filteredInstructions) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-500">No care instructions available for this procedure.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-medical-gradient rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Care Instructions for {filteredInstructions.procedure}</h2>
            <p className="text-white text-opacity-90">Follow these instructions for optimal treatment outcomes</p>
          </div>
          {onPrintRequest && (
            <button
              onClick={onPrintRequest}
              className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Instructions
            </button>
          )}
        </div>
      </div>

      {/* Timeline Selection */}
      <CompactBox title="Care Timeline" defaultExpanded={true}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
          {TIMEFRAME_CONFIGS.map((timeframe) => (
            <button
              key={timeframe.key}
              onClick={() => setSelectedTimeframe(timeframe.key)}
              className={`p-4 rounded-xl border text-sm transition-all duration-200 transform hover:scale-105 ${
                selectedTimeframe === timeframe.key
                  ? `bg-${timeframe.color}-100 border-${timeframe.color}-300 text-${timeframe.color}-800 shadow-medical-card`
                  : 'bg-white border-secondary-200 hover:bg-secondary-50 hover:shadow-medical-card'
              }`}
            >
              <div className="text-2xl mb-2">{timeframe.icon}</div>
              <div className="font-semibold">{timeframe.title}</div>
              <div className="text-xs mt-1 opacity-80">{timeframe.description}</div>
            </button>
          ))}
        </div>

        {/* Selected Timeframe Instructions */}
        <div className={`bg-${TIMEFRAME_CONFIGS.find(t => t.key === selectedTimeframe)?.color}-50 border border-${TIMEFRAME_CONFIGS.find(t => t.key === selectedTimeframe)?.color}-200 rounded-xl p-6`}>
          <h4 className={`font-semibold text-${TIMEFRAME_CONFIGS.find(t => t.key === selectedTimeframe)?.color}-800 mb-4 flex items-center`}>
            <span className="mr-2 text-lg">
              {TIMEFRAME_CONFIGS.find(t => t.key === selectedTimeframe)?.icon}
            </span>
            {TIMEFRAME_CONFIGS.find(t => t.key === selectedTimeframe)?.title} Instructions
          </h4>
          {renderTimeframeInstructions()}
        </div>
      </CompactBox>

      {/* Pain Management */}
      <CompactBox title="Pain Management Guidelines" defaultExpanded={true}>
        {renderPainManagement()}
      </CompactBox>

      {/* Warning Signs */}
      <CompactBox title="Warning Signs & Emergency Information" defaultExpanded={true}>
        {renderWarningSigns()}
      </CompactBox>

      {/* Emergency Contacts */}
      {filteredInstructions.emergencyContacts && filteredInstructions.emergencyContacts.length > 0 && (
        <CompactBox title="Emergency Contact Information" defaultExpanded={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInstructions.emergencyContacts.map((contact, index) => (
              <div key={index} className="bg-error-50 border border-error-200 rounded-xl p-5 shadow-medical-card">
                <h5 className="font-semibold text-error-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {contact.situation}
                </h5>
                <div className="text-error-700 text-sm space-y-2">
                  <p><strong className="text-current">Immediate Action:</strong> {contact.action}</p>
                  <p><strong className="text-current">Contact:</strong> {contact.contact}</p>
                </div>
              </div>
            ))}
          </div>
        </CompactBox>
      )}

      {/* Medication Reminders */}
      {filteredInstructions.medicationReminders && filteredInstructions.medicationReminders.length > 0 && (
        <CompactBox title="Medication Reminders" defaultExpanded={false}>
          <div className="bg-accent-50 border border-accent-200 rounded-xl p-6">
            <h4 className="font-semibold text-accent-800 mb-4 flex items-center">
              <span className="mr-2">💊</span>
              Important Medication Information
            </h4>
            <div className="space-y-3">
              {filteredInstructions.medicationReminders.map((reminder, index) => (
                <div key={index} className="bg-white border border-accent-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <span className="text-accent-600 font-bold">💊</span>
                    <div>
                      <h5 className="font-semibold text-accent-800">{reminder.medication}</h5>
                      <p className="text-sm text-accent-700 mt-1">
                        <strong>Dosage:</strong> {reminder.dosage} | <strong>Timing:</strong> {reminder.timing}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CompactBox>
      )}

      {/* Follow-up Appointments */}
      {filteredInstructions.followUpAppointments && filteredInstructions.followUpAppointments.length > 0 && (
        <CompactBox title="Follow-up Appointments" defaultExpanded={false}>
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
            <h4 className="font-semibold text-primary-800 mb-4 flex items-center">
              <span className="mr-2">📅</span>
              Scheduled Follow-up Care
            </h4>
            <div className="space-y-3">
              {filteredInstructions.followUpAppointments.map((appointment, index) => (
                <div key={index} className="bg-white border border-primary-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <span className="text-primary-600 font-bold">📅</span>
                    <div>
                      <h5 className="font-semibold text-primary-800">{appointment.type}</h5>
                      <p className="text-sm text-primary-700 mt-1">
                        <strong>Timing:</strong> {appointment.timing}
                      </p>
                      <p className="text-sm text-primary-700">
                        <strong>Purpose:</strong> {appointment.purpose}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CompactBox>
      )}

      {/* Progress Summary */}
      {filteredInstructions.completedInstructions && filteredInstructions.completedInstructions.length > 0 && (
        <div className="bg-success-50 border border-success-200 rounded-xl p-6">
          <h4 className="font-semibold text-success-800 mb-3 flex items-center">
            <span className="mr-2">✅</span>
            Your Progress
          </h4>
          <p className="text-success-700">
            You have completed {filteredInstructions.completedInstructions.length} instruction(s). 
            Keep up the good work! 🎉
          </p>
        </div>
      )}
    </div>
  );
};

export default CareInstructionsView;