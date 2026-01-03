import React, { useState, useEffect } from 'react';
import { Case, Note, Treatment, Dose } from '../../types';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useToast } from '../shared/ToastContainer';
import { caseService } from '../../services/caseService';
import { followUpSystem } from '../../services/followUpSystem';
import { format } from 'date-fns';

interface CaseDetailViewProps {
  caseId: string;
  doctorProfile: { name: string; email: string; specialization: string; licenseNumber: string } | null;
  onEdit: (case_: Case) => void;
  onBack: () => void;
}

interface TimelineEvent {
  id: string;
  date: Date;
  type: 'created' | 'updated' | 'treatment' | 'prescription' | 'followup' | 'note';
  title: string;
  description: string;
  status?: 'completed' | 'pending' | 'in-progress';
  details?: any;
}

interface ProgressMetrics {
  totalTreatments: number;
  completedTreatments: number;
  pendingTreatments: number;
  followUpsCompleted: number;
  followUpsPending: number;
  prescriptionsCount: number;
  overallProgress: number;
}

const CaseDetailView: React.FC<CaseDetailViewProps> = ({
  caseId,
  doctorProfile,
  onEdit,
  onBack
}) => {
  const [case_, setCase_] = useState<Case | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [progress, setProgress] = useState<ProgressMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'treatments' | 'notes' | 'analytics'>('overview');
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (caseId) {
      loadCaseData();
    }
  }, [caseId]);

  const loadCaseData = async () => {
    try {
      setIsLoading(true);
      const caseData = await caseService.getCaseById(caseId);
      if (!caseData) {
        showError('Case not found');
        return;
      }

      setCase_(caseData);
      await generateTimeline(caseData);
      await calculateProgress(caseData);
    } catch (error) {
      console.error('Failed to load case:', error);
      showError('Failed to load case data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateTimeline = async (caseData: Case) => {
    const events: TimelineEvent[] = [];

    // Case creation event
    events.push({
      id: 'case_created',
      date: new Date(caseData.createdAt),
      type: 'created',
      title: 'Case Created',
      description: `Patient case created for ${caseData.patientIdentifier}`,
      status: 'completed'
    });

    // Case updates
    if (caseData.updatedAt !== caseData.createdAt) {
      events.push({
        id: 'case_updated',
        date: new Date(caseData.updatedAt),
        type: 'updated',
        title: 'Case Updated',
        description: 'Case information was last updated',
        status: 'completed'
      });
    }

    // Treatment events
    caseData.selectedTreatments.forEach((treatment, index) => {
      events.push({
        id: `treatment_${index}`,
        date: new Date(caseData.createdAt), // Would need actual treatment dates
        type: 'treatment',
        title: `Treatment: ${treatment.name}`,
        description: treatment.details?.category || 'Procedure performed',
        status: 'completed', // Would need actual status tracking
        details: treatment
      });
    });

    // Prescription events
    caseData.calculatedDoses.forEach((dose, index) => {
      events.push({
        id: `prescription_${index}`,
        date: new Date(caseData.createdAt), // Would need actual prescription dates
        type: 'prescription',
        title: `Prescription: ${dose.drugName}`,
        description: `${dose.dosage} - ${dose.frequency} for ${dose.duration}`,
        status: 'completed',
        details: dose
      });
    });

    // Follow-up note events
    caseData.followUpNotes.forEach((note, index) => {
      events.push({
        id: `note_${index}`,
        date: new Date(note.createdAt),
        type: 'followup',
        title: `Follow-up Note by ${note.createdBy}`,
        description: note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''),
        status: 'completed',
        details: note
      });
    });

    // Sort by date (most recent first)
    events.sort((a, b) => b.date.getTime() - a.date.getTime());
    setTimeline(events);
  };

  const calculateProgress = async (caseData: Case) => {
    const totalTreatments = caseData.selectedTreatments.length;
    const completedTreatments = totalTreatments; // Simplified - would need status tracking
    const pendingTreatments = 0;
    
    const followUps = await followUpSystem.getFollowUpsForCase(caseData.id);
    const followUpsCompleted = followUps.filter(f => f.status === 'completed').length;
    const followUpsPending = followUps.filter(f => f.status === 'pending').length;
    
    const prescriptionsCount = caseData.calculatedDoses.length;
    const overallProgress = totalTreatments > 0 ? (completedTreatments / totalTreatments) * 100 : 0;

    setProgress({
      totalTreatments,
      completedTreatments,
      pendingTreatments,
      followUpsCompleted,
      followUpsPending,
      prescriptionsCount,
      overallProgress
    });
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !case_) return;

    try {
      const updatedCase = await caseService.addFollowUpNote(case_.id, newNote.trim());
      setCase_(updatedCase);
      
      // Add to timeline
      const timelineEvent: TimelineEvent = {
        id: `note_${Date.now()}`,
        date: new Date(),
        type: 'followup',
        title: `Follow-up Note by ${doctorProfile?.name || 'Doctor'}`,
        description: newNote.trim().substring(0, 100) + (newNote.trim().length > 100 ? '...' : ''),
        status: 'completed'
      };
      setTimeline(prev => [timelineEvent, ...prev]);
      
      setNewNote('');
      showSuccess('Follow-up note added successfully');
    } catch (error) {
      console.error('Failed to add note:', error);
      showError('Failed to add follow-up note');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created': return '📋';
      case 'updated': return '✏️';
      case 'treatment': return '🔧';
      case 'prescription': return '💊';
      case 'followup': return '📝';
      default: return '📄';
    }
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), 'MMM dd, yyyy HH:mm');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner text="Loading case details..." />
      </div>
    );
  }

  if (!case_) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-4">Case not found</div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Cases
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-lg p-6 text-white print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="mr-4 p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold mb-1">
                Case Details: {case_.patientIdentifier}
              </h1>
              <p className="text-green-100">
                Age {case_.patientAge}, {case_.patientWeight}kg • Created {formatDate(case_.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
            >
              🖨️ Print
            </button>
            <button
              onClick={() => onEdit(case_)}
              className="px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ✏️ Edit Case
            </button>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      {progress && (
        <CompactBox title="Progress Overview" defaultExpanded={true}>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{progress.totalTreatments}</div>
              <div className="text-sm text-gray-600">Total Treatments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{progress.completedTreatments}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{progress.pendingTreatments}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{progress.followUpsCompleted}</div>
              <div className="text-sm text-gray-600">Follow-ups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{progress.prescriptionsCount}</div>
              <div className="text-sm text-gray-600">Prescriptions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{Math.round(progress.overallProgress)}%</div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>Overall Progress</span>
              <span>{Math.round(progress.overallProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.overallProgress}%` }}
              ></div>
            </div>
          </div>
        </CompactBox>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 print:hidden">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📋' },
            { id: 'timeline', label: 'Timeline', icon: '📅' },
            { id: 'treatments', label: 'Treatments', icon: '🔧' },
            { id: 'notes', label: 'Notes', icon: '📝' },
            { id: 'analytics', label: 'Analytics', icon: '📊' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Patient Information */}
            <CompactBox title="Patient Information" defaultExpanded={true}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Demographics</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Patient ID:</span> {case_.patientIdentifier}</div>
                    <div><span className="font-medium">Age:</span> {case_.patientAge} years</div>
                    <div><span className="font-medium">Weight:</span> {case_.patientWeight} kg</div>
                    <div><span className="font-medium">Case Created:</span> {formatDate(case_.createdAt)}</div>
                    <div><span className="font-medium">Last Updated:</span> {formatDate(case_.updatedAt)}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Medical History</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium text-sm">Conditions:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {case_.conditions.length > 0 ? (
                          case_.conditions.map(condition => (
                            <span key={condition} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {condition}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500 text-sm">None reported</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-sm">Allergies:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {case_.allergies.length > 0 ? (
                          case_.allergies.map(allergy => (
                            <span key={allergy} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                              {allergy}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500 text-sm">None reported</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CompactBox>

            {/* Clinical Notes */}
            <CompactBox title="Clinical Notes" defaultExpanded={true}>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                  {case_.clinicalNotes}
                </pre>
              </div>
            </CompactBox>
          </div>
        )}

        {activeTab === 'timeline' && (
          <CompactBox title="Case Timeline" defaultExpanded={true}>
            <div className="space-y-4">
              {timeline.map((event, index) => (
                <div key={event.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                      {event.status && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                          {event.status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(event.date)}</p>
                  </div>
                </div>
              ))}
              
              {timeline.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No timeline events available
                </div>
              )}
            </div>
          </CompactBox>
        )}

        {activeTab === 'treatments' && (
          <div className="space-y-6">
            {/* Treatments */}
            <CompactBox title="Selected Treatments" defaultExpanded={true}>
              <div className="space-y-4">
                {case_.selectedTreatments.map((treatment, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{treatment.name}</h4>
                        <p className="text-sm text-gray-600">{treatment.details?.category || treatment.type}</p>
                        {treatment.details?.estimatedDuration && (
                          <p className="text-xs text-gray-500 mt-1">
                            Duration: {treatment.details.estimatedDuration}
                          </p>
                        )}
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    </div>
                  </div>
                ))}
                
                {case_.selectedTreatments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No treatments recorded
                  </div>
                )}
              </div>
            </CompactBox>

            {/* Prescriptions */}
            <CompactBox title="Prescriptions" defaultExpanded={false}>
              <div className="space-y-4">
                {case_.calculatedDoses.map((dose, index) => (
                  <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900">{dose.drugName}</h4>
                    <div className="text-sm text-blue-700 mt-1">
                      <div><span className="font-medium">Dosage:</span> {dose.dosage}</div>
                      <div><span className="font-medium">Frequency:</span> {dose.frequency}</div>
                      <div><span className="font-medium">Duration:</span> {dose.duration}</div>
                      {dose.clinicalNotes.length > 0 && (
                        <div><span className="font-medium">Notes:</span> {dose.clinicalNotes.join(', ')}</div>
                      )}
                    </div>
                  </div>
                ))}
                
                {case_.calculatedDoses.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No prescriptions recorded
                  </div>
                )}
              </div>
            </CompactBox>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-6">
            {/* Add New Note */}
            <CompactBox title="Add Follow-up Note" defaultExpanded={true}>
              <div className="space-y-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter follow-up note..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Note
                  </button>
                </div>
              </div>
            </CompactBox>

            {/* Notes History */}
            <CompactBox title="Notes History" defaultExpanded={true}>
              <div className="space-y-4">
                {case_.followUpNotes.map((note, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{note.createdBy}</span>
                      <span className="text-sm text-gray-500">{formatDate(note.createdAt)}</span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
                
                {case_.followUpNotes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No follow-up notes yet
                  </div>
                )}
              </div>
            </CompactBox>
          </div>
        )}

        {activeTab === 'analytics' && (
          <CompactBox title="Case Analytics" defaultExpanded={true}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Treatment Statistics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Treatments:</span>
                    <span className="font-medium">{case_.selectedTreatments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Prescriptions:</span>
                    <span className="font-medium">{case_.calculatedDoses.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Follow-up Notes:</span>
                    <span className="font-medium">{case_.followUpNotes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Case Duration:</span>
                    <span className="font-medium">
                      {Math.ceil((new Date().getTime() - new Date(case_.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Medical History Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Conditions:</span>
                    <span className="font-medium">{case_.conditions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Allergies:</span>
                    <span className="font-medium">{case_.allergies.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Patient Age Group:</span>
                    <span className="font-medium">
                      {case_.patientAge < 18 ? 'Pediatric' : case_.patientAge < 65 ? 'Adult' : 'Senior'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CompactBox>
        )}
      </div>
    </div>
  );
};

export default CaseDetailView;