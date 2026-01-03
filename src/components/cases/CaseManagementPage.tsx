import React, { useState, useEffect } from 'react';
import { Case } from '../../types';
import CompactBox from '../shared/CompactBox';
import LoadingSpinner from '../shared/LoadingSpinner';
import Modal from '../shared/Modal';
import NavigationButtons from '../shared/NavigationButtons';
import { useToast } from '../shared/ToastContainer';
import { caseService } from '../../services/caseService';
import { followUpSystem } from '../../services/followUpSystem';
import { procedureDataService } from '../../services/procedureDataService';
import PatientCaseForm from './PatientCaseForm';
import CaseDetailView from './CaseDetailView';
import FollowUpSystem from './FollowUpSystem';
import CaseAnalytics from './CaseAnalytics';
import DataExportService from './DataExportService';

interface CaseManagementPageProps {
  doctorProfile: { name: string; email: string; specialization: string; licenseNumber: string } | null;
  onNavigate?: (page: string, data?: any) => void;
}

interface FilterOptions {
  searchTerm: string;
  caseType: string;
  status: string;
  dateRange: {
    start: string;
    end: string;
  };
  conditions: string[];
  priorities: string[];
}

interface CaseStats {
  totalCases: number;
  activeCases: number;
  completedCases: number;
  pendingFollowUps: number;
  overdueCases: number;
  totalTreatments: number;
  averageCaseDuration: number;
}

const CaseManagementPage: React.FC<CaseManagementPageProps> = ({ doctorProfile, onNavigate }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [caseStats, setCaseStats] = useState<CaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'cases' | 'analytics' | 'export' | 'detail'>('overview');
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [viewingCase, setViewingCase] = useState<Case | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [bulkActions, setBulkActions] = useState<string[]>([]);
  const { showSuccess, showError } = useToast();

  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    caseType: '',
    status: '',
    dateRange: {
      start: '',
      end: ''
    },
    conditions: [],
    priorities: []
  });

  const caseTypes = ['routine', 'urgent', 'emergency'];
  const caseStatuses = ['active', 'completed', 'pending', 'overdue'];
  const priorities = ['low', 'medium', 'high'];

  useEffect(() => {
    if (doctorProfile) {
      loadCases();
      loadFollowUpSystem();
    }
  }, [doctorProfile]);

  useEffect(() => {
    applyFilters();
  }, [cases, filters]);

  const loadCases = async () => {
    try {
      setIsLoading(true);
      const casesData = await caseService.getCases();
      setCases(casesData);
      calculateStats(casesData);
    } catch (error) {
      console.error('Failed to load cases:', error);
      showError('Failed to load cases');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFollowUpSystem = async () => {
    try {
      await followUpSystem.initialize();
    } catch (error) {
      console.error('Failed to initialize follow-up system:', error);
    }
  };

  const calculateStats = (casesData: Case[]) => {
    const now = new Date();
    const totalCases = casesData.length;
    const activeCases = casesData.filter(c => {
      const daysSinceCreated = Math.floor((now.getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceCreated <= 30; // Active within last 30 days
    }).length;
    const completedCases = casesData.filter(c => c.followUpNotes.length > 0).length;
    
    // This would need integration with follow-up system
    const pendingFollowUps = 0; // Placeholder
    const overdueCases = 0; // Placeholder
    
    const totalTreatments = casesData.reduce((sum, c) => sum + c.selectedTreatments.length, 0);
    const averageCaseDuration = casesData.length > 0 
      ? casesData.reduce((sum, c) => {
          const duration = (now.getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          return sum + duration;
        }, 0) / casesData.length 
      : 0;

    setCaseStats({
      totalCases,
      activeCases,
      completedCases,
      pendingFollowUps,
      overdueCases,
      totalTreatments,
      averageCaseDuration
    });
  };

  const applyFilters = () => {
    let filtered = [...cases];

    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(case_ =>
        case_.patientIdentifier.toLowerCase().includes(searchLower) ||
        case_.clinicalNotes.toLowerCase().includes(searchLower) ||
        case_.conditions.some(condition => condition.toLowerCase().includes(searchLower))
      );
    }

    // Case type filter
    if (filters.caseType) {
      filtered = filtered.filter(case_ =>
        case_.selectedTreatments.some(t => t.details?.caseType === filters.caseType)
      );
    }

    // Status filter (derived from case data)
    if (filters.status) {
      filtered = filtered.filter(case_ => {
        const daysSinceCreated = Math.floor((new Date().getTime() - new Date(case_.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        switch (filters.status) {
          case 'active': return daysSinceCreated <= 30;
          case 'completed': return case_.followUpNotes.length > 0;
          case 'pending': return daysSinceCreated > 7 && case_.followUpNotes.length === 0;
          case 'overdue': return daysSinceCreated > 30;
          default: return true;
        }
      });
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter(case_ => {
        const caseDate = new Date(case_.createdAt);
        const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
        const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;
        
        if (startDate && caseDate < startDate) return false;
        if (endDate && caseDate > endDate) return false;
        return true;
      });
    }

    // Conditions filter
    if (filters.conditions.length > 0) {
      filtered = filtered.filter(case_ =>
        filters.conditions.some(condition => case_.conditions.includes(condition))
      );
    }

    setFilteredCases(filtered);
  };

  const handleCreateCase = async (caseData: Partial<Case>) => {
    try {
      if (editingCase) {
        await caseService.updateCase(editingCase.id, caseData);
        showSuccess('Case updated successfully');
      } else {
        await caseService.saveCase(caseData as Omit<Case, 'id' | 'createdAt' | 'updatedAt'>);
        showSuccess('Case created successfully');
      }
      
      setShowCaseForm(false);
      setEditingCase(null);
      await loadCases();
    } catch (error) {
      console.error('Failed to save case:', error);
      showError('Failed to save case');
    }
  };

  const handleCaseUpdate = () => {
    loadCases();
  };

  const handleBulkAction = async (action: string) => {
    if (bulkActions.length === 0) {
      showError('Please select cases to perform bulk action');
      return;
    }

    try {
      switch (action) {
        case 'export':
          setShowExport(true);
          break;
        case 'archive':
          // Archive selected cases
          showSuccess(`${bulkActions.length} cases archived`);
          setBulkActions([]);
          break;
        case 'delete':
          // Delete selected cases
          for (const caseId of bulkActions) {
            await caseService.deleteCase(caseId);
          }
          showSuccess(`${bulkActions.length} cases deleted`);
          setBulkActions([]);
          await loadCases();
          break;
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      showError('Bulk action failed');
    }
  };

  const handlePrintCase = (case_: Case) => {
    // Open print-friendly view
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Case Report - ${case_.patientIdentifier}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
              .section { margin-bottom: 20px; }
              .section h3 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
              .field { margin-bottom: 8px; }
              .label { font-weight: bold; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Dental Case Report</h1>
              <p>Patient: ${case_.patientIdentifier} | Case ID: ${case_.id}</p>
              <p>Generated: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="grid">
              <div class="section">
                <h3>Patient Information</h3>
                <div class="field"><span class="label">Age:</span> ${case_.patientAge} years</div>
                <div class="field"><span class="label">Weight:</span> ${case_.patientWeight} kg</div>
                <div class="field"><span class="label">Created:</span> ${new Date(case_.createdAt).toLocaleDateString()}</div>
                <div class="field"><span class="label">Updated:</span> ${new Date(case_.updatedAt).toLocaleDateString()}</div>
              </div>
              
              <div class="section">
                <h3>Medical History</h3>
                <div class="field"><span class="label">Conditions:</span> ${case_.conditions.join(', ') || 'None'}</div>
                <div class="field"><span class="label">Allergies:</span> ${case_.allergies.join(', ') || 'None'}</div>
              </div>
            </div>
            
            <div class="section">
              <h3>Clinical Notes</h3>
              <div class="field">${case_.clinicalNotes.replace(/\n/g, '<br>')}</div>
            </div>
            
            <div class="section">
              <h3>Treatments (${case_.selectedTreatments.length})</h3>
              ${case_.selectedTreatments.map((treatment, index) => `
                <div class="field">${index + 1}. ${treatment.name} (${treatment.type})</div>
              `).join('')}
            </div>
            
            ${case_.calculatedDoses.length > 0 ? `
            <div class="section">
              <h3>Prescriptions (${case_.calculatedDoses.length})</h3>
              ${case_.calculatedDoses.map((dose, index) => `
                <div class="field">${index + 1}. ${dose.drugName}: ${dose.dosage}, ${dose.frequency}</div>
              `).join('')}
            </div>
            ` : ''}
            
            ${case_.followUpNotes.length > 0 ? `
            <div class="section">
              <h3>Follow-up Notes (${case_.followUpNotes.length})</h3>
              ${case_.followUpNotes.map((note, index) => `
                <div class="field">
                  <strong>${note.createdBy}</strong> - ${new Date(note.createdAt).toLocaleDateString()}<br>
                  ${note.content}
                </div>
              `).join('')}
            </div>
            ` : ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getStatusColor = (case_: Case) => {
    const daysSinceCreated = Math.floor((new Date().getTime() - new Date(case_.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (case_.followUpNotes.length > 0) return 'bg-green-100 text-green-800';
    if (daysSinceCreated <= 7) return 'bg-blue-100 text-blue-800';
    if (daysSinceCreated <= 30) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (case_: Case) => {
    const daysSinceCreated = Math.floor((new Date().getTime() - new Date(case_.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (case_.followUpNotes.length > 0) return 'Completed';
    if (daysSinceCreated <= 7) return 'Recent';
    if (daysSinceCreated <= 30) return 'Active';
    return 'Older';
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCaseSelect = (case_: Case) => {
    setViewingCase(case_);
    setActiveTab('detail');
  };

  const handleEditCase = (case_: Case) => {
    setEditingCase(case_);
    setShowCaseForm(true);
    setActiveTab('overview');
  };

  const renderCaseForm = () => (
    <PatientCaseForm
      doctorProfile={doctorProfile}
      existingCase={editingCase}
      onSave={handleCreateCase}
      onCancel={() => {
        setShowCaseForm(false);
        setEditingCase(null);
      }}
      isEditing={!!editingCase}
    />
  );

  const renderCaseDetail = () => (
    viewingCase && (
      <CaseDetailView
        caseId={viewingCase.id}
        doctorProfile={doctorProfile}
        onEdit={handleEditCase}
        onBack={() => {
          setViewingCase(null);
          setActiveTab('cases');
        }}
      />
    )
  );

  const renderAnalytics = () => (
    <CaseAnalytics
      doctorProfile={doctorProfile}
      onNavigate={onNavigate}
    />
  );

  const renderExportService = () => (
    <DataExportService
      doctorProfile={doctorProfile}
      onClose={() => setShowExport(false)}
    />
  );

  const renderCasesOverview = () => (
    <div className="space-y-6">
      {/* Filters */}
      <CompactBox title="Search & Filter Cases" defaultExpanded={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              placeholder="Patient ID, conditions, notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
            <select
              value={filters.caseType}
              onChange={(e) => setFilters(prev => ({ ...prev, caseType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Types</option>
              {caseTypes.map(type => (
                <option key={type} value={type} className="capitalize">{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              {caseStatuses.map(status => (
                <option key={status} value={status} className="capitalize">{status}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: e.target.value }
                }))}
                className="flex-1 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, end: e.target.value }
                }))}
                className="flex-1 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>
        </div>
      </CompactBox>

      {/* Cases List */}
      <CompactBox title={`Patient Cases (${filteredCases.length})`} defaultExpanded={true}>
        {isLoading ? (
          <LoadingSpinner text="Loading cases..." />
        ) : filteredCases.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">No cases found</div>
            <button
              onClick={() => setShowCaseForm(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Create First Case
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCases.map((case_) => (
              <div
                key={case_.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={bulkActions.includes(case_.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkActions(prev => [...prev, case_.id]);
                        } else {
                          setBulkActions(prev => prev.filter(id => id !== case_.id));
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div
                      onClick={() => handleCaseSelect(case_)}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center mb-2">
                        <h4 className="font-medium text-gray-900 mr-3">
                          {case_.patientIdentifier}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(case_)}`}>
                          {getStatusText(case_)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Demographics:</span> Age {case_.patientAge}, {case_.patientWeight}kg
                        </div>
                        <div>
                          <span className="font-medium">Treatments:</span> {case_.selectedTreatments.length} procedures
                        </div>
                        <div>
                          <span className="font-medium">Follow-ups:</span> {case_.followUpNotes.length} notes
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {formatDate(case_.createdAt)}
                        </div>
                      </div>
                      {case_.conditions.length > 0 && (
                        <div className="mt-2">
                          <span className="font-medium text-sm text-gray-700">Conditions: </span>
                          {case_.conditions.slice(0, 3).join(', ')}
                          {case_.conditions.length > 3 && '...'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePrintCase(case_)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      title="Print Case Report"
                    >
                      🖨️
                    </button>
                    <button
                      onClick={() => handleEditCase(case_)}
                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      title="Edit Case"
                    >
                      ✏️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CompactBox>

      {/* Bulk Actions */}
      {bulkActions.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{bulkActions.length} cases selected</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkAction(e.target.value);
                  e.target.value = '';
                }
              }}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="">Bulk Actions</option>
              <option value="export">Export Selected</option>
              <option value="archive">Archive</option>
              <option value="delete">Delete</option>
            </select>
            <button
              onClick={() => setBulkActions([])}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );

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
            title="Case Management"
            icon="👥"
            variant="primary"
            className="mb-0"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-primary-800 mb-2">Case Management</h1>
                    <p className="text-primary-600 text-sm md:text-base">Comprehensive patient case tracking and follow-up management</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => setShowExport(true)}
                    className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium"
                  >
                    <span className="text-lg">📊</span>
                    <span>Export</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingCase(null);
                      setShowCaseForm(true);
                    }}
                    className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-xl hover:from-success-600 hover:to-success-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium"
                  >
                    <span className="text-lg">➕</span>
                    <span>New Case</span>
                  </button>
                </div>
              </div>
            </div>
          </CompactBox>

          {/* Statistics Cards */}
          {caseStats && (
            <CompactBox 
              title="Case Statistics" 
              icon="📈"
              variant="default"
              defaultExpanded={true}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-xl p-6 text-center hover:shadow-md transition-all duration-200">
                  <div className="text-3xl font-bold text-primary-600 mb-2">{caseStats.totalCases}</div>
                  <div className="text-primary-800 text-sm font-medium">Total Cases</div>
                </div>
                <div className="bg-gradient-to-br from-success-50 to-success-100 border border-success-200 rounded-xl p-6 text-center hover:shadow-md transition-all duration-200">
                  <div className="text-3xl font-bold text-success-600 mb-2">{caseStats.activeCases}</div>
                  <div className="text-success-800 text-sm font-medium">Active Cases</div>
                </div>
                <div className="bg-gradient-to-br from-accent-50 to-accent-100 border border-accent-200 rounded-xl p-6 text-center hover:shadow-md transition-all duration-200">
                  <div className="text-3xl font-bold text-accent-600 mb-2">{caseStats.completedCases}</div>
                  <div className="text-accent-800 text-sm font-medium">Completed</div>
                </div>
                <div className="bg-gradient-to-br from-warning-50 to-warning-100 border border-warning-200 rounded-xl p-6 text-center hover:shadow-md transition-all duration-200">
                  <div className="text-3xl font-bold text-warning-600 mb-2">{caseStats.pendingFollowUps}</div>
                  <div className="text-warning-800 text-sm font-medium">Follow-ups</div>
                </div>
                <div className="bg-gradient-to-br from-error-50 to-error-100 border border-error-200 rounded-xl p-6 text-center hover:shadow-md transition-all duration-200">
                  <div className="text-3xl font-bold text-error-600 mb-2">{caseStats.overdueCases}</div>
                  <div className="text-error-800 text-sm font-medium">Overdue</div>
                </div>
                <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 border border-secondary-200 rounded-xl p-6 text-center hover:shadow-md transition-all duration-200">
                  <div className="text-3xl font-bold text-secondary-600 mb-2">{caseStats.totalTreatments}</div>
                  <div className="text-secondary-800 text-sm font-medium">Treatments</div>
                </div>
              </div>
            </CompactBox>
          )}

          {/* Tab Navigation */}
          <CompactBox title="Navigation" defaultExpanded={true} className="mb-0">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'overview', label: 'Cases Overview', icon: '📋', variant: 'default' },
                { id: 'analytics', label: 'Analytics', icon: '📊', variant: 'primary' },
                { id: 'detail', label: 'Case Detail', icon: '📄', variant: 'accent', disabled: !viewingCase }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  disabled={tab.disabled}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700 shadow-md transform scale-105'
                      : tab.disabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800 hover:shadow-sm'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </CompactBox>

          {/* Tab Content */}
          <div className="min-h-[600px]">
            {activeTab === 'overview' && renderCasesOverview()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'detail' && renderCaseDetail()}
          </div>

          {/* Case Form Modal */}
          {showCaseForm && (
            <Modal
              isOpen={showCaseForm}
              onClose={() => {
                setShowCaseForm(false);
                setEditingCase(null);
              }}
              title={editingCase ? 'Edit Case' : 'New Case'}
              size="xl"
            >
              {renderCaseForm()}
            </Modal>
          )}

          {/* Export Service Modal */}
          {showExport && (
            <Modal
              isOpen={showExport}
              onClose={() => setShowExport(false)}
              title="Data Export Service"
              size="xl"
            >
              {renderExportService()}
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseManagementPage;