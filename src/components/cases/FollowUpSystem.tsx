import React, { useState, useEffect } from 'react';
import { Case } from '../../types';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useToast } from '../shared/ToastContainer';
import { followUpSystem, FollowUpSchedule, FollowUpTemplate, FollowUpReminder } from '../../services/followUpSystem';

interface FollowUpSystemProps {
  case_: Case;
  doctorProfile: { name: string; email: string; specialization: string; licenseNumber: string } | null;
  onCaseUpdate: () => void;
}

interface FollowUpFormData {
  procedureType: string;
  templateId: string;
  scheduledDate: string;
  notes: string;
}

const FollowUpSystem: React.FC<FollowUpSystemProps> = ({
  case_,
  doctorProfile,
  onCaseUpdate
}) => {
  const [followUps, setFollowUps] = useState<FollowUpSchedule[]>([]);
  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);
  const [templates, setTemplates] = useState<FollowUpTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedules' | 'reminders' | 'templates'>('schedules');
  const [formData, setFormData] = useState<FollowUpFormData>({
    procedureType: '',
    templateId: '',
    scheduledDate: '',
    notes: ''
  });
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpSchedule | null>(null);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completionData, setCompletionData] = useState<Record<string, any>>({});
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadFollowUpData();
  }, [case_.id]);

  const loadFollowUpData = async () => {
    try {
      setIsLoading(true);
      await followUpSystem.initialize();

      const [caseFollowUps, activeReminders, allTemplates] = await Promise.all([
        followUpSystem.getFollowUpsForCase(case_.id),
        followUpSystem.getActiveReminders(),
        getAllTemplates()
      ]);

      setFollowUps(caseFollowUps);
      setReminders(activeReminders.filter(r => r.caseId === case_.id));
      setTemplates(allTemplates);
    } catch (error) {
      console.error('Failed to load follow-up data:', error);
      showError('Failed to load follow-up data');
    } finally {
      setIsLoading(false);
    }
  };

  const getAllTemplates = async (): Promise<FollowUpTemplate[]> => {
    // Get templates for each treatment type
    const allTemplates: FollowUpTemplate[] = [];
    for (const treatment of case_.selectedTreatments) {
      const treatmentTemplates = await followUpSystem.getTemplatesForProcedure(treatment.name);
      allTemplates.push(...treatmentTemplates);
    }
    return allTemplates;
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!doctorProfile || !formData.templateId || !formData.scheduledDate) {
      showError('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);

      const template = templates.find(t => t.id === formData.templateId);
      if (!template) {
        showError('Template not found');
        return;
      }

      // Create manual follow-up schedule
      const newSchedule: FollowUpSchedule = {
        id: `manual_${Date.now()}`,
        caseId: case_.id,
        procedureType: formData.procedureType,
        scheduledDate: new Date(formData.scheduledDate),
        followUpType: 'manual',
        priority: 'medium',
        template: {
          ...template,
          id: formData.templateId,
          name: `${template.name} (Manual)`,
          timeFromProcedure: Math.ceil((new Date(formData.scheduledDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        },
        status: 'pending',
        notes: formData.notes
      };

      // Add to follow-ups
      const updatedFollowUps = [...followUps, newSchedule];
      setFollowUps(updatedFollowUps);

      // Create reminder
      const reminder: FollowUpReminder = {
        id: `reminder_${newSchedule.id}`,
        followUpId: newSchedule.id,
        caseId: case_.id,
        patientName: `Patient ${case_.patientIdentifier}`,
        procedureType: newSchedule.procedureType,
        dueDate: newSchedule.scheduledDate,
        priority: newSchedule.priority,
        message: `Manual follow-up scheduled for ${newSchedule.procedureType}`,
        status: 'active'
      };

      setReminders(prev => [...prev, reminder]);

      setShowScheduleForm(false);
      setFormData({
        procedureType: '',
        templateId: '',
        scheduledDate: '',
        notes: ''
      });
      
      showSuccess('Follow-up scheduled successfully');
    } catch (error) {
      console.error('Failed to schedule follow-up:', error);
      showError('Failed to schedule follow-up');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFollowUp || !doctorProfile) return;

    try {
      setIsLoading(true);

      // Add completion note to case
      const completionNote = `Follow-up completed: ${selectedFollowUp.procedureType}\n` +
        `Date: ${new Date().toLocaleDateString()}\n` +
        `Notes: ${completionData.notes || 'No additional notes'}\n` +
        `Template: ${selectedFollowUp.template.name}`;

      // Update follow-up status locally
      const updatedFollowUps = followUps.map(f => 
        f.id === selectedFollowUp.id 
          ? { ...f, status: 'completed' as const, completedAt: new Date(), completedBy: doctorProfile.name }
          : f
      );
      setFollowUps(updatedFollowUps);

      // Remove reminder
      setReminders(prev => prev.filter(r => r.followUpId !== selectedFollowUp.id));

      setShowCompleteForm(false);
      setSelectedFollowUp(null);
      setCompletionData({});
      
      showSuccess('Follow-up marked as completed');
      onCaseUpdate(); // Refresh parent component
    } catch (error) {
      console.error('Failed to complete follow-up:', error);
      showError('Failed to complete follow-up');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismissReminder = async (reminderId: string) => {
    try {
      const success = await followUpSystem.dismissReminder(reminderId);
      if (success) {
        setReminders(prev => prev.filter(r => r.id !== reminderId));
        showSuccess('Reminder dismissed');
      } else {
        showError('Failed to dismiss reminder');
      }
    } catch (error) {
      console.error('Failed to dismiss reminder:', error);
      showError('Failed to dismiss reminder');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (date: Date) => {
    return new Date(date) < new Date() && new Date(date).toDateString() !== new Date().toDateString();
  };

  const pendingFollowUps = followUps.filter(f => f.status === 'pending');
  const completedFollowUps = followUps.filter(f => f.status === 'completed');
  const overdueFollowUps = followUps.filter(f => f.status === 'pending' && isOverdue(f.scheduledDate));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Follow-up Management</h3>
            <p className="text-purple-100 text-sm">
              {pendingFollowUps.length} pending • {overdueFollowUps.length} overdue • {completedFollowUps.length} completed
            </p>
          </div>
          <button
            onClick={() => setShowScheduleForm(true)}
            className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
          >
            + Schedule Follow-up
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <CompactBox title="Follow-up Overview" defaultExpanded={true}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{pendingFollowUps.length}</div>
            <div className="text-sm text-yellow-800">Pending</div>
          </div>
          <div className="text-center p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{overdueFollowUps.length}</div>
            <div className="text-sm text-red-800">Overdue</div>
          </div>
          <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{completedFollowUps.length}</div>
            <div className="text-sm text-green-800">Completed</div>
          </div>
          <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{reminders.length}</div>
            <div className="text-sm text-blue-800">Active Reminders</div>
          </div>
        </div>
      </CompactBox>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'schedules', label: 'Follow-ups', icon: '📅', count: followUps.length },
            { id: 'reminders', label: 'Reminders', icon: '🔔', count: reminders.length },
            { id: 'templates', label: 'Templates', icon: '📋', count: templates.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon} {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'schedules' && (
          <div className="space-y-4">
            {followUps.length > 0 ? (
              followUps.map(followUp => (
                <div key={followUp.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-gray-900">{followUp.procedureType}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(followUp.status)}`}>
                          {followUp.status}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(followUp.priority)}`}>
                          {followUp.priority} priority
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        Template: {followUp.template.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Scheduled: {formatDate(followUp.scheduledDate)}
                      </p>
                      {followUp.notes && (
                        <p className="text-sm text-gray-600 mt-2">
                          Notes: {followUp.notes}
                        </p>
                      )}
                      {followUp.completedAt && (
                        <p className="text-sm text-green-600 mt-2">
                          Completed by {followUp.completedBy} on {formatDate(followUp.completedAt)}
                        </p>
                      )}
                    </div>
                    {followUp.status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedFollowUp(followUp);
                          setShowCompleteForm(true);
                        }}
                        className="ml-4 px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No follow-ups scheduled yet
              </div>
            )}
          </div>
        )}

        {activeTab === 'reminders' && (
          <div className="space-y-4">
            {reminders.length > 0 ? (
              reminders.map(reminder => (
                <div key={reminder.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-orange-900">{reminder.procedureType}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(reminder.priority)}`}>
                          {reminder.priority}
                        </span>
                      </div>
                      <p className="text-sm text-orange-700 mb-1">{reminder.message}</p>
                      <p className="text-sm text-orange-600">
                        Due: {formatDate(reminder.dueDate)}
                      </p>
                      <p className="text-sm text-orange-600">
                        Patient: {reminder.patientName}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDismissReminder(reminder.id)}
                      className="ml-4 px-3 py-1 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No active reminders
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-4">
            {templates.length > 0 ? (
              templates.map(template => (
                <div key={template.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900">{template.name}</h4>
                      <p className="text-sm text-blue-700 mb-1">
                        Procedure: {template.procedureType}
                      </p>
                      <p className="text-sm text-blue-600">
                        Follow-up: {template.timeFromProcedure} days after procedure
                      </p>
                      <p className="text-sm text-blue-600 mt-1">
                        {template.clinicalNotes}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No templates available
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule Follow-up Modal */}
      {showScheduleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Follow-up</h3>
            <form onSubmit={handleScheduleFollowUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Procedure Type *
                </label>
                <input
                  type="text"
                  required
                  value={formData.procedureType}
                  onChange={(e) => setFormData(prev => ({ ...prev, procedureType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Root Canal, Extraction"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template
                </label>
                <select
                  value={formData.templateId}
                  onChange={(e) => setFormData(prev => ({ ...prev, templateId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a template (optional)</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.timeFromProcedure} days)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Date *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Additional notes for this follow-up"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowScheduleForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {isLoading ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Follow-up Modal */}
      {showCompleteForm && selectedFollowUp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Complete Follow-up: {selectedFollowUp.procedureType}
            </h3>
            <form onSubmit={handleCompleteFollowUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Completion Notes *
                </label>
                <textarea
                  required
                  value={completionData.notes || ''}
                  onChange={(e) => setCompletionData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Describe the follow-up results and any observations"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompleteForm(false);
                    setSelectedFollowUp(null);
                    setCompletionData({});
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? 'Completing...' : 'Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowUpSystem;